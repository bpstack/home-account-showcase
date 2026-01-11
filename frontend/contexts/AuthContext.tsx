'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { auth, accounts, Account } from '@/lib/apiClient'

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
    const token = localStorage.getItem('token')
    if (!token) {
      setIsLoading(false)
      return
    }

    try {
      const { user } = await auth.me()
      setUser(user)

      const { accounts: userAccounts } = await accounts.getAll()
      if (userAccounts.length > 0) {
        setAccount(userAccounts[0])
      }
    } catch {
      localStorage.removeItem('token')
    } finally {
      setIsLoading(false)
    }
  }

  async function login(email: string, password: string) {
    const { token, user } = await auth.login(email, password)
    localStorage.setItem('token', token)
    setUser(user)

    const { accounts: userAccounts } = await accounts.getAll()
    if (userAccounts.length > 0) {
      setAccount(userAccounts[0])
    }

    router.push('/dashboard')
  }

  async function register(email: string, password: string, name: string) {
    const { token, user } = await auth.register(email, password, name)
    localStorage.setItem('token', token)
    setUser(user)

    const { accounts: userAccounts } = await accounts.getAll()
    if (userAccounts.length > 0) {
      setAccount(userAccounts[0])
    }

    router.push('/dashboard')
  }

  function logout() {
    localStorage.removeItem('token')
    setUser(null)
    setAccount(null)
    router.push('/login')
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
