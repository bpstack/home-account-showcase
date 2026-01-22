// components/transactions/TransactionsToolbar.tsx

'use client'

import { useRouter } from 'next/navigation'
import { useFiltersStore } from '@/stores/filtersStore'
import { Button } from '@/components/ui'
import { FilterSelect } from '@/components/ui'
import { Search, Plus, Upload } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const currentYear = new Date().getFullYear()
const years = Array.from({ length: currentYear - 2020 + 2 }, (_, i) => 2020 + i)

interface TransactionsToolbarProps {
  categoryOptions: { value: string; label: string }[]
  onOpenCreateModal: () => void
}

export function TransactionsToolbar({
  categoryOptions,
  onOpenCreateModal,
}: TransactionsToolbarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchTerm = searchParams.get('search') || ''

  const {
    selectedYear,
    selectedMonth,
    selectedCategory,
    selectedType,
    setYear,
    setMonth,
    setCategory,
    setType,
  } = useFiltersStore()

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const params = new URLSearchParams(searchParams.toString())
    if (e.target.value) {
      params.set('search', e.target.value)
    } else {
      params.delete('search')
    }
    router.push(`/transactions?${params.toString()}`, { scroll: false })
  }

  const monthOptions = [
    { value: '', label: 'Mes' },
    ...months.map((m, index) => ({ value: String(index), label: m })),
  ]

  const yearOptions = years.map((year) => ({ value: String(year), label: String(year) }))

  return (
    <div className="space-y-2 mb-6">
      {/* Row 1: Search + Month + Year + Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-[2] min-w-[220px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full h-9 pl-10 pr-3 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <FilterSelect
          value={selectedMonth !== null ? String(selectedMonth) : ''}
          onChange={(e) => setMonth(e.target.value === '' ? null : parseInt(e.target.value, 10))}
          options={monthOptions}
          className="w-[135px]"
        />

        <FilterSelect
          value={String(selectedYear)}
          onChange={(e) => setYear(parseInt(e.target.value, 10))}
          options={yearOptions}
          className="w-[110px]"
        />

        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/import')}
          className="h-9 px-2 sm:px-3"
        >
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">Importar</span>
        </Button>
        <Button size="sm" onClick={onOpenCreateModal} className="h-9 px-2 sm:px-3">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">Nueva</span>
        </Button>
      </div>

      {/* Row 2: Type Filter + Category */}
      <div className="flex items-center gap-2">
        <div className="inline-flex bg-muted rounded-lg p-1">
          <button
            onClick={() => setType('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              selectedType === 'all'
                ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setType('income')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              selectedType === 'income'
                ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Ingresos
          </button>
          <button
            onClick={() => setType('expense')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              selectedType === 'expense'
                ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Gastos
          </button>
        </div>

        <FilterSelect
          value={selectedCategory}
          onChange={(e) => setCategory(e.target.value)}
          options={categoryOptions}
        />
      </div>
    </div>
  )
}
