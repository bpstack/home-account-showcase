'use client'

import { createContext, useContext, ReactNode, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { auth, accounts, Account, ApiError } from '@/lib/apiClient'
import {
  setAccessToken,
  setRefreshToken,
  getRefreshToken,
  clearAllTokens,
  getAccessToken,
} from '@/lib/tokenService'
import { useAuthStore, AUTH_QUERY_KEYS } from '@/stores/authStore'

interface User {
  id: string
  email: string
  name: string
}

interface AuthContextType {
  user: User | null
  account: Account | null
  isLoading: boolean
  isAuthenticated: boolean
  isLoggingIn: boolean
  isRegistering: boolean
  authError: string | null
  login: (_email: string, _password: string) => Promise<void>
  register: (_email: string, _password: string, _name: string) => Promise<void>
  logout: () => void
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isMounted, setIsMounted] = useState(false)

  // Estado UI desde Zustand
  const {
    isLoggingIn,
    isRegistering,
    isLoggingOut,
    authError,
    setLoggingIn,
    setRegistering,
    setLoggingOut,
    setAuthError,
    clearError,
  } = useAuthStore()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // React Query para el usuario - datos remotos
  const { data: userData, isLoading: isLoadingUser } = useQuery({
    queryKey: AUTH_QUERY_KEYS.user,
    queryFn: async () => {
      const refreshToken = getRefreshToken()
      if (!refreshToken) {
        return null
      }

      try {
        if (!getAccessToken()) {
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
    enabled: isMounted,
  })

  // React Query para la cuenta - datos remotos
  const { data: accountData, isLoading: isLoadingAccount } = useQuery({
    queryKey: AUTH_QUERY_KEYS.account,
    queryFn: async () => {
      const { accounts: userAccounts } = await accounts.getAll()
      return userAccounts.length > 0 ? userAccounts[0] : null
    },
    enabled: isMounted && !!userData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  })

  const user = userData || null
  const account = accountData || null
  const isLoading = !isMounted || isLoadingUser || (!!userData && isLoadingAccount)
  const isAuthenticated = !!user

  async function login(email: string, password: string) {
    setLoggingIn(true)
    setAuthError(null)

    try {
      const { accessToken, refreshToken, user: loggedUser } = await auth.login(email, password)

      setAccessToken(accessToken)
      setRefreshToken(refreshToken)

      queryClient.setQueryData(AUTH_QUERY_KEYS.user, loggedUser)
      await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.account })

      router.push('/dashboard')
    } catch (error) {
      if (error instanceof ApiError) {
        setAuthError(error.message)
      } else {
        setAuthError('Error al iniciar sesión')
      }
      throw error
    } finally {
      setLoggingIn(false)
    }
  }

  async function register(email: string, password: string, name: string) {
    setRegistering(true)
    setAuthError(null)

    try {
      const { accessToken, refreshToken, user: newUser } = await auth.register(email, password, name)

      setAccessToken(accessToken)
      setRefreshToken(refreshToken)

      queryClient.setQueryData(AUTH_QUERY_KEYS.user, newUser)
      await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.account })

      router.push('/dashboard')
    } catch (error) {
      if (error instanceof ApiError) {
        setAuthError(error.message)
      } else {
        setAuthError('Error al registrar')
      }
      throw error
    } finally {
      setRegistering(false)
    }
  }

  async function logout() {
    setLoggingOut(true)

    try {
      await auth.logout()
    } catch {
      // Si falla el servidor, igual limpiamos localmente
    } finally {
      clearAllTokens()

      queryClient.setQueryData(AUTH_QUERY_KEYS.user, null)
      queryClient.setQueryData(AUTH_QUERY_KEYS.account, null)
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })

      setLoggingOut(false)
      router.push('/login')
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        account,
        isLoading,
        isAuthenticated,
        isLoggingIn,
        isRegistering,
        authError,
        login,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
