import { useQuery, useMutation } from '@tanstack/react-query'
import { categories as categoriesApi, subcategories as subcategoriesApi } from '../apiClient'
import type { Category } from '../apiClient'
import { useCryptoStore } from '@/stores/cryptoStore'
import { decrypt, encrypt } from '../crypto'

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

// Extended types for encrypted data from API
interface EncryptedSubcategory {
  id: string
  category_id: string
  name: string
  name_encrypted?: string
  created_at: string
}

interface EncryptedCategory extends Omit<Category, 'subcategories'> {
  name_encrypted?: string
  subcategories?: EncryptedSubcategory[]
}

// Helper to decrypt category and its subcategories
async function decryptCategoryData(
  category: EncryptedCategory,
  accountKey: CryptoKey
): Promise<Category> {
  const decryptedCategory: Category = {
    ...category,
    name: category.name_encrypted
      ? await decrypt(category.name_encrypted, accountKey)
      : category.name,
    subcategories: undefined,
  }

  if (category.subcategories) {
    decryptedCategory.subcategories = await Promise.all(
      category.subcategories.map(async (sub) => ({
        id: sub.id,
        category_id: sub.category_id,
        name: sub.name_encrypted ? await decrypt(sub.name_encrypted, accountKey) : sub.name,
        created_at: sub.created_at,
      }))
    )
  }

  return decryptedCategory
}

export function useCategories(accountId: string, options?: UseCategoriesOptions) {
  const getAccountKey = useCryptoStore((s) => s.getAccountKey)

  return useQuery({
    queryKey: categoryKeys.lists(accountId),
    queryFn: async () => {
      const response = await categoriesApi.getAll(accountId)

      // Decrypt if account is unlocked and data is encrypted
      const accountKey = getAccountKey(accountId)
      if (accountKey && response.categories.length > 0) {
        const firstCat = response.categories[0] as Category & { name_encrypted?: string }
        if (firstCat.name_encrypted) {
          const decryptedCategories = await Promise.all(
            response.categories.map((cat) => decryptCategoryData(cat as any, accountKey))
          )
          return { ...response, categories: decryptedCategories }
        }
      }

      return response
    },
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
  const getAccountKey = useCryptoStore((s) => s.getAccountKey)

  return useMutation({
    mutationFn: async (data: {
      account_id: string
      name: string
      color?: string
      icon?: string
    }) => {
      const accountKey = getAccountKey(data.account_id)

      // If account is unlocked, encrypt the name
      if (accountKey) {
        const name_encrypted = await encrypt(data.name, accountKey)
        return categoriesApi.createEncrypted({
          ...data,
          name_encrypted,
        })
      }

      // Legacy: no encryption
      return categoriesApi.create(data)
    },
  })
}

export function useUpdateCategory() {
  const getAccountKey = useCryptoStore((s) => s.getAccountKey)

  return useMutation({
    mutationFn: async ({
      id,
      data,
      accountId,
    }: {
      id: string
      data: { name?: string; color?: string; icon?: string }
      accountId?: string
    }) => {
      // If account is unlocked and name is being updated, encrypt it
      if (accountId && data.name) {
        const accountKey = getAccountKey(accountId)
        if (accountKey) {
          const name_encrypted = await encrypt(data.name, accountKey)
          return categoriesApi.updateEncrypted(id, {
            ...data,
            name_encrypted,
          })
        }
      }

      // Legacy: no encryption
      return categoriesApi.update(id, data)
    },
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
  const getAccountKey = useCryptoStore((s) => s.getAccountKey)

  return useMutation({
    mutationFn: async (data: { category_id: string; name: string; accountId?: string }) => {
      // If account is unlocked, encrypt the name
      if (data.accountId) {
        const accountKey = getAccountKey(data.accountId)
        if (accountKey) {
          const name_encrypted = await encrypt(data.name, accountKey)
          return subcategoriesApi.createEncrypted({
            category_id: data.category_id,
            name: data.name,
            name_encrypted,
          })
        }
      }

      // Legacy: no encryption
      return subcategoriesApi.create({ category_id: data.category_id, name: data.name })
    },
  })
}

export function useUpdateSubcategory() {
  const getAccountKey = useCryptoStore((s) => s.getAccountKey)

  return useMutation({
    mutationFn: async ({
      id,
      data,
      accountId,
    }: {
      id: string
      data: { name?: string }
      accountId?: string
    }) => {
      // If account is unlocked and name is being updated, encrypt it
      if (accountId && data.name) {
        const accountKey = getAccountKey(accountId)
        if (accountKey) {
          const name_encrypted = await encrypt(data.name, accountKey)
          return subcategoriesApi.updateEncrypted(id, {
            name: data.name,
            name_encrypted,
          })
        }
      }

      // Legacy: no encryption
      return subcategoriesApi.update(id, data)
    },
  })
}

export function useDeleteSubcategory() {
  return useMutation({
    mutationFn: (id: string) => subcategoriesApi.delete(id),
  })
}
