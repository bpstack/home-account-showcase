import { create } from 'zustand'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { auth, accounts, Account, ApiError } from '@/lib/apiClient'
import {
  setAccessToken,
  setRefreshToken,
  getRefreshToken,
  clearAllTokens,
  getAccessToken,
} from '@/lib/tokenService'

export interface User {
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

  // Acciones UI
  setLoggingIn: (value: boolean) => void
  setRegistering: (value: boolean) => void
  setLoggingOut: (value: boolean) => void
  setAuthError: (error: string | null) => void
  clearError: () => void

  // Acciones de autenticación
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
}

export const AUTH_QUERY_KEYS = {
  user: ['auth', 'user'] as const,
  account: ['auth', 'account'] as const,
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Estado inicial
  isLoggingIn: false,
  isRegistering: false,
  isLoggingOut: false,
  authError: null,

  // Acciones UI
  setLoggingIn: (value) => set({ isLoggingIn: value }),
  setRegistering: (value) => set({ isRegistering: value }),
  setLoggingOut: (value) => set({ isLoggingOut: value }),
  setAuthError: (error) => set({ authError: error }),
  clearError: () => set({ authError: null }),

  // Acción login
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
      const account = userAccounts.length > 0 ? userAccounts[0] : null
      queryClient.setQueryData(AUTH_QUERY_KEYS.account, account)

      router.push('/dashboard')
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Error al iniciar sesión'
      set({ authError: message })
      throw error
    } finally {
      set({ isLoggingIn: false })
    }
  },

  // Acción register
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
      const account = userAccounts.length > 0 ? userAccounts[0] : null
      queryClient.setQueryData(AUTH_QUERY_KEYS.account, account)

      router.push('/dashboard')
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Error al registrar'
      set({ authError: message })
      throw error
    } finally {
      set({ isRegistering: false })
    }
  },

  // Acción logout
  logout: async () => {
    const router = useRouter()
    const queryClient = useQueryClient()

    set({ isLoggingOut: true })

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

      set({ isLoggingOut: false })
      router.push('/login')
    }
  },
}))
