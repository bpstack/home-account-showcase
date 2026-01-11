// lib/api.ts - API Client

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

type RequestOptions = {
  method?: string
  headers?: Record<string, string>
  body?: string
}

class ApiError extends Error {
  constructor(
    private _status: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers as Record<string, string>),
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new ApiError(response.status, data.error || 'Error desconocido')
  }

  return data
}

// Auth
export const auth = {
  login: (email: string, password: string) =>
    request<{ success: boolean; token: string; user: { id: string; email: string; name: string } }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    ),

  register: (email: string, password: string, name: string) =>
    request<{ success: boolean; token: string; user: { id: string; email: string; name: string } }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      }
    ),

  me: () =>
    request<{ success: boolean; user: { id: string; email: string; name: string } }>('/auth/me'),
}

// Accounts
export const accounts = {
  getAll: () => request<{ success: boolean; accounts: Account[] }>('/accounts'),
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
    if (params.limit) searchParams.set('limit', params.limit.toString())
    if (params.offset) searchParams.set('offset', params.offset.toString())

    return request<{ success: boolean; transactions: Transaction[] }>(
      `/transactions?${searchParams}`
    )
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

export interface TransactionParams {
  account_id: string
  start_date?: string
  end_date?: string
  subcategory_id?: string
  min_amount?: number
  max_amount?: number
  search?: string
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
  file_type: 'control_gastos' | 'movimientos_cc' | 'unknown'
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
  parse: async (file: File, sheetName?: string): Promise<{ success: boolean; data: ParseResult }> => {
    const token = localStorage.getItem('token')
    const formData = new FormData()
    formData.append('file', file)
    if (sheetName) {
      formData.append('sheet_name', sheetName)
    }

    const response = await fetch(`${API_URL}/import/parse`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })

    const data = await response.json()
    if (!response.ok) {
      throw new ApiError(response.status, data.error || 'Error al parsear archivo')
    }
    return data
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
    request<{ success: boolean; categories: Category[] }>(`/import/categories?account_id=${accountId}`),
}

export { ApiError }
