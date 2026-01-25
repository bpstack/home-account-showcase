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
  
  setPage: (page: number) => void
  setCreateModalOpen: (open: boolean) => void
  setCategoryModalOpen: (open: boolean) => void
  setPeriod: (period: 'monthly' | 'yearly' | 'custom') => void
  setCustomDates: (startDate: string, endDate: string) => void
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
      partialize: (state) => ({
        page: state.page,
        period: state.period,
        customStartDate: state.customStartDate,
        customEndDate: state.customEndDate,
      }),

    }
  )
)
