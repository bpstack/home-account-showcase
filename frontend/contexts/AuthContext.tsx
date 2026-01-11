'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { auth, accounts, Account, ApiError } from '@/lib/apiClient'
import {
  setAccessToken,
  setRefreshToken,
  getRefreshToken,
  clearAllTokens,
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [account, setAccount] = useState<Account | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      setIsLoading(false)
      return
    }

    try {
      // Primero intentar refresh token para asegurar access token válido
      const { accessToken } = await auth.refresh(refreshToken)
      setAccessToken(accessToken)

      // Ahora con access token válido, obtener usuario
      const { user } = await auth.me()
      setUser(user)

      const { accounts: userAccounts } = await accounts.getAll()
      if (userAccounts.length > 0) {
        setAccount(userAccounts[0])
      }
    } catch (error) {
      // Si falla refresh o /me, limpiar tokens y redirigir a login
      if (error instanceof ApiError && error.status === 401) {
        clearAllTokens()
        setUser(null)
        setAccount(null)
        router.push('/login')
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function login(email: string, password: string) {
    const { accessToken, refreshToken, user } = await auth.login(email, password)

    // Guardar tokens: access en memoria, refresh en localStorage
    setAccessToken(accessToken)
    setRefreshToken(refreshToken)

    setUser(user)

    const { accounts: userAccounts } = await accounts.getAll()
    if (userAccounts.length > 0) {
      setAccount(userAccounts[0])
    }

    router.push('/dashboard')
  }

  async function register(email: string, password: string, name: string) {
    const { accessToken, refreshToken, user } = await auth.register(email, password, name)

    // Guardar tokens: access en memoria, refresh en localStorage
    setAccessToken(accessToken)
    setRefreshToken(refreshToken)

    setUser(user)

    const { accounts: userAccounts } = await accounts.getAll()
    if (userAccounts.length > 0) {
      setAccount(userAccounts[0])
    }

    router.push('/dashboard')
  }

  async function logout() {
    try {
      // Notificar al servidor (opcional, para logging)
      await auth.logout()
    } catch {
      // Si falla el servidor, igual limpiamos localmente
    } finally {
      clearAllTokens()
      setUser(null)
      setAccount(null)
      router.push('/login')
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        account,
        isLoading,
        isAuthenticated: !!user,
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
