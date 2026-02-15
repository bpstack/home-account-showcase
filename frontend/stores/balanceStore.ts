// stores/balanceStore.ts - Estado específico de Balance

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface BalanceState {
  activeTab: 'balance' | 'income' | 'expenses'
  period: 'monthly' | 'yearly' | 'custom'
  customStartDate: string
  customEndDate: string

  setActiveTab: (_tab: 'balance' | 'income' | 'expenses') => void
  setPeriod: (_period: 'monthly' | 'yearly' | 'custom') => void
  setCustomDates: (_startDate: string, _endDate: string) => void
  reset: () => void
}

export const useBalanceStore = create<BalanceState>()(
  persist(
    (set) => ({
      activeTab: 'balance',
      period: 'monthly',
      customStartDate: '',
      customEndDate: '',

      setActiveTab: (tab) => set({ activeTab: tab }),
      setPeriod: (period) => set({ period }),
      setCustomDates: (startDate, endDate) =>
        set({
          customStartDate: startDate,
          customEndDate: endDate,
        }),

      reset: () =>
        set({
          activeTab: 'balance',
          period: 'monthly',
          customStartDate: '',
          customEndDate: '',
        }),
    }),
    {
      name: 'balance-storage',
      partialize: (state) => ({
        activeTab: state.activeTab,
        period: state.period,
        customStartDate: state.customStartDate,
        customEndDate: state.customEndDate,
      }),
    }
  )
)
