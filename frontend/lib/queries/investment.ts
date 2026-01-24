// lib/queries/investment.ts
// React Query hooks for investment module

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { investmentApi } from '@/lib/api/investment'
import type { ProfileAnswers } from '@/lib/api/investment'

// ========================
// Queries
// ========================

export function useInvestmentOverview(accountId: string, options?: { refetchOnMount?: boolean }) {
  return useQuery({
    queryKey: ['investment', 'overview', accountId],
    queryFn: () => investmentApi.getOverview(accountId),
    staleTime: 0, // staleTime = 0 according to architecture for financial data
    refetchOnMount: options?.refetchOnMount ?? true,
    enabled: !!accountId
  })
}

export function useMarketPrices(accountId: string, options?: { autoRefresh?: boolean; refetchOnMount?: boolean }) {
  const autoRefresh = options?.autoRefresh ?? false
  return useQuery({
    queryKey: ['investment', 'market-prices', accountId],
    queryFn: () => investmentApi.getMarketPrices(accountId),
    staleTime: autoRefresh ? 10 * 1000 : 30 * 1000,
    refetchInterval: autoRefresh ? 15 * 1000 : undefined,
    refetchOnWindowFocus: false,
    refetchOnMount: options?.refetchOnMount ?? true,
    enabled: !!accountId
  })
}

export function useRecommendations(
  accountId: string,
  options?: { profile?: string; monthlyAmount?: number }
) {
  return useQuery({
    queryKey: ['investment', 'recommendations', accountId, options],
    queryFn: () => investmentApi.getRecommendations(accountId, options),
    staleTime: 0, // staleTime = 0 for recommendations
    enabled: !!accountId
  })
}

export function useChatHistory(accountId: string, sessionId: string) {
  return useQuery({
    queryKey: ['investment', 'chat', 'history', sessionId],
    queryFn: () => investmentApi.getChatHistory(accountId, sessionId),
    staleTime: 30 * 1000, // 30 seconds - chat is dynamic
    enabled: !!accountId && !!sessionId
  })
}

// ========================
// Mutations
// ========================

export function useAnalyzeProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ accountId, answers }: { accountId: string; answers: ProfileAnswers }) =>
      investmentApi.analyzeProfile(accountId, answers),
    onSuccess: (_, variables) => {
      // Invalidate overview to reflect new profile
      queryClient.invalidateQueries({ queryKey: ['investment', 'overview', variables.accountId] })
      queryClient.invalidateQueries({ queryKey: ['investment', 'recommendations', variables.accountId] })
    }
  })
}

export function useCreateChatSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (accountId: string) => investmentApi.createChatSession(accountId),
    onSuccess: (_, accountId) => {
      queryClient.invalidateQueries({ queryKey: ['investment', 'chat', accountId] })
    }
  })
}

export function useSendChatMessage(accountId: string, sessionId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (message: string) => investmentApi.sendChatMessage(accountId, sessionId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investment', 'chat', 'history', sessionId] })
    }
  })
}

export function useExplainConcept(accountId: string) {
  return useMutation({
    mutationFn: (concept: string) => investmentApi.explainConcept(accountId, concept)
  })
}

export function useUpdateEmergencyFundMonths() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ accountId, months }: { accountId: string; months: number }) =>
      investmentApi.updateEmergencyFundMonths(accountId, months),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['investment', 'overview', variables.accountId] })
    }
  })
}

export function useUpdateLiquidityReserve() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ accountId, amount }: { accountId: string; amount: number }) =>
      investmentApi.updateLiquidityReserve(accountId, amount),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['investment', 'overview', variables.accountId] })
    }
  })
}

// ========================
// Helper hooks
// ========================

export function useInvestmentData(accountId: string) {
  const overview = useInvestmentOverview(accountId)
  const marketPrices = useMarketPrices(accountId, { autoRefresh: false })

  return {
    overview,
    marketPrices,
    isLoading: overview.isLoading || marketPrices.isLoading,
    isError: overview.isError || marketPrices.isError,
    error: overview.error || marketPrices.error
  }
}
