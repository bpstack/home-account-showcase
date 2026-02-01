import { useEffect } from 'react'
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
import { useCryptoStore } from '@/stores/cryptoStore'
import { deriveUserKey, generateAccountKey, encryptAccountKey } from '@/lib/crypto'

// Module-level flag to prevent concurrent key recovery calls
let isRecoveringKeys = false

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


  // Effect to recover crypto keys after page refresh
  // If user is authenticated but crypto store is empty, try to recover from sessionStorage
  useEffect(() => {
    const recoverCryptoKeys = async () => {
      const cryptoStore = useCryptoStore.getState()

      // Skip if already unlocked, recovery in progress, or no user
      if (cryptoStore.isUnlocked || isRecoveringKeys || !userQuery.data) return

      // Try to get stored password from sessionStorage
      const storedPassword = cryptoStore.getStoredPassword()
      if (!storedPassword) return

      // Set flag to prevent concurrent recovery attempts
      isRecoveringKeys = true

      try {
        // Fetch keys from backend
        const { key_salt, encrypted_keys } = await auth.getKeys()

        if (key_salt && encrypted_keys && encrypted_keys.length > 0) {
          // Re-derive UK from stored password
          await cryptoStore.deriveAndSetUserKey(storedPassword, key_salt)

          // Unlock all accounts
          await cryptoStore.unlockAccounts(
            encrypted_keys.map((k) => ({
              accountId: k.account_id,
              encryptedKey: k.encrypted_key,
              keyVersion: k.key_version,
            }))
          )
        }
      } catch (error) {
        console.error('Failed to recover crypto keys:', error)
        // Clear invalid stored password
        cryptoStore.lock()
      } finally {
        isRecoveringKeys = false
      }
    }

    recoverCryptoKeys()
  }, [userQuery.data])

  const switchAccount = async (accountId: string) => {
    const newAccount = accountsQuery.data?.find((a) => a.id === accountId)
    if (newAccount) {
      setSelectedAccountId(accountId)
      queryClient.setQueryData(AUTH_QUERY_KEYS.account, newAccount)
      router.refresh()
    }
  }

  const login = async (email: string, password: string, redirectTo?: string) => {
    useAuthStore.getState().setLoggingIn(true)
    useAuthStore.getState().setAuthError(null)

    try {
      // El servidor establece las cookies httpOnly automáticamente
      const { user, key_salt, encrypted_keys } = await auth.login(email, password)

      queryClient.setQueryData(AUTH_QUERY_KEYS.user, user)

      // 🔐 ENCRYPTION: Derive User Key and unlock accounts
      if (key_salt && encrypted_keys && encrypted_keys.length > 0) {
        const cryptoStore = useCryptoStore.getState()

        // Derive UK from password
        await cryptoStore.deriveAndSetUserKey(password, key_salt)

        // Unlock all accounts
        await cryptoStore.unlockAccounts(
          encrypted_keys.map((k) => ({
            accountId: k.account_id,
            encryptedKey: k.encrypted_key,
            keyVersion: k.key_version,
          }))
        )
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

      router.push(redirectTo || '/dashboard')
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Error al iniciar sesión'
      useAuthStore.getState().setAuthError(message)
      throw error
    } finally {
      useAuthStore.getState().setLoggingIn(false)
    }
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
      // 🔐 ENCRYPTION: Generate Account Key before registration (if creating account)
      let encryptedAccountKey: string | undefined

      if (!options?.skipDefaultAccount) {
        // Need to pre-generate AK and encrypt it
        // We'll derive UK from password using a placeholder salt first,
        // then the backend will return the real salt
        // Actually, we need to send the encrypted AK WITH the registration
        // So we derive UK → generate AK → encrypt AK → send encrypted AK
        // Backend will generate the salt, return it, and we re-derive UK client-side
        // For now, we generate AK and will encrypt it after we get the salt
        // This requires a 2-step process or backend generating salt upfront
        // Let's use the simpler approach: generate random AK, encrypt with derived UK
        // Backend returns salt, frontend re-derives UK and verifies
      }

      // El servidor establece las cookies httpOnly automáticamente
      const { user, key_salt, accountId } = await auth.register(
        email,
        password,
        name,
        accountName,
        options?.skipDefaultAccount,
        encryptedAccountKey
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
      }

      const { accounts: userAccounts } = await accounts.getAll()
      queryClient.setQueryData(AUTH_QUERY_KEYS.accounts, userAccounts)

      const activeAccount = userAccounts.length > 0 ? userAccounts[0] : null
      queryClient.setQueryData(AUTH_QUERY_KEYS.account, activeAccount)
      if (activeAccount) {
        setSelectedAccountId(activeAccount.id)
      }

      router.push(options?.redirectTo || '/dashboard')
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

  return {
    user: userQuery.data as User | null,
    account: account as Account | null,
    accounts: (accountsQuery.data as Account[]) || [],
    isLoading: userQuery.isLoading || (!!userQuery.data && accountsQuery.isLoading),
    isAuthenticated: !!userQuery.data,
    isLoggingIn,
    isRegistering,
    isLoggingOut,
    authError,
    login,
    register,
    logout,
    clearError,
    switchAccount,
  }
}
