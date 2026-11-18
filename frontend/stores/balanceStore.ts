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
      // The period is not kept between visits (see filtersStore)
      version: 1,
      // Version 0 also kept the period; drop it so an old period is not restored
      migrate: (persisted, version) => {
        const old = (persisted ?? {}) as Record<string, unknown>
        return version === 0 ? { activeTab: old.activeTab } : old
      },
      partialize: (state) => ({
        activeTab: state.activeTab,
      }),
    }
  )
)
