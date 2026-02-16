// lib/queries/budget.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CategoryBudget, CreateBudgetPayload, UpdateBudgetPayload } from '@/lib/types/budget'

const BUDGET_API = '/api/proxy/budget'

function getCSRFToken(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(/csrfToken=([^;]+)/)
  return match ? match[1] : ''
}

async function fetchBudgets(accountId: string): Promise<CategoryBudget[]> {
  const res = await fetch(`${BUDGET_API}?account_id=${accountId}`, {
    credentials: 'include',
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Error fetching budgets')
  }

  const data = await res.json()
  return data.data
}

async function createBudget(
  payload: CreateBudgetPayload & { account_id: string }
): Promise<CategoryBudget> {
  const csrfToken = getCSRFToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken
  }

  const res = await fetch(BUDGET_API, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    credentials: 'include',
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Error creating budget')
  }

  const data = await res.json()
  return data.data
}

async function updateBudget(
  id: string,
  payload: UpdateBudgetPayload & { account_id: string }
): Promise<CategoryBudget> {
  const csrfToken = getCSRFToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken
  }

  const res = await fetch(`${BUDGET_API}/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(payload),
    credentials: 'include',
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Error updating budget')
  }

  const data = await res.json()
  return data.data
}

async function deleteBudget(id: string, accountId: string): Promise<void> {
  const csrfToken = getCSRFToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken
  }

  const res = await fetch(`${BUDGET_API}/${id}`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ account_id: accountId }),
    credentials: 'include',
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Error deleting budget')
  }
}

export function useBudgets(accountId?: string) {
  return useQuery({
    queryKey: ['budgets', accountId],
    queryFn: () => fetchBudgets(accountId!),
    enabled: !!accountId,
  })
}

export function useCreateBudget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
  })
}

export function useUpdateBudget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: UpdateBudgetPayload & { account_id: string }
    }) => updateBudget(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
  })
}

export function useDeleteBudget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, accountId }: { id: string; accountId: string }) =>
      deleteBudget(id, accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
  })
}
