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

  // Effect: Redirect to /unlock if authenticated but crypto is locked
  // Also: Redirect to dashboard if authenticated AND crypto is unlocked
  useEffect(() => {
    const cryptoStore = useCryptoStore.getState()

    // Conditions for redirect to /unlock:
    // 1. User is authenticated (cookie valid)
    // 2. Crypto is NOT unlocked (UK not in memory or account not unlocked)
    // 3. NOT already on /unlock page (avoid loop)
    const isCryptoReady = cryptoStore.isUnlocked && cryptoStore.accountKeys.size > 0

    if (userQuery.data && !isCryptoReady && !window.location.pathname.includes('/unlock')) {
      router.replace('/unlock')
    } else if (userQuery.data && isCryptoReady && window.location.pathname === '/unlock') {
      router.replace('/dashboard')
    }
  }, [userQuery.data, router])

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
    // 🔐 ENCRYPTION: Re-derive UK and unlock accounts
    // This is used in /unlock page when user re-enters password after F5
    const cryptoStore = useCryptoStore.getState()

    // Fetch keys from backend (must be authenticated already)
    const { key_salt, encrypted_keys } = await auth.getKeys()

    if (key_salt && encrypted_keys && encrypted_keys.length > 0) {
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

    router.replace('/dashboard')
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
    authError,
    login,
    register,
    logout,
    clearError,
    switchAccount,
    unlock,
  }
}
