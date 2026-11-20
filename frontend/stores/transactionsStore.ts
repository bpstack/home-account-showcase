// stores/transactionsStore.ts - Estado específico de Transacciones

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface TransactionsState {
  page: number
  isCreateModalOpen: boolean
  isCategoryModalOpen: boolean
  period: 'monthly' | 'yearly' | 'custom'
  customStartDate: string
  customEndDate: string

  setPage: (_page: number) => void
  setCreateModalOpen: (_open: boolean) => void
  setCategoryModalOpen: (_open: boolean) => void
  setPeriod: (_period: 'monthly' | 'yearly' | 'custom') => void
  setCustomDates: (_startDate: string, _endDate: string) => void
  reset: () => void
}

export const useTransactionsStore = create<TransactionsState>()(
  persist(
    (set) => ({
      page: 1,
      isCreateModalOpen: false,
      isCategoryModalOpen: false,
      period: 'monthly',
      customStartDate: '',
      customEndDate: '',

      setPage: (page) => set({ page }),
      setCreateModalOpen: (isCreateModalOpen) => set({ isCreateModalOpen }),
      setCategoryModalOpen: (isCategoryModalOpen) => set({ isCategoryModalOpen }),
      setPeriod: (period) => set({ period }),
      setCustomDates: (customStartDate, customEndDate) => set({ customStartDate, customEndDate }),

      reset: () =>
        set({
          page: 1,
          isCreateModalOpen: false,
          isCategoryModalOpen: false,
          period: 'monthly',
          customStartDate: '',
          customEndDate: '',
        }),
    }),
    {
      name: 'transactions-storage',
      // The period is not kept between visits (see filtersStore)
      version: 1,
      // Version 0 also kept the period; drop it so an old period is not restored
      migrate: (persisted, version) => {
        const old = (persisted ?? {}) as Record<string, unknown>
        return version === 0 ? { page: old.page } : old
      },
      partialize: (state) => ({
        page: state.page,
      }),
    }
  )
)
