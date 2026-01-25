// stores/filtersStore.ts - Filtros UI en Zustand
/**
 * PATRÓN DE ARQUITECTURA DE FILTROS UI - NO BORRAR ESTE COMENTARIO BAJO NINGÚN CONCEPTO.
 *
 * - Zustand es la fuente de verdad de todos los filtros UI.
 * - Los filtros representan la intención del usuario y el contexto de navegación.
 *
 * SINCRONIZACIÓN CON URL
 * - La URL NO es una store.
 * - La URL se usa únicamente para compartir o restaurar intención.
 * - Por defecto, solo `search` se sincroniza con la URL.
 *
 * RAZÓN:
 * - `search` explica el universo de datos mostrado.
 * - Otros filtros (año, mes, categoría, tipo) son contexto interno de la vista.
 * - Sincronizar todos los filtros con la URL genera acoplamiento innecesario,
 *   URLs frágiles y mayor complejidad de mantenimiento.
 *
 * EXCEPCIONES:
 * - La sincronización completa de filtros con la URL solo debe hacerse
 *   cuando exista un caso de uso explícito (reportes, auditoría, vistas compartidas).
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface FiltersState {
  selectedYear: number | null
  selectedMonth: number | null
  selectedCategory: string
  selectedType: 'all' | 'income' | 'expense'

  setYear: (year: number | null) => void
  setMonth: (month: number | null) => void
  setCategory: (category: string) => void
  setType: (type: 'all' | 'income' | 'expense') => void
  reset: () => void
}


const currentYear = new Date().getFullYear()

export const useFiltersStore = create<FiltersState>()(
  persist(
    (set) => ({
      selectedYear: currentYear,
      selectedMonth: null,
      selectedCategory: '',
      selectedType: 'all',

      setYear: (year) => set({ 
        selectedYear: year,
        // Al seleccionar un año, si el mes es null (Período previo), lo mantenemos o lo forzamos?
        // El requisito dice: al elegir año se asigna "Todos" (null)
      }),
      setMonth: (month) => set((state) => ({ 
        selectedMonth: month,
        // Si eliges un mes y no hay año, forzamos el actual
        selectedYear: month !== null && state.selectedYear === null ? currentYear : state.selectedYear
      })),
      setCategory: (category) => set({ selectedCategory: category }),
      setType: (type) => set({ selectedType: type }),

      reset: () =>
        set({
          selectedYear: currentYear,
          selectedMonth: null,
          selectedCategory: '',
          selectedType: 'all',
        }),
    }),

    {
      name: 'filters-storage',
      partialize: (state) => ({
        selectedYear: state.selectedYear,
        selectedMonth: state.selectedMonth,
        selectedCategory: state.selectedCategory,
        selectedType: state.selectedType,
      }),
    }
  )
)
