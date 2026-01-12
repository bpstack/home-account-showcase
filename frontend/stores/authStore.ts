import { create } from 'zustand'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { auth, accounts, Account, ApiError } from '@/lib/apiClient'
import {
  setAccessToken,
  setRefreshToken,
  clearAllTokens,
} from '@/lib/tokenService'

export interface User {
  id: string
  email: string
  name: string
}

interface AuthState {
  isLoggingIn: boolean
  isRegistering: boolean
  isLoggingOut: boolean
  authError: string | null
  selectedAccountId: string | null

  setLoggingIn: (value: boolean) => void
  setRegistering: (value: boolean) => void
  setLoggingOut: (value: boolean) => void
  setAuthError: (error: string | null) => void
  clearError: () => void
  setSelectedAccountId: (accountId: string | null) => void
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
}

const LAST_ACCOUNT_KEY = 'last_account_id'

function getLastAccountId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(LAST_ACCOUNT_KEY)
}

function setLastAccountId(accountId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LAST_ACCOUNT_KEY, accountId)
  }
}

function clearLastAccountId(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LAST_ACCOUNT_KEY)
  }
}

export const AUTH_QUERY_KEYS = {
  user: ['auth', 'user'] as const,
  account: ['auth', 'account'] as const,
  accounts: ['auth', 'accounts'] as const,
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggingIn: false,
  isRegistering: false,
  isLoggingOut: false,
  authError: null,
  selectedAccountId: null,

  setLoggingIn: (value) => set({ isLoggingIn: value }),
  setRegistering: (value) => set({ isRegistering: value }),
  setLoggingOut: (value) => set({ isLoggingOut: value }),
  setAuthError: (error) => set({ authError: error }),
  clearError: () => set({ authError: null }),

  setSelectedAccountId: (accountId) => {
    set({ selectedAccountId: accountId })
    if (accountId) {
      setLastAccountId(accountId)
    } else {
      clearLastAccountId()
    }
  },

  login: async (email: string, password: string) => {
    const router = useRouter()
    const queryClient = useQueryClient()

    set({ isLoggingIn: true, authError: null })

    try {
      const { accessToken, refreshToken, user } = await auth.login(email, password)

      setAccessToken(accessToken)
      setRefreshToken(refreshToken)

      queryClient.setQueryData(AUTH_QUERY_KEYS.user, user)

      const { accounts: userAccounts } = await accounts.getAll()
      queryClient.setQueryData(AUTH_QUERY_KEYS.accounts, userAccounts)

      const lastAccountId = getLastAccountId()
      const savedAccount = userAccounts.find((a) => a.id === lastAccountId)
      const account = savedAccount || (userAccounts.length > 0 ? userAccounts[0] : null)

      queryClient.setQueryData(AUTH_QUERY_KEYS.account, account)
      if (account) {
        setLastAccountId(account.id)
        set({ selectedAccountId: account.id })
      }

      router.push('/dashboard')
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Error al iniciar sesión'
      set({ authError: message })
      throw error
    } finally {
      set({ isLoggingIn: false })
    }
  },

  register: async (email: string, password: string, name: string) => {
    const router = useRouter()
    const queryClient = useQueryClient()

    set({ isRegistering: true, authError: null })

    try {
      const { accessToken, refreshToken, user } = await auth.register(email, password, name)

      setAccessToken(accessToken)
      setRefreshToken(refreshToken)

      queryClient.setQueryData(AUTH_QUERY_KEYS.user, user)

      const { accounts: userAccounts } = await accounts.getAll()
      queryClient.setQueryData(AUTH_QUERY_KEYS.accounts, userAccounts)

      const account = userAccounts.length > 0 ? userAccounts[0] : null
      queryClient.setQueryData(AUTH_QUERY_KEYS.account, account)
      if (account) {
        setLastAccountId(account.id)
        set({ selectedAccountId: account.id })
      }

      router.push('/dashboard')
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Error al registrar'
      set({ authError: message })
      throw error
    } finally {
      set({ isRegistering: false })
    }
  },

  logout: async () => {
    const router = useRouter()
    const queryClient = useQueryClient()

    set({ isLoggingOut: true })

    try {
      await auth.logout()
    } catch {
    } finally {
      clearAllTokens()
      clearLastAccountId()

      queryClient.removeQueries({ queryKey: AUTH_QUERY_KEYS.user })
      queryClient.removeQueries({ queryKey: AUTH_QUERY_KEYS.account })
      queryClient.removeQueries({ queryKey: AUTH_QUERY_KEYS.accounts })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })

      set({
        isLoggingOut: false,
        selectedAccountId: null,
      })
      router.push('/login')
    }
  },
}))
