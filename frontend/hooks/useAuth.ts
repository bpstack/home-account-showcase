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
import { verifyUserKey, generateVerificationBlob } from '@/lib/crypto'

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
      const { user, key_salt, verification_blob, encrypted_keys } = await auth.login(
        email,
        password
      )

      queryClient.setQueryData(AUTH_QUERY_KEYS.user, user)

      // 🔐 ENCRYPTION: Try to unlock with login password
      // If user has a separate PIN, this will fail gracefully → redirect to /unlock
      if (key_salt && encrypted_keys && encrypted_keys.length > 0) {
        const cryptoStore = useCryptoStore.getState()

        try {
          await cryptoStore.deriveAndSetUserKey(password, key_salt)

          // If there's a verification blob, check if password == encryption source
          if (verification_blob) {
            const userKey = useCryptoStore.getState().userKey
            if (userKey) {
              const isValid = await verifyUserKey(verification_blob, userKey)
              if (!isValid) {
                // Password ≠ PIN → user has a separate PIN for encryption
                // Leave authenticated but locked, layout will redirect to /unlock
                cryptoStore.lock()
              } else {
                // Password IS the encryption source → unlock normally
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
        } catch {
          // Unlock failed → user needs to enter PIN at /unlock
          useCryptoStore.getState().lock()
        }
      }

      const { accounts: userAccounts } = await accounts.getAll()
      queryClient.setQueryData(AUTH_QUERY_KEYS.accounts, userAccounts)

      const lastAccountId = getLastAccountId()
      const savedAccount = userAccounts.find((a: Account) => a.id === lastAccountId)
      const activeAccount = savedAccount || (userAccounts.length > 0 ? userAccounts[0] : null)

      queryClient.setQueryData(AUTH_QUERY_KEYS.account, activeAccount)
      if (activeAccount) {
        setSelectedAccountId(activeAccount.id)
      }

      router.replace(redirectTo || '/dashboard')
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Error al iniciar sesión'
      useAuthStore.getState().setAuthError(message)
      throw error
    } finally {
      useAuthStore.getState().setLoggingIn(false)
    }
  }

  const unlock = async (password: string) => {
    const cryptoStore = useCryptoStore.getState()

    const { key_salt, verification_blob, encrypted_keys } = await auth.getKeys()

    if (!key_salt || !encrypted_keys || encrypted_keys.length === 0) {
      throw new Error('No encryption keys found')
    }

    await cryptoStore.deriveAndSetUserKey(password, key_salt)

    if (verification_blob) {
      const userKey = useCryptoStore.getState().userKey
      if (!userKey) throw new Error('User key not available')

      const isValid = await verifyUserKey(verification_blob, userKey)
      if (!isValid) {
        cryptoStore.lock()
        throw new Error('Wrong password')
      }
    }

    await cryptoStore.unlockAccounts(
      encrypted_keys.map((k) => ({
        accountId: k.account_id,
        encryptedKey: k.encrypted_key,
        keyVersion: k.key_version,
      }))
    )
  }

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
      // El servidor establece las cookies httpOnly automáticamente
      const { user, key_salt, accountId } = await auth.register(
        email,
        password,
        name,
        accountName,
        options?.skipDefaultAccount
      )

      queryClient.setQueryData(AUTH_QUERY_KEYS.user, user)

      // 🔐 ENCRYPTION: Set up crypto store after registration
      if (key_salt) {
        const cryptoStore = useCryptoStore.getState()

        // Derive UK from password with the salt backend generated
        await cryptoStore.deriveAndSetUserKey(password, key_salt)

        // If account was created, we need to generate and save AK
        if (accountId && !options?.skipDefaultAccount) {
          // Generate and save the account key
          const encKey = await cryptoStore.createAccountKey(accountId)

          // Save encrypted key to backend
          await accounts.saveAccountKey(accountId, encKey)
        }

        // Generate and save verification blob
        const userKey = useCryptoStore.getState().userKey
        if (userKey) {
          const blob = await generateVerificationBlob(userKey)
          await auth.saveVerificationBlob(blob)
        }

        // Force unlock after setup
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
    register,
    logout,
    clearError,
    switchAccount,
    unlock,
  }
}
