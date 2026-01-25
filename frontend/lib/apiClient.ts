// lib/apiClient.ts - API Client con cookies httpOnly y CSRF protection
// Auth usa proxy local (/api/auth/*) para manejar cookies cross-origin
// El resto de endpoints van directo al backend

// Usar proxy de Next.js para todas las peticiones desde el cliente
// Esto evita problemas de cookies cross-site en producción
const isClient = typeof window !== 'undefined'

const API_URL = isClient ? '/api/proxy' : (process.env.API_URL || 'http://localhost:3001/api')
const AUTH_URL = isClient ? '/api/proxy/auth' : (process.env.API_URL || 'http://localhost:3001/api') + '/auth'


type RequestOptions = {
  method?: string
  headers?: Record<string, string>
  body?: string | FormData
}

class ApiError extends Error {
  constructor(
    private _status: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }

  get status(): number {
    return this._status
  }
}

// Variable para evitar múltiples refresh simultáneos
let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null

function getCSRFToken(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(/csrfToken=([^;]+)/)
  return match ? match[1] : ''
}

function isMutationMethod(method?: string): boolean {
  const m = (method || 'GET').toUpperCase()
  return m === 'POST' || m === 'PUT' || m === 'DELETE'
}

/**
 * Intenta refrescar el access token usando la cookie refreshToken
 * Usa el proxy local de Next.js para manejar cookies
 */
async function refreshAccessToken(): Promise<boolean> {
  // Si ya hay un refresh en progreso, esperar a que termine
  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }

  isRefreshing = true
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${AUTH_URL}/refresh`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        return false
      }

      const data = await response.json()
      if (data.csrfToken) {
        document.cookie = `csrfToken=${data.csrfToken}; path=/; max-age=${8 * 60 * 60}`
      }

      return true
    } catch {
      return false
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  })()

  return refreshPromise
}

/**
 * Función de request con interceptor para refresh automático
 * Usa credentials: 'include' para enviar cookies automáticamente
 * Añade X-CSRF-Token header en mutaciones
 */
async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}

  // No agregar Content-Type si es FormData (fetch lo maneja automáticamente)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  // Añadir CSRF token en mutaciones
  if (isMutationMethod(options.method)) {
    const csrfToken = getCSRFToken()
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken
    }
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...headers,
      ...(options.headers as Record<string, string>),
    },
  })

  const data = await response.json()

  // Si recibimos 401, intentar refresh (excepto en el endpoint de refresh)
  if (response.status === 401 && endpoint !== '/auth/refresh') {
    const refreshed = await refreshAccessToken()

    if (refreshed) {
      // Retry la petición original (la nueva cookie ya está establecida)
      const retryHeaders: Record<string, string> = {}
      if (isMutationMethod(options.method)) {
        const csrfToken = getCSRFToken()
        if (csrfToken) {
          retryHeaders['X-CSRF-Token'] = csrfToken
        }
      }

      const retryResponse = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        credentials: 'include',
        headers: {
          ...retryHeaders,
          ...(options.headers as Record<string, string>),
        },
      })

      const retryData = await retryResponse.json()

      if (!retryResponse.ok) {
        throw new ApiError(retryResponse.status, retryData.error || 'Error desconocido')
      }

      return retryData
    } else {
      // Refresh falló - sesión expirada
      throw new ApiError(401, 'Sesión expirada')
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, data.error || 'Error desconocido')
  }

  return data
}

// Auth - usa proxy local de Next.js para manejar cookies cross-origin
export const auth = {
  login: async (email: string, password: string) => {
    const response = await fetch(`${AUTH_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    })
    const data = await response.json()
    if (!response.ok) {
      throw new ApiError(response.status, data.error || 'Error de autenticación')
    }

    if (typeof window !== 'undefined' && data.csrfToken) {
      document.cookie = `csrfToken=${data.csrfToken}; path=/; max-age=${8 * 60 * 60}`
    }

    return data as { success: boolean; user: { id: string; email: string; name: string } }
  },

  register: async (email: string, password: string, name: string, accountName?: string) => {
    const response = await fetch(`${AUTH_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, accountName }),
      credentials: 'include',
    })
    const data = await response.json()
    if (!response.ok) {
      throw new ApiError(response.status, data.error || 'Error de registro')
    }

    if (typeof window !== 'undefined' && data.csrfToken) {
      document.cookie = `csrfToken=${data.csrfToken}; path=/; max-age=${8 * 60 * 60}`
    }

    return data as { success: boolean; user: { id: string; email: string; name: string } }
  },

  me: async () => {
    const response = await fetch(`${AUTH_URL}/me`, {
      method: 'GET',
      credentials: 'include',
    })
    const data = await response.json()
    if (!response.ok) {
      throw new ApiError(response.status, data.error || 'No autenticado')
    }
    return data as { success: boolean; user: { id: string; email: string; name: string } }
  },

  logout: async () => {
    const response = await fetch(`${AUTH_URL}/logout`, {
      method: 'POST',
      credentials: 'include',
    })
    const data = await response.json()
    if (!response.ok) {
      throw new ApiError(response.status, data.error || 'Error al cerrar sesión')
    }

    if (typeof window !== 'undefined') {
      document.cookie = 'csrfToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    }

    return data as { success: boolean; message: string }
  },

  refresh: async () => {
    const response = await fetch(`${AUTH_URL}/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    const data = await response.json()
    if (!response.ok) {
      throw new ApiError(response.status, data.error || 'Error al refrescar sesión')
    }

    if (typeof window !== 'undefined' && data.csrfToken) {
      document.cookie = `csrfToken=${data.csrfToken}; path=/; max-age=${8 * 60 * 60}`
    }

    return data as { success: boolean }
  },
}

// Users
export const users = {
  getAll: () =>
    request<{ success: boolean; users: User[] }>('/users'),

  getById: (id: string) =>
    request<{ success: boolean; user: User }>(`/users/${id}`),

  update: (id: string, data: { name?: string; email?: string }) =>
    request<{ success: boolean; user: User }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ success: boolean; message: string }>(`/users/${id}`, {
      method: 'DELETE',
    }),

  resetPassword: (id: string, newPassword: string) =>
    request<{ success: boolean; message: string }>(`/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    }),

  changePassword: (id: string, currentPassword: string, newPassword: string) =>
    request<{ success: boolean; message: string }>(`/users/${id}/change-password`, {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
}

// Accounts
export const accounts = {
  getAll: () => request<{ success: boolean; accounts: Account[] }>('/accounts'),
  update: (id: string, data: { name: string }) =>
    request<{ success: boolean; account: Account }>(`/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getMembers: (id: string) =>
    request<{
      success: boolean
      members: { id: string; email: string; name: string; role: string; joined_at: string }[]
    }>(`/accounts/${id}/members`),
  addMember: (id: string, email: string, name: string) =>
    request<{ success: boolean; message: string }>(`/accounts/${id}/members`, {
      method: 'POST',
      body: JSON.stringify({ email, name }),
    }),
  leaveAccount: (id: string) =>
    request<{ success: boolean; message: string }>(`/accounts/${id}/leave`, {
      method: 'POST',
    }),
}

// Categories
export const categories = {
  getAll: (accountId: string) =>
    request<{ success: boolean; categories: Category[] }>(`/categories?account_id=${accountId}`),

  getById: (id: string) => request<{ success: boolean; category: Category }>(`/categories/${id}`),

  create: (data: { account_id: string; name: string; color?: string; icon?: string }) =>
    request<{ success: boolean; category: Category }>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { name?: string; color?: string; icon?: string }) =>
    request<{ success: boolean; category: Category }>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) => request<{ success: boolean }>(`/categories/${id}`, { method: 'DELETE' }),

  addDefaults: (accountId: string) =>
    request<{ success: boolean; categories: number; subcategories: number }>(
      `/accounts/${accountId}/categories/default`,
      { method: 'POST' }
    ),

  getOrphanedCount: (id: string) =>
    request<{ success: boolean; count: number }>(`/categories/${id}/orphaned-count`),

  reassignTransactions: (fromId: string, toId: string) =>
    request<{ success: boolean; message: string; reassignedCount: number }>(
      `/categories/${fromId}/reassign`,
      {
        method: 'POST',
        body: JSON.stringify({ to_category_id: toId }),
      }
    ),
}

// Subcategories
export const subcategories = {
  getAll: (categoryId: string) =>
    request<{ success: boolean; subcategories: Subcategory[] }>(
      `/subcategories?category_id=${categoryId}`
    ),

  create: (data: { category_id: string; name: string }) =>
    request<{ success: boolean; subcategory: Subcategory }>('/subcategories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { name?: string }) =>
    request<{ success: boolean; subcategory: Subcategory }>(`/subcategories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ success: boolean }>(`/subcategories/${id}`, { method: 'DELETE' }),
}

// Transactions
export const transactions = {
  getAll: (params: TransactionParams) => {
    const searchParams = new URLSearchParams()
    searchParams.set('account_id', params.account_id)
    if (params.start_date) searchParams.set('start_date', params.start_date)
    if (params.end_date) searchParams.set('end_date', params.end_date)
    if (params.subcategory_id) searchParams.set('subcategory_id', params.subcategory_id)
    if (params.min_amount !== undefined)
      searchParams.set('min_amount', params.min_amount.toString())
    if (params.max_amount !== undefined)
      searchParams.set('max_amount', params.max_amount.toString())
    if (params.search) searchParams.set('search', params.search)
    if (params.type) searchParams.set('type', params.type)
    if (params.limit) searchParams.set('limit', params.limit.toString())
    if (params.offset) searchParams.set('offset', params.offset.toString())

    return request<{
      success: boolean
      transactions: Transaction[]
      total: number
      limit: number
      offset: number
    }>(`/transactions?${searchParams}`)
  },

  getById: (id: string) =>
    request<{ success: boolean; transaction: Transaction }>(`/transactions/${id}`),

  create: (data: CreateTransactionData) =>
    request<{ success: boolean; transaction: Transaction }>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateTransactionData) =>
    request<{ success: boolean; transaction: Transaction }>(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ success: boolean }>(`/transactions/${id}`, { method: 'DELETE' }),

  getSummary: (accountId: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams({ account_id: accountId })
    if (startDate) params.set('start_date', startDate)
    if (endDate) params.set('end_date', endDate)
    return request<{ success: boolean; summary: CategorySummary[]; total: number }>(
      `/transactions/summary?${params}`
    )
  },

  getStats: (accountId: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams({ account_id: accountId })
    if (startDate) params.set('start_date', startDate)
    if (endDate) params.set('end_date', endDate)
    return request<{
      success: boolean
      stats: {
        income: number
        expenses: number
        balance: number
        transactionCount: number
        incomeByType: Record<string, number>
      }
    }>(`/transactions/stats?${params}`)
  },

  getBalanceHistory: (accountId: string, year: number) => {
    const params = new URLSearchParams({ account_id: accountId, year: year.toString() })
    return request<{
      success: boolean
      balanceHistory: { date: string; fullDate: string; balance: number }[]
    }>(`/transactions/balance-history?${params}`)
  },

  getMonthlySummary: (accountId: string, year: number) => {
    const params = new URLSearchParams({ account_id: accountId, year: year.toString() })
    return request<{
      success: boolean
      monthlySummary: { month: string; income: number; expenses: number }[]
    }>(`/transactions/monthly-summary?${params}`)
  },

  bulkUpdatePreview: (accountId: string, descriptionPattern: string) => {
    const params = new URLSearchParams({
      account_id: accountId,
      description_pattern: descriptionPattern,
    })
    return request<{
      success: boolean
      count: number
      description_pattern: string
    }>(`/transactions/bulk-update-preview?${params}`)
  },

  bulkUpdateCategory: (data: {
    account_id: string
    description_pattern: string
    subcategory_id: string | null
    save_mapping?: boolean
  }) =>
    request<{
      success: boolean
      updatedCount: number
      description_pattern: string
      subcategory_id: string | null
    }>('/transactions/bulk-update-category', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
}

// Types
export interface Account {
  id: string
  name: string
  created_at: string
  role: string
}

export interface Category {
  id: string
  account_id: string
  name: string
  color: string
  icon: string | null
  created_at: string
  subcategories?: Subcategory[]
}

export interface Subcategory {
  id: string
  category_id: string
  name: string
  created_at: string
}

export interface Transaction {
  id: string
  account_id: string
  subcategory_id: string | null
  date: string
  description: string
  amount: number
  bank_category: string | null
  bank_subcategory: string | null
  created_at: string
  subcategory_name?: string
  category_name?: string
  category_color?: string
}

export interface User {
  id: string
  email: string
  name: string
  created_at: string
  updated_at?: string
}

export interface TransactionParams {
  account_id: string
  start_date?: string
  end_date?: string
  subcategory_id?: string
  min_amount?: number
  max_amount?: number
  search?: string
  type?: 'income' | 'expense' | 'all'
  limit?: number
  offset?: number
}

export interface CreateTransactionData {
  account_id: string
  date: string
  description: string
  amount: number
  subcategory_id?: string
  bank_category?: string
  bank_subcategory?: string
}

export interface UpdateTransactionData {
  date?: string
  description?: string
  amount?: number
  subcategory_id?: string | null
}

export interface CategorySummary {
  category_name: string
  category_color: string
  subcategory_name: string
  total_amount: number
  transaction_count: number
}

// Import types
export interface ParsedTransaction {
  date: string
  description: string
  amount: number
  bank_category: string
  bank_subcategory: string
}

export interface ParseResult {
  success: boolean
  file_type: 'control_gastos' | 'movimientos_cc' | 'csv_revolut' | 'csv_generic' | 'ai_parsed' | 'unknown'
  sheet_name?: string
  available_sheets?: string[]
  transactions: ParsedTransaction[]
  categories: { category: string; subcategory: string }[]
  errors: string[]
}

export interface CategoryMapping {
  bank_category: string
  bank_subcategory: string
  subcategory_id: string | null
}

export interface ImportResult {
  total: number
  inserted: number
  skipped: number
  errors: string[]
}

// Import API
export const importApi = {
  parse: async (
    file: File,
    sheetName?: string
  ): Promise<{ success: boolean; data: ParseResult }> => {
    const formData = new FormData()
    formData.append('file', file)
    if (sheetName) {
      formData.append('sheet_name', sheetName)
    }

    return request<{ success: boolean; data: ParseResult }>('/import/parse', {
      method: 'POST',
      body: formData,
    })
  },

  confirm: (data: {
    account_id: string
    transactions: ParsedTransaction[]
    category_mappings: CategoryMapping[]
  }) =>
    request<{ success: boolean; data: ImportResult }>('/import/confirm', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getCategories: (accountId: string) =>
    request<{ success: boolean; categories: Category[] }>(
      `/import/categories?account_id=${accountId}`
    ),

  getSavedMappings: (accountId: string) =>
    request<{
      success: boolean
      mappings: { bank_category: string; bank_subcategory: string; subcategory_id: string }[]
    }>(`/import/mappings?account_id=${accountId}`),
}

// AI Types
export interface AIProviderInfo {
  configured: boolean
  enabled: boolean
  model: string
  baseUrl?: string
}

export interface AIStatus {
  success: boolean
  enabled: boolean
  activeProvider: string
  providers: Record<string, AIProviderInfo>
}

export interface AITestResult {
  success: boolean
  provider?: string
  model?: string
  responseTime?: number
  error?: string
}

export interface ParsedTransactionAI {
  date: string | null
  description: string
  amount: number
  category?: string
  subcategory?: string
}

export interface AIParseResult {
  success: boolean
  transactions: ParsedTransactionAI[]
  provider: string
  responseTime: number
  error?: string
}

// AI API
export const ai = {
  getStatus: () => request<AIStatus>('/ai/status'),

  setProvider: (provider: string) =>
    request<{ success: boolean; activeProvider: string }>('/ai/provider', {
      method: 'PUT',
      body: JSON.stringify({ provider }),
    }),

  testConnection: (provider: string) =>
    request<AITestResult>('/ai/test', {
      method: 'POST',
      body: JSON.stringify({ provider }),
    }),

  parseTransactions: (text: string, provider?: string) =>
    request<AIParseResult>('/ai/parse', {
      method: 'POST',
      body: JSON.stringify({ text, provider }),
    }),

  categorize: (transactions: Array<{ description: string; date?: string; amount?: number }>) =>
    request<{ success: boolean; categories: Array<{ category: string; subcategory: string }>; responseTime: number }>(
      '/ai/categorize',
      {
        method: 'POST',
        body: JSON.stringify({ transactions }),
      }
    ),
}

export { ApiError }
