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
  login: (_email: string, _password: string) => Promise<void>
  register: (_email: string, _password: string, _name: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Query keys
const AUTH_USER_KEY = ['auth', 'user']
const AUTH_ACCOUNT_KEY = ['auth', 'account']

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // React Query para el usuario - datos remotos gestionados por React Query
  const {
    data: userData,
    isLoading: isLoadingUser,
  } = useQuery({
    queryKey: AUTH_USER_KEY,
    queryFn: async () => {
      const refreshToken = getRefreshToken()
      if (!refreshToken) {
        return null
      }

      try {
        // Si no hay access token, intentar refresh
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
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    retry: false,
    enabled: isMounted, // Solo ejecutar en cliente
  })

  // React Query para la cuenta - datos remotos gestionados por React Query
  const { data: accountData, isLoading: isLoadingAccount } = useQuery({
    queryKey: AUTH_ACCOUNT_KEY,
    queryFn: async () => {
      const { accounts: userAccounts } = await accounts.getAll()
      return userAccounts.length > 0 ? userAccounts[0] : null
    },
    enabled: isMounted && !!userData, // Solo ejecutar si hay usuario y está montado
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  })

  const user = userData || null
  const account = accountData || null
  const isLoading = !isMounted || isLoadingUser || (!!userData && isLoadingAccount)
  const isAuthenticated = !!user

  async function login(email: string, password: string) {
    const { accessToken, refreshToken, user: loggedUser } = await auth.login(email, password)

    // Guardar tokens
    setAccessToken(accessToken)
    setRefreshToken(refreshToken)

    // Actualizar cache de React Query directamente
    queryClient.setQueryData(AUTH_USER_KEY, loggedUser)

    // Invalidar y refetch account
    await queryClient.invalidateQueries({ queryKey: AUTH_ACCOUNT_KEY })

    router.push('/dashboard')
  }

  async function register(email: string, password: string, name: string) {
    const { accessToken, refreshToken, user: newUser } = await auth.register(email, password, name)

    // Guardar tokens
    setAccessToken(accessToken)
    setRefreshToken(refreshToken)

    // Actualizar cache de React Query directamente
    queryClient.setQueryData(AUTH_USER_KEY, newUser)

    // Invalidar y refetch account
    await queryClient.invalidateQueries({ queryKey: AUTH_ACCOUNT_KEY })

    router.push('/dashboard')
  }

  async function logout() {
    try {
      await auth.logout()
    } catch {
      // Si falla el servidor, igual limpiamos localmente
    } finally {
      clearAllTokens()

      // Limpiar cache de React Query
      queryClient.setQueryData(AUTH_USER_KEY, null)
      queryClient.setQueryData(AUTH_ACCOUNT_KEY, null)

      // Invalidar todas las queries relacionadas con datos del usuario
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })

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
        login,
        register,
        logout,
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
