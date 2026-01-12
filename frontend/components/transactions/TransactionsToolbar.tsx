// components/transactions/TransactionsToolbar.tsx

'use client'

import { useRouter } from 'next/navigation'
import { useFiltersStore } from '@/stores/filtersStore'
import { Button, Input, Select } from '@/components/ui'
import { Search, Plus, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

const months = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

interface TransactionsToolbarProps {
  categoryOptions: { value: string; label: string }[]
  onOpenCreateModal: () => void
}

export function TransactionsToolbar({ categoryOptions, onOpenCreateModal }: TransactionsToolbarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchTerm = searchParams.get('search') || ''

  const { selectedYear, selectedMonth, selectedCategory, selectedType, setYear, setMonth, setCategory, setType } =
    useFiltersStore()

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const params = new URLSearchParams(searchParams.toString())
    if (e.target.value) {
      params.set('search', e.target.value)
    } else {
      params.delete('search')
    }
    router.push(`/transactions?${params.toString()}`, { scroll: false })
  }

  const prevYear = () => setYear(selectedYear - 1)
  const nextYear = () => setYear(selectedYear + 1)

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setMonth(value === '' ? null : parseInt(value, 10))
  }

  const monthOptions = [
    { value: '', label: 'Elegir mes' },
    ...months.map((m, index) => ({ value: String(index), label: m })),
  ]

  return (
    <div className="flex flex-col gap-4 mb-6">
      {/* Line 1: Search | Type filter | Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex-1 relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <Input
            placeholder="Buscar transacciones..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-10 w-full"
          />
        </div>

        {/* Type Filter */}
        <div className="inline-flex items-center bg-layer-2 rounded-lg p-0.5">
          <button
            onClick={() => setType('all')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              selectedType === 'all'
                ? 'text-text-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Todos
          </button>
          <div className="w-px h-5 bg-layer-3 mx-0.5" />
          <button
            onClick={() => setType('income')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              selectedType === 'income' ? 'text-success' : 'text-text-secondary hover:text-success'
            }`}
          >
            Ingresos
          </button>
          <div className="w-px h-5 bg-layer-3 mx-0.5" />
          <button
            onClick={() => setType('expense')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              selectedType === 'expense' ? 'text-danger' : 'text-text-secondary hover:text-danger'
            }`}
          >
            Gastos
          </button>
        </div>

        <div className="flex gap-2 sm:ml-auto">
          <Button variant="outline" onClick={() => router.push('/import')}>
            <ExternalLink className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Importar</span>
          </Button>
          <Button onClick={onOpenCreateModal}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Nueva</span>
          </Button>
        </div>
      </div>

      {/* Line 2: Year | Month | Category */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* Year Selector */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={prevYear} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-text-primary min-w-[60px] text-center">
            {selectedYear}
          </span>
          <Button variant="ghost" size="icon" onClick={nextYear} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Month Selector */}
        <Select
          options={monthOptions}
          value={selectedMonth !== null ? String(selectedMonth) : ''}
          onChange={handleMonthChange}
          className="w-auto min-w-[140px]"
        />

        {/* Category Filter */}
        <Select
          options={categoryOptions}
          value={selectedCategory}
          onChange={(e) => setCategory(e.target.value)}
          className="w-auto min-w-[180px]"
        />
      </div>
    </div>
  )
}
