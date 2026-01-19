import { create } from 'zustand'
import { auth, accounts, Account, ApiError } from '@/lib/apiClient'

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
}

const LAST_ACCOUNT_KEY = 'last_account_id'
const ACCOUNT_COOKIE_NAME = 'selectedAccountId'

function getLastAccountId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(LAST_ACCOUNT_KEY)
}

function setLastAccountId(accountId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LAST_ACCOUNT_KEY, accountId)
    // También guardar en cookie para que RSC pueda leerlo
    document.cookie = `${ACCOUNT_COOKIE_NAME}=${accountId}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
  }
}

function clearLastAccountId(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LAST_ACCOUNT_KEY)
    // Limpiar cookie
    document.cookie = `${ACCOUNT_COOKIE_NAME}=; path=/; max-age=0`
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
}))

// Helper para obtener el último account id (usado en useAuth)
export { getLastAccountId, clearLastAccountId }
