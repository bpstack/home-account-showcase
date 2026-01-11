import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { auth, accounts, ApiError } from '@/lib/apiClient'
import {
  setAccessToken,
  getAccessToken,
  clearAllTokens,
  setRefreshToken,
} from '@/lib/tokenService'
import { useAuthStore, AUTH_QUERY_KEYS, User } from '@/stores/authStore'

interface Account {
  id: string
  name: string
  created_at: string
}

export function useAuth() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const isLoggingIn = useAuthStore((s) => s.isLoggingIn)
  const isRegistering = useAuthStore((s) => s.isRegistering)
  const isLoggingOut = useAuthStore((s) => s.isLoggingOut)
  const authError = useAuthStore((s) => s.authError)
  const clearError = useAuthStore((s) => s.clearError)
  const setAuthError = useAuthStore((s) => s.setAuthError)

  const userQuery = useQuery({
    queryKey: AUTH_QUERY_KEYS.user,
    queryFn: async () => {
      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) {
        return null
      }

      try {
        const storedAccessToken = getAccessToken()
        if (!storedAccessToken) {
          const { accessToken } = await auth.refresh(refreshToken)
          setAccessToken(accessToken)
        }

        const { user } = await auth.me()
        return user
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          clearAllTokens()
        }
        return null
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  })

  const accountQuery = useQuery({
    queryKey: AUTH_QUERY_KEYS.account,
    queryFn: async () => {
      const { accounts: userAccounts } = await accounts.getAll()
      return userAccounts.length > 0 ? userAccounts[0] : null
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  })

  const login = async (email: string, password: string) => {
    useAuthStore.getState().setLoggingIn(true)
    useAuthStore.getState().setAuthError(null)

    try {
      const { accessToken, refreshToken, user } = await auth.login(email, password)

      setAccessToken(accessToken)
      setRefreshToken(refreshToken)

      queryClient.setQueryData(AUTH_QUERY_KEYS.user, user)

      const { accounts: userAccounts } = await accounts.getAll()
      const account = userAccounts.length > 0 ? userAccounts[0] : null
      queryClient.setQueryData(AUTH_QUERY_KEYS.account, account)

      router.push('/dashboard')
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Error al iniciar sesión'
      useAuthStore.getState().setAuthError(message)
      throw error
    } finally {
      useAuthStore.getState().setLoggingIn(false)
    }
  }

  const register = async (email: string, password: string, name: string) => {
    useAuthStore.getState().setRegistering(true)
    useAuthStore.getState().setAuthError(null)

    try {
      const { accessToken, refreshToken, user } = await auth.register(email, password, name)

      setAccessToken(accessToken)
      setRefreshToken(refreshToken)

      queryClient.setQueryData(AUTH_QUERY_KEYS.user, user)

      const { accounts: userAccounts } = await accounts.getAll()
      const account = userAccounts.length > 0 ? userAccounts[0] : null
      queryClient.setQueryData(AUTH_QUERY_KEYS.account, account)

      router.push('/dashboard')
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
      await auth.logout()
    } catch {
      // Si falla el servidor, igual limpiamos localmente
    } finally {
      clearAllTokens()

      queryClient.removeQueries({ queryKey: AUTH_QUERY_KEYS.user })
      queryClient.removeQueries({ queryKey: AUTH_QUERY_KEYS.account })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })

      useAuthStore.getState().setLoggingOut(false)
      router.push('/login')
    }
  }

  return {
    user: userQuery.data as User | null,
    account: accountQuery.data as Account | null,
    isLoading: !userQuery.data || accountQuery.isLoading,
    isAuthenticated: !!userQuery.data,
    isLoggingIn,
    isRegistering,
    isLoggingOut,
    authError,
    login,
    register,
    logout,
    clearError,
  }
}
