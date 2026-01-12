'use client'

import { ReactNode, useState, createContext, useContext, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth as useAuthHook } from '@/hooks/useAuth'

interface User {
  id: string
  email: string
  name: string
}

interface Account {
  id: string
  name: string
  created_at: string
  role: string
}

interface AuthContextType {
  user: User | null
  account: Account | null
  accounts: Account[]
  isLoading: boolean
  isAuthenticated: boolean
  isLoggingIn: boolean
  isRegistering: boolean
  isLoggingOut: boolean
  authError: string | null
  login: (_email: string, _password: string) => Promise<void>
  register: (_email: string, _password: string, _name: string) => Promise<void>
  logout: () => void
  clearError: () => void
  switchAccount: (_accountId: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthHook()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const isLoading = !isMounted || auth.isLoading

  return (
    <AuthContext.Provider
      value={{
        user: auth.user,
        account: auth.account,
        accounts: auth.accounts,
        isLoading,
        isAuthenticated: auth.isAuthenticated,
        isLoggingIn: auth.isLoggingIn,
        isRegistering: auth.isRegistering,
        isLoggingOut: auth.isLoggingOut,
        authError: auth.authError,
        login: auth.login,
        register: auth.register,
        logout: auth.logout,
        clearError: auth.clearError,
        switchAccount: auth.switchAccount,
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

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
}
