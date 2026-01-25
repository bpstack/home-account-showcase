import { useQuery, useMutation } from '@tanstack/react-query'
import { categories as categoriesApi, subcategories as subcategoriesApi } from '../apiClient'
import type { Category } from '../apiClient'

export const categoryKeys = {
  all: ['categories'] as const,
  lists: (accountId: string) => ['categories', 'list', accountId] as const,
  details: (id: string) => ['categories', 'detail', id] as const,
  orphanedCount: (id: string) => ['categories', 'orphaned', id] as const,
}

interface UseCategoriesOptions {
  initialData?: { categories: Category[] }
  enabled?: boolean
}


export function useCategories(accountId: string, options?: UseCategoriesOptions) {
  return useQuery({
    queryKey: categoryKeys.lists(accountId),
    queryFn: () => categoriesApi.getAll(accountId),
    initialData: options?.initialData,
    enabled: options?.enabled !== false && !!accountId,
  })

}

export function useCategory(id: string) {
  return useQuery({
    queryKey: categoryKeys.details(id),
    queryFn: () => categoriesApi.getById(id),
    enabled: !!id,
  })
}

export function useOrphanedCount(id: string) {
  return useQuery({
    queryKey: categoryKeys.orphanedCount(id),
    queryFn: () => categoriesApi.getOrphanedCount(id),
    enabled: !!id,
  })
}

export function useCreateCategory() {
  return useMutation({
    mutationFn: (data: { account_id: string; name: string; color?: string; icon?: string }) =>
      categoriesApi.create(data),
  })
}

export function useUpdateCategory() {
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: { name?: string; color?: string; icon?: string }
    }) => categoriesApi.update(id, data),
  })
}

export function useDeleteCategory() {
  return useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
  })
}

export function useAddDefaultCategories() {
  return useMutation({
    mutationFn: (accountId: string) => categoriesApi.addDefaults(accountId),
  })
}

export function useReassignTransactions() {
  return useMutation({
    mutationFn: ({ fromId, toId }: { fromId: string; toId: string }) =>
      categoriesApi.reassignTransactions(fromId, toId),
  })
}

export function useCreateSubcategory() {
  return useMutation({
    mutationFn: (data: { category_id: string; name: string }) => subcategoriesApi.create(data),
  })
}

export function useUpdateSubcategory() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string } }) =>
      subcategoriesApi.update(id, data),
  })
}

export function useDeleteSubcategory() {
  return useMutation({
    mutationFn: (id: string) => subcategoriesApi.delete(id),
  })
}
