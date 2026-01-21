// lib/queries/accounts.ts
// Account queries and hooks

import { useQuery } from '@tanstack/react-query'
import { accounts, Account } from '@/lib/apiClient'
import { useAuthStore } from '@/stores/authStore'

export function useAccount() {
  const selectedAccountId = useAuthStore((state) => state.selectedAccountId)

  const { data: accountsData, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const response = await accounts.getAll()
      return response.accounts
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const defaultAccount = accountsData?.find((acc) => acc.id === selectedAccountId)
    || accountsData?.[0]
    || null

  return {
    data: {
      accounts: accountsData || [],
      defaultAccount,
      selectedAccountId: selectedAccountId || defaultAccount?.id || null,
    },
    isLoading,
  }
}
