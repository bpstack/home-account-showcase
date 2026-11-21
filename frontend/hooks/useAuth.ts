import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { auth, accounts, ApiError } from '@/lib/apiClient'
import {
  useAuthStore,
  AUTH_QUERY_KEYS,
  User,
  getLastAccountId,
  clearLastAccountId,
} from '@/stores/authStore'
import { toast } from 'sonner'
import { useCryptoStore } from '@/stores/cryptoStore'
import {
  verifyUserKey,
  generateVerificationBlob,
  deriveUserKeyExtractable,
  importUserKey,
} from '@/lib/crypto'
import { saveUserKey } from '@/lib/keyVault'
import { isPinFormat, migrateToPinV2, PinFormatError, unlockUserKeyWithPin } from '@/lib/pinV2'

/**
 * Thrown by login() when a user on the old PIN scheme (v1) has a separate encryption PIN.
 * The login page catches this and shows a PIN input step instead of redirecting to /unlock.
 */
export class PinRequiredError extends Error {
  readonly redirectTo: string

  constructor(redirectTo: string) {
    super('PIN requerido para descifrar')
    this.name = 'PinRequiredError'
    this.redirectTo = redirectTo
  }
}

interface Account {
  id: string
  name: string
  created_at: string
  role: string
}

export function useAuth() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const isLoggingIn = useAuthStore((s) => s.isLoggingIn)
  const isRegistering = useAuthStore((s) => s.isRegistering)
  const isLoggingOut = useAuthStore((s) => s.isLoggingOut)
  const authError = useAuthStore((s) => s.authError)
  const clearError = useAuthStore((s) => s.clearError)
  const selectedAccountId = useAuthStore((s) => s.selectedAccountId)
  const isSwitchingAccount = useAuthStore((s) => s.isSwitchingAccount)
  const setSwitchingAccount = useAuthStore((s) => s.setSwitchingAccount)

  const setSelectedAccountId = useAuthStore((s) => s.setSelectedAccountId)

  // Query para obtener el usuario autenticado
  // Las cookies se envían automáticamente con credentials: 'include'
  const userQuery = useQuery({
    queryKey: AUTH_QUERY_KEYS.user,
    queryFn: async () => {
      try {
        // El apiClient maneja el refresh automático si el accessToken expiró
        const { user } = await auth.me()
        return user
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          // Sesión expirada - las cookies ya fueron limpiadas por el servidor
          return null
        }
        return null
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  })

  const accountsQuery = useQuery({
    queryKey: AUTH_QUERY_KEYS.accounts,
    queryFn: async () => {
      const { accounts: userAccounts } = await accounts.getAll()
      return userAccounts as Account[]
    },
    staleTime: 0,
    gcTime: 10 * 60 * 1000,
    retry: false,
    enabled: !!userQuery.data,
  })

  const account =
    accountsQuery.data?.find((a) => a.id === selectedAccountId) ||
    (accountsQuery.data && accountsQuery.data.length > 0 ? accountsQuery.data[0] : null)

  // NOTE: Redirect to /unlock when crypto is locked is handled exclusively
  // by the PrivateLayout useEffect (app/(private)/layout.tsx).
  // Do NOT add redirect logic here — it causes race conditions because
  // useAuth() runs in many components and getState() is not reactive.

  const switchAccount = async (accountId: string) => {
    const newAccount = accountsQuery.data?.find((a) => a.id === accountId)
    if (newAccount) {
      setSwitchingAccount(true)
      const toastId = toast.loading(`Cambiando a ${newAccount.name}...`)

      try {
        // 1. Establecer cookie via API Route (server-side, sin race condition)
        await fetch('/api/accounts/set-active', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId }),
        })

        // 2. Sincronizar estado local (localStorage + Zustand)
        setSelectedAccountId(accountId)

        // 3. Actualizar React Query cache
        queryClient.setQueryData(AUTH_QUERY_KEYS.account, newAccount)

        // 4. Invalidar queries que dependen de la cuenta
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['transactions'] }),
          queryClient.invalidateQueries({ queryKey: ['categories'] }),
        ])

        // 5. Refresh Server Components (ahora la cookie ya está en el servidor)
        router.refresh()

        toast.success(`Ahora estás en ${newAccount.name}`, { id: toastId })
      } catch (error) {
        toast.error('Error al cambiar de cuenta', { id: toastId })
        console.error(error)
      } finally {
        setSwitchingAccount(false)
      }
    }
  }

  const login = async (email: string, password: string, redirectTo?: string) => {
    useAuthStore.getState().setLoggingIn(true)
    useAuthStore.getState().setAuthError(null)

    try {
      // El servidor establece las cookies httpOnly automáticamente
      const { user, key_salt, verification_blob, encrypted_keys, pin_v2 } = await auth.login(
        email,
        password
      )

      queryClient.setQueryData(AUTH_QUERY_KEYS.user, user)

      // Load accounts early — needed regardless of crypto outcome
      const { accounts: userAccounts } = await accounts.getAll()
      queryClient.setQueryData(AUTH_QUERY_KEYS.accounts, userAccounts)

      const lastAccountId = getLastAccountId()
      const savedAccount = userAccounts.find((a: Account) => a.id === lastAccountId)
      const activeAccount = savedAccount || (userAccounts.length > 0 ? userAccounts[0] : null)
      queryClient.setQueryData(AUTH_QUERY_KEYS.account, activeAccount)
      if (activeAccount) setSelectedAccountId(activeAccount.id)

      // 🔐 ENCRYPTION
      if (pin_v2) {
        // PIN v2: the login password never opens the data. The PIN goes through the server, on
        // /unlock, where the PrivateLayout sends a locked user.
        useAuthStore.getState().setHasSeparatePin(true)
      } else if (key_salt && encrypted_keys && encrypted_keys.length > 0) {
        // v1: try to unlock with the login password
        const cryptoStore = useCryptoStore.getState()

        try {
          await cryptoStore.deriveAndSetUserKey(password, key_salt)

          if (verification_blob) {
            const userKey = useCryptoStore.getState().userKey
            if (userKey) {
              const isValid = await verifyUserKey(verification_blob, userKey)
              if (!isValid) {
                // Password ≠ PIN → throw so login page shows PIN step
                cryptoStore.lock()
                useAuthStore.getState().setHasSeparatePin(true)
                throw new PinRequiredError(redirectTo || '/dashboard')
              } else {
                // Password IS the encryption source → no separate PIN
                useAuthStore.getState().setHasSeparatePin(false)
                await cryptoStore.unlockAccounts(
                  encrypted_keys.map((k) => ({
                    accountId: k.account_id,
                    encryptedKey: k.encrypted_key,
                    keyVersion: k.key_version,
                  }))
                )
              }
            }
          } else {
            // No verification blob (legacy user) → try to unlock directly
            await cryptoStore.unlockAccounts(
              encrypted_keys.map((k) => ({
                accountId: k.account_id,
                encryptedKey: k.encrypted_key,
                keyVersion: k.key_version,
              }))
            )
          }
        } catch (cryptoErr) {
          if (cryptoErr instanceof PinRequiredError) throw cryptoErr
          // Other crypto errors → leave locked, layout handles redirect
          useCryptoStore.getState().lock()
        }
      } else if (key_salt) {
        // No encrypted keys → complete-crypto-setup failed during registration.
        // The user already has accounts — do NOT redirect to /setup-pin (it creates
        // a new account). Instead, re-run the setup inline now that we're authenticated.
        try {
          const cryptoStore = useCryptoStore.getState()
          await cryptoStore.deriveAndSetUserKey(password, key_salt)
          const userKey = useCryptoStore.getState().userKey
          if (userKey) {
            for (const acct of userAccounts) {
              const encryptedKey = await cryptoStore.createAccountKey(acct.id)
              await accounts.saveAccountKey(acct.id, encryptedKey)
            }
            const verificationBlob = await generateVerificationBlob(userKey)
            await auth.saveVerificationBlob(verificationBlob)
            cryptoStore.forceUnlockAfterSetup()
          }
        } catch {
          useCryptoStore.getState().lock()
          // Leave locked — PrivateLayout will redirect to /unlock
        }
      }

      router.replace(redirectTo || '/dashboard')
    } catch (error) {
      if (error instanceof PinRequiredError) throw error // propagate to login page
      const message = error instanceof ApiError ? error.message : 'Error al iniciar sesión'
      useAuthStore.getState().setAuthError(message)
      throw error
    } finally {
      useAuthStore.getState().setLoggingIn(false)
    }
  }

  /**
   * The single entry point to unlock the data with the PIN (docs/PIN-plan.md §6.5).
   * - PIN v2: the server checks the PIN, counts the attempt and releases the wrapped UserKey.
   *   Throws PinError (from apiClient) on a wrong or locked PIN.
   * - v1 (not migrated yet): the UserKey is derived from the PIN, or from the login password for
   *   users without a separate PIN, and checked locally against the verification blob.
   */
  const unlockWithPin = async (pin: string) => {
    const cryptoStore = useCryptoStore.getState()
    const { key_salt, verification_blob, encrypted_keys, pin_v2 } = await auth.getKeys()

    if (!key_salt) throw new Error('No encryption keys found')

    let userKey: CryptoKey
    let keysToUnlock = encrypted_keys
    let onV2 = pin_v2
    // v1 only: the raw UserKey, kept until the migration wraps it
    let v1Raw: Uint8Array | null = null

    try {
      if (pin_v2) {
        // The login password never opens a v2 user's data: don't spend a server attempt on it
        if (!isPinFormat(pin)) throw new PinFormatError()
        const unlocked = await unlockUserKeyWithPin(pin, key_salt)
        unlocked.raw.fill(0)
        userKey = unlocked.userKey
        keysToUnlock = unlocked.encryptedKeys
        cryptoStore.setUserKey(userKey)
      } else {
        if (!encrypted_keys || encrypted_keys.length === 0) {
          throw new Error('No encryption keys found')
        }
        // One Argon2id gives both the key for this unlock and the raw bytes the migration wraps
        v1Raw = (await deriveUserKeyExtractable(pin, key_salt)).raw
        const derived = await importUserKey(v1Raw)
        if (verification_blob && !(await verifyUserKey(verification_blob, derived))) {
          throw new Error('Wrong password')
        }
        cryptoStore.setUserKey(derived)
        userKey = derived
      }

      // Throws 'Wrong password' if any account key does not open with this UserKey
      await cryptoStore.unlockAccounts(
        (keysToUnlock || []).map((k) => ({
          accountId: k.account_id,
          encryptedKey: k.encrypted_key,
          keyVersion: k.key_version,
        }))
      )

      // Migration v1 → v2 (§6.6), only with a key proven above (by the verification blob or by
      // the account keys; wrapping a wrong key would lock the user out) and only when the secret
      // is the PIN: users whose encryption comes from the login password get their PIN, already
      // v2, on /setup-pin. A legacy user without a verification blob gets one now.
      if (v1Raw && isPinFormat(pin) && useAuthStore.getState().hasSeparatePin) {
        const newVerificationBlob = verification_blob
          ? undefined
          : await generateVerificationBlob(userKey)
        onV2 = await migrateToPinV2(pin, v1Raw, newVerificationBlob)
      }
    } finally {
      v1Raw?.fill(0)
    }

    // Save the key in the device vault (IndexedDB) so the user doesn't need to enter PIN on reload
    const user = userQuery.data
    if (user) {
      await saveUserKey(user.id, userKey)
    }

    if (onV2) useAuthStore.getState().setHasSeparatePin(true)
  }

  /**
   * Called from the login page PIN step after login() throws PinRequiredError.
   * Unlocks crypto with the user's PIN and navigates to the destination.
   */
  const unlockAfterLogin = async (pin: string, redirectTo: string) => {
    try {
      await unlockWithPin(pin)
    } catch (error) {
      if (error instanceof Error && error.message === 'Wrong password') {
        throw new Error('PIN incorrecto')
      }
      throw error
    }
    useAuthStore.getState().setHasSeparatePin(true)
    router.replace(redirectTo)
  }

  const unlock = (pin: string) => unlockWithPin(pin)

  const register = async (
    email: string,
    password: string,
    name: string,
    accountName?: string,
    options?: { skipDefaultAccount?: boolean; redirectTo?: string }
  ) => {
    useAuthStore.getState().setRegistering(true)
    useAuthStore.getState().setAuthError(null)

    try {
      const response = await fetch('/api/proxy/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name,
          accountName,
          skipDefaultAccount: options?.skipDefaultAccount,
        }),
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new ApiError(response.status, data.error || 'Error de registro')
      }

      const { user, key_salt, accountId } = data

      // 🔐 ENCRYPTION: Set up crypto store after registration
      // This must happen BEFORE redirecting (even for email verification flow)
      if (key_salt) {
        const cryptoStore = useCryptoStore.getState()

        // Derive UK from password with the salt backend generated
        await cryptoStore.deriveAndSetUserKey(password, key_salt)

        let encryptedAccountKey: string | undefined
        let verificationBlob: string | undefined

        // If account was created, generate AK
        if (accountId && !options?.skipDefaultAccount) {
          encryptedAccountKey = await cryptoStore.createAccountKey(accountId)
        }

        // Generate verification blob
        const userKey = useCryptoStore.getState().userKey
        if (userKey) {
          verificationBlob = await generateVerificationBlob(userKey)
        }

        // Save crypto data - use public endpoint if email not verified
        if (data.emailVerified === false) {
          // User not authenticated yet, use public endpoint
          const setupRes = await fetch('/api/proxy/auth/complete-crypto-setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              verificationBlob,
              encryptedAccountKey,
              accountId,
            }),
          })
          if (!setupRes.ok) {
            console.error('[register] complete-crypto-setup failed:', setupRes.status)
          }
        } else {
          // User authenticated, use normal endpoints
          if (encryptedAccountKey && accountId) {
            await accounts.saveAccountKey(accountId, encryptedAccountKey)
          }
          if (verificationBlob) {
            await auth.saveVerificationBlob(verificationBlob)
          }
        }
      }

      // New users have no separate PIN yet (password = encryption source)
      useAuthStore.getState().setHasSeparatePin(false)

      // Check if email verification is required
      if (data.emailVerified === false) {
        // Encryption is set up, now redirect to verification page
        // User must verify email before they can login
        router.replace('/verify-sent')
        return
      }

      // Email already verified (shouldn't happen on new registration, but handle it)
      queryClient.setQueryData(AUTH_QUERY_KEYS.user, user)

      // Force unlock after setup (only for already-verified users)
      if (key_salt) {
        useCryptoStore.getState().forceUnlockAfterSetup()
      }

      const { accounts: userAccounts } = await accounts.getAll()
      queryClient.setQueryData(AUTH_QUERY_KEYS.accounts, userAccounts)

      const activeAccount = userAccounts.length > 0 ? userAccounts[0] : null
      queryClient.setQueryData(AUTH_QUERY_KEYS.account, activeAccount)
      if (activeAccount) {
        setSelectedAccountId(activeAccount.id)
      }

      router.replace(options?.redirectTo || '/dashboard')
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Error al registrar'
      useAuthStore.getState().setAuthError(message)
      throw error
    } finally {
      useAuthStore.getState().setRegistering(false)
    }
  }

  const logout = async () => {
    useAuthStore.getState().setLoggingOut(true)

    try {
      // El servidor limpia las cookies httpOnly
      await auth.logout()
    } catch {
      // Ignorar errores de logout
    } finally {
      // 🔐 ENCRYPTION: Clear all crypto keys
      useCryptoStore.getState().lock()

      // Limpiar estado local
      clearLastAccountId()

      queryClient.removeQueries({ queryKey: AUTH_QUERY_KEYS.user })
      queryClient.removeQueries({ queryKey: AUTH_QUERY_KEYS.account })
      queryClient.removeQueries({ queryKey: AUTH_QUERY_KEYS.accounts })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })

      useAuthStore.getState().setLoggingOut(false)
      useAuthStore.getState().setSelectedAccountId(null)
      router.push('/login')
    }
  }

  // Solo consideramos autenticado si la query terminó exitosamente Y hay datos
  const isAuthenticated = userQuery.isSuccess && !!userQuery.data

  return {
    user: userQuery.data as User | null,
    account: account as Account | null,
    accounts: (accountsQuery.data as Account[]) || [],
    isLoading: userQuery.isLoading || (!!userQuery.data && accountsQuery.isLoading),
    isAuthenticated,
    isLoggingIn,
    isRegistering,

    isLoggingOut,
    isSwitchingAccount,
    authError,
    login,
    unlockAfterLogin,
    register,
    logout,
    clearError,
    switchAccount,
    unlock,
  }
}
