'use client'

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { subcategories as subcategoriesApi, Subcategory, Transaction } from '@/lib/apiClient'
import {
  useTransactions,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from '@/lib/queries/transactions'
import { useCategories } from '@/lib/queries/categories'
import { useFiltersStore } from '@/stores/filtersStore'
import { Button, Input, Select, Modal, ModalFooter, Tabs, PageFilters, FilterSelect } from '@/components/ui'
import { Loader2, Search, Plus, Upload, Wallet, TrendingUp, TrendingDown } from 'lucide-react'
import { TransactionsSummary, ResponsiveTransactionTable, CategoryChangeModal } from '@/components/transactions'
import { useTransactionsStore } from '@/stores/transactionsStore'

interface TransactionForm {
  description: string
  date: string
  amount: string
  type: 'expense' | 'income'
  category_id: string
  subcategory_id: string
}

const emptyForm: TransactionForm = {
  description: '',
  date: new Date().toISOString().split('T')[0],
  amount: '',
  type: 'expense',
  category_id: '',
  subcategory_id: '',
}

function TransactionsPageFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-5 w-5 animate-spin text-text-secondary" />
      <span className="ml-2 text-text-secondary">Cargando...</span>
    </div>
  )
}

interface TransactionsClientProps {
  initialTransactions?: Transaction[]
  initialTotal?: number
  initialCategories?: any[]
}

export default function TransactionsClient({ initialTransactions, initialTotal, initialCategories }: TransactionsClientProps) {
  return (
    <Suspense fallback={<TransactionsPageFallback />}>
      <TransactionsContent
        initialTransactions={initialTransactions}
        initialTotal={initialTotal}
        initialCategories={initialCategories}
      />
    </Suspense>
  )
}

function TransactionsContent({
  initialTransactions,
  initialTotal,
  initialCategories,
}: TransactionsClientProps) {
  const { account } = useAuth()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  
  const { 
    page, 
    setPage, 
    isCreateModalOpen, 
    setCreateModalOpen, 
    isCategoryModalOpen, 
    setCategoryModalOpen,
    period,
    setPeriod,
    customStartDate,
    customEndDate,
    setCustomDates,
    reset: resetTransactions
  } = useTransactionsStore()

  const { 
    selectedYear, 
    selectedMonth, 
    selectedCategory, 
    selectedType, 
    setCategory,
    setYear,
    setMonth,
    setType,
    reset: resetFilters
  } = useFiltersStore()
  const searchTerm = searchParams.get('search') || ''

  const hasActiveFilters = 
    selectedMonth !== null || 
    (selectedYear !== null && selectedYear !== new Date().getFullYear()) || 
    selectedCategory !== '' || 
    searchTerm !== '' ||
    selectedType !== 'all' ||
    period !== 'monthly'

  const updateUrl = useCallback((updates: { 
    search?: string;
  }) => {
    const params = new URLSearchParams(searchParams.toString())
    if (updates.search !== undefined) {
      if (updates.search) params.set('search', updates.search)
      else params.delete('search')
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, router, pathname])

  const [localSearch, setLocalSearch] = useState(searchTerm)

  // Sync local search with URL when URL changes (e.g. on clear or back nav)
  useEffect(() => {
    setLocalSearch(searchTerm)
  }, [searchTerm])

  // Debounced update of the URL
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchTerm) {
        updateUrl({ search: localSearch })
      }
    }, 600) // 600ms delay for performance

    return () => clearTimeout(timer)
  }, [localSearch, searchTerm, updateUrl])

  const clearFilters = () => {
    resetFilters()
    resetTransactions()
    updateUrl({ search: '' })
  }

  const handleDateRangeChange = (startDate: string, endDate: string) => {
    setCustomDates(startDate, endDate)
    setPeriod('custom')
    // Exclusión mutua
    setYear(null)
    setMonth(null)
  }


  const activeTab = selectedType

  const tabsList = [
    { id: 'all', label: 'Todas', icon: <Wallet className="h-4 w-4" /> },
    { id: 'income', label: 'Ingresos', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'expense', label: 'Gastos', icon: <TrendingDown className="h-4 w-4" /> },
  ]

  const limit = 100
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TransactionForm>(emptyForm)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [subcategoryList, setSubcategoryList] = useState<Subcategory[]>([])

  const startDate = period === 'custom' && customStartDate ? customStartDate : (
    selectedMonth !== null
      ? new Date(selectedYear ?? new Date().getFullYear(), selectedMonth, 1).toISOString().split('T')[0]
      : new Date(selectedYear ?? new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
  )

  
  const endDate = period === 'custom' && customEndDate ? customEndDate : (
    selectedMonth !== null
      ? new Date(selectedYear ?? new Date().getFullYear(), selectedMonth + 1, 0).toISOString().split('T')[0]
      : new Date(selectedYear ?? new Date().getFullYear(), 11, 31).toISOString().split('T')[0]
  )


  const { data: txData, isLoading: isLoadingTx } = useTransactions({
    account_id: account?.id || '',
    start_date: startDate,
    end_date: endDate,
    type: selectedType === 'all' ? undefined : (selectedType as any),
    search: searchTerm,
    subcategory_id: selectedCategory || undefined,
    limit,
    offset: (page - 1) * limit,
  }, {
    initialData: initialTransactions && page === 1 && !hasActiveFilters
      ? { transactions: initialTransactions, total: initialTotal || 0, limit, offset: 0 }
      : undefined,
  })

  // No local filtering needed anymore as we pass subcategory_id to the API
  const filteredTransactions = txData?.transactions || []

  const totals = useMemo(() => {
    const txs = filteredTransactions
    const income = txs.filter(t => t.amount > 0).reduce((acc, t) => acc + Number(t.amount || 0), 0)
    const expenses = txs.filter(t => t.amount < 0).reduce((acc, t) => acc + Math.abs(Number(t.amount || 0)), 0)

    return { income, expenses }
  }, [filteredTransactions])

  const { data: categoriesData } = useCategories(account?.id || '', {
    initialData: initialCategories ? { categories: initialCategories as any } : undefined,
    enabled: !!account?.id
  })



  
  const categories: any[] = categoriesData?.categories || []

  const categoryOptions = useMemo(() => {
    const options: any[] = [{ value: '', label: 'Todas las categorías' }]
    
    // Si no hay categorías, no devolvemos nada más que el default
    if (!categories || categories.length === 0) return options

    categories.forEach(cat => {
      // Add heading for category
      options.push({ value: `cat-${cat.id}`, label: cat.name, isHeading: true })
      
      const subs = cat.subcategories || []
      if (subs.length > 0) {
        subs.forEach((sub: any) => {
          options.push({ value: sub.id, label: sub.name, level: 1 })
        })
      }
    })
    
    return options
  }, [categories])
  useEffect(() => {
    setPage(1)
  }, [selectedMonth, selectedYear, selectedCategory, searchTerm, selectedType, period, customStartDate, customEndDate])

  const createMutation = useCreateTransaction()
  const updateMutation = useUpdateTransaction()
  const deleteMutation = useDeleteTransaction()

  useEffect(() => {
    if (form.category_id) {
      subcategoriesApi.getAll(form.category_id).then(res => {
        if (res.success) setSubcategoryList(res.subcategories)
      })
    } else {
      setSubcategoryList([])
    }
  }, [form.category_id])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!account) return
    
    createMutation.mutate({
      account_id: account.id,
      date: form.date,
      description: form.description,
      amount: parseFloat(form.amount) * (form.type === 'expense' ? -1 : 1),
      subcategory_id: form.subcategory_id || undefined
    }, {
      onSuccess: () => {
        setCreateModalOpen(false)
        setForm(emptyForm)
        invalidateTransactions()
      }
    })
  }

  const handleEdit = (tx: Transaction) => {
    setEditingId(tx.id)
    setForm({
      description: tx.description,
      date: tx.date.split('T')[0],
      amount: Math.abs(tx.amount).toString(),
      type: tx.amount < 0 ? 'expense' : 'income',
      category_id: '', // Need to find category from subcategory
      subcategory_id: tx.subcategory_id || '',
    })
    setCreateModalOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId) return

    updateMutation.mutate({
      id: editingId,
      data: {
        description: form.description,
        date: form.date,
        amount: parseFloat(form.amount) * (form.type === 'expense' ? -1 : 1),
        subcategory_id: form.subcategory_id || null
      }
    }, {
      onSuccess: () => {
        setCreateModalOpen(false)
        setEditingId(null)
        setForm(emptyForm)
        invalidateTransactions()
      }
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta transacción?')) return
    deleteMutation.mutate(id, {
      onSuccess: () => invalidateTransactions(),
    })
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const invalidateTransactions = () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
  }

  const handleCategoryClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setCategoryModalOpen(true)
  }

  return (
    <div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6">
      <div className="relative">
        <Tabs
          tabs={tabsList}
          activeTab={activeTab}
          onChange={(id) => setType(id as any)}
          variant="underline-responsive"
          rightContent={
            <PageFilters
              showMonthSelect
              selectedMonth={selectedMonth}
              onMonthChange={setMonth}
              showYearSelect
              year={selectedYear}
              onYearChange={(y) => {
                setYear(y)
                if (y !== null) setMonth(null)
              }}
              showDatePicker

              startDate={period === 'custom' ? customStartDate : undefined}
              endDate={period === 'custom' ? customEndDate : undefined}
              onDatesChange={handleDateRangeChange}
              showClear={hasActiveFilters}
              onClear={clearFilters}
              className="ml-auto"
            />
          }
        />
      </div>

      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 p-4 border-b border-border bg-layer-1/50 relative z-20">
        {/* Búsqueda - 50% de ancho en desktop */}
        <div className="w-full md:w-1/2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Buscar por descripción..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-9 h-10 w-full"
          />
        </div>

        
        {/* Acciones y Filtros - Alineados a la derecha */}
        <div className="flex flex-wrap items-center justify-end gap-2 flex-1 min-w-0">
          <FilterSelect
            options={categoryOptions}
            value={selectedCategory}
            onChange={(e) => setCategory(e.target.value)}
            className="min-w-[200px] max-w-full h-10"
          />

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-10 px-4 shrink-0 flex items-center gap-2"
              onClick={() => router.push('/import')}
            >
              <Upload className="h-4 w-4" />
              <span className="hidden lg:inline">Importar</span>
            </Button>

            
            <Button 
              onClick={() => setCreateModalOpen(true)} 
              size="sm" 
              className="h-10 px-4 shrink-0 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden xl:inline">Nueva Transacción</span>
              <span className="xl:hidden">Nuevo</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        <TransactionsSummary totals={totals} />

        <ResponsiveTransactionTable
          transactions={filteredTransactions}
          total={txData?.total || 0}
          page={page}
          totalPages={Math.ceil((txData?.total || 0) / limit)}
          onPageChange={handlePageChange}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCategoryClick={handleCategoryClick}
          isLoading={isLoadingTx}
        />
      </div>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setCreateModalOpen(false)
          setEditingId(null)
          setForm(emptyForm)
        }}
        title={editingId ? 'Editar Transacción' : 'Nueva Transacción'}
      >
        <form onSubmit={editingId ? handleUpdate : handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <Select
                options={[
                  { value: 'expense', label: 'Gasto' },
                  { value: 'income', label: 'Ingreso' },
                ]}
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as any })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha</label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Importe</label>
            <div className="relative">
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="pr-8"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Categoría</label>
              <Select
                options={[
                  { value: '', label: 'Seleccionar...' },
                  ...categories.map(c => ({ value: c.id, label: c.name }))
                ]}
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value, subcategory_id: '' })}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Subcategoría</label>
              <Select
                options={[
                  { value: '', label: 'Seleccionar...' },
                  ...subcategoryList.map(s => ({ value: s.id, label: s.name }))
                ]}
                value={form.subcategory_id}
                onChange={(e) => setForm({ ...form, subcategory_id: e.target.value })}
                disabled={!form.category_id}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Descripción</label>
            <Input
              placeholder="Ej: Alquiler enero"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>
              {editingId ? 'Guardar Cambios' : 'Crear Transacción'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {account && (
        <CategoryChangeModal
          isOpen={isCategoryModalOpen}
          onClose={() => {
            setCategoryModalOpen(false)
            setSelectedTransaction(null)
          }}
          transaction={selectedTransaction}
          accountId={account.id}
          onSuccess={() => invalidateTransactions()}
        />
      )}
    </div>
  )
}
