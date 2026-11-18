// stores/dashboardStore.ts - Estado específico de Dashboard

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type DashboardTab = 'overview' | 'history' | 'investment'
export type DashboardPeriod = 'month' | 'year' | 'all' | 'custom'

interface DashboardState {
  activeTab: DashboardTab
  period: DashboardPeriod
  customStartDate: string
  customEndDate: string

  setActiveTab: (_tab: DashboardTab) => void
  setPeriod: (_period: DashboardPeriod) => void
  setCustomDates: (_startDate: string, _endDate: string) => void
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
      // The period is not kept between visits (see filtersStore)
      version: 2,
      // Earlier versions kept the period (dropped) and had a 'stats' tab, now part of 'overview'
      migrate: (persisted) => {
        const old = (persisted ?? {}) as Record<string, unknown>
        return { activeTab: old.activeTab === 'stats' ? 'overview' : old.activeTab }
      },
      partialize: (state) => ({
        activeTab: state.activeTab,
      }),
    }
  )
)
