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

interface FiltersState {
  selectedYear: number | null
  selectedMonth: number | null
  selectedCategory: string
  selectedType: 'all' | 'income' | 'expense'

  setYear: (_year: number | null) => void
  setMonth: (_month: number | null) => void
  setCategory: (_category: string) => void
  setType: (_type: 'all' | 'income' | 'expense') => void
  reset: () => void
}

const now = new Date()
const currentYear = now.getFullYear()
const currentMonth = now.getMonth()

export const useFiltersStore = create<FiltersState>()(
  // In memory only: the app always opens on the current month with no filters. Values kept in
  // localStorage by earlier versions ('filters-storage') are no longer read.
  (set) => ({
    // Pages open on the current month
    selectedYear: currentYear,
    selectedMonth: currentMonth,
    selectedCategory: '',
    selectedType: 'all',

    setYear: (year) =>
      set({
        selectedYear: year,
        // Al seleccionar un año, si el mes es null (Período previo), lo mantenemos o lo forzamos?
        // El requisito dice: al elegir año se asigna "Todos" (null)
      }),
    setMonth: (month) =>
      set((state) => ({
        selectedMonth: month,
        // Si eliges un mes y no hay año, forzamos el actual
        selectedYear:
          month !== null && state.selectedYear === null ? currentYear : state.selectedYear,
      })),
    setCategory: (category) => set({ selectedCategory: category }),
    setType: (type) => set({ selectedType: type }),

    reset: () =>
      set({
        selectedYear: currentYear,
        selectedMonth: currentMonth,
        selectedCategory: '',
        selectedType: 'all',
      }),
  })
)
