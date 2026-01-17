// components/transactions/TransactionsToolbar.tsx

'use client'

import { useRouter } from 'next/navigation'
import { useFiltersStore } from '@/stores/filtersStore'
import { Button } from '@/components/ui'
import { Search, Plus, Upload } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

const months = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
]

const currentYear = new Date().getFullYear()
const years = Array.from({ length: currentYear - 2020 + 2 }, (_, i) => 2020 + i)

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

  const selectClass = "h-9 px-2 bg-layer-1 border border-layer-3 text-text-primary text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"

  return (
    <div className="space-y-2 mb-6">
      {/* Row 1: Search + Month + Year + Actions */}
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full h-9 pl-10 pr-3 text-sm rounded-lg border border-layer-3 bg-layer-1 text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <select
          value={selectedMonth !== null ? String(selectedMonth) : ''}
          onChange={(e) => setMonth(e.target.value === '' ? null : parseInt(e.target.value, 10))}
          className={`${selectClass} w-[85px]`}
        >
          <option value="">Año</option>
          {months.map((m, index) => (
            <option key={index} value={index}>{m}</option>
          ))}
        </select>

        <select
          value={String(selectedYear)}
          onChange={(e) => setYear(parseInt(e.target.value, 10))}
          className={`${selectClass} w-[75px]`}
        >
          {years.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>

        <Button variant="outline" size="sm" onClick={() => router.push('/import')} className="h-9 px-2 sm:px-3">
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
        <div className="inline-flex bg-layer-2 rounded-lg p-1">
          <button
            onClick={() => setType('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              selectedType === 'all'
                ? 'bg-layer-1 text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setType('income')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              selectedType === 'income'
                ? 'bg-success text-white'
                : 'text-text-secondary hover:text-success'
            }`}
          >
            Ingresos
          </button>
          <button
            onClick={() => setType('expense')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              selectedType === 'expense'
                ? 'bg-danger text-white'
                : 'text-text-secondary hover:text-danger'
            }`}
          >
            Gastos
          </button>
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setCategory(e.target.value)}
          className={selectClass}
        >
          {categoryOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
