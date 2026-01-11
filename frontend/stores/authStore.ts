import { create } from 'zustand'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { auth, accounts, Account } from '@/lib/apiClient'
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

interface AuthState {
  // Estado UI local
  isLoggingIn: boolean
  isRegistering: boolean
  isLoggingOut: boolean
  authError: string | null

  // Acciones
  setLoggingIn: (value: boolean) => void
  setRegistering: (value: boolean) => void
  setLoggingOut: (value: boolean) => void
  setAuthError: (error: string | null) => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  // Estado inicial
  isLoggingIn: false,
  isRegistering: false,
  isLoggingOut: false,
  authError: null,

  // Acciones
  setLoggingIn: (value) => set({ isLoggingIn: value }),
  setRegistering: (value) => set({ isRegistering: value }),
  setLoggingOut: (value) => set({ isLoggingOut: value }),
  setAuthError: (error) => set({ authError: error }),
  clearError: () => set({ authError: null }),
}))

// Query keys exportados para uso consistente
export const AUTH_QUERY_KEYS = {
  user: ['auth', 'user'] as const,
  account: ['auth', 'account'] as const,
}

// Helper para verificar si hay refresh token (sin llamar hooks)
export const hasRefreshToken = () => !!getRefreshToken()
export const hasAccessToken = () => !!getAccessToken()
