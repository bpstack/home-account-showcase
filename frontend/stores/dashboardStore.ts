// stores/dashboardStore.ts - Estado específico de Dashboard

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type DashboardTab = 'overview' | 'history' | 'stats' | 'investment'
export type DashboardPeriod = 'month' | 'year' | 'all' | 'custom'

interface DashboardState {
  activeTab: DashboardTab
  period: DashboardPeriod
  customStartDate: string
  customEndDate: string
  
  setActiveTab: (tab: DashboardTab) => void
  setPeriod: (period: DashboardPeriod) => void
  setCustomDates: (startDate: string, endDate: string) => void
  reset: () => void
}


export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      activeTab: 'overview',
      period: 'year',

      customStartDate: '',
      customEndDate: '',

      setActiveTab: (tab) => set({ activeTab: tab }),
      setPeriod: (period) => set({ period }),
      setCustomDates: (customStartDate, customEndDate) => set({ customStartDate, customEndDate }),

      reset: () =>
        set({
          activeTab: 'overview',
          period: 'year',

          customStartDate: '',
          customEndDate: '',
        }),

    }),
    {
      name: 'dashboard-storage',
      partialize: (state) => ({
        activeTab: state.activeTab,
        period: state.period,
        customStartDate: state.customStartDate,
        customEndDate: state.customEndDate,
      }),

    }
  )
)
