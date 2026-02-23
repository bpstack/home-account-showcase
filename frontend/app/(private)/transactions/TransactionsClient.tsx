'use client'

import { useState, useEffect, Suspense, useMemo, useDeferredValue } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { subcategories as subcategoriesApi, Subcategory, Transaction } from '@/lib/apiClient'
import {
  useTransactions,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  useBulkUpdateByIds,
  useTransactionStats,
} from '@/lib/queries/transactions'
import { useCategories } from '@/lib/queries/categories'
import { useFiltersStore } from '@/stores/filtersStore'
import {
  Button,
  Input,
  Select,
  Modal,
  ModalFooter,
  Tabs,
  PageFilters,
  FilterSelect,
  DatePickerSimple,
  ConfirmDeleteDialog,
} from '@/components/ui'
import { Loader2, Search, Plus, Upload, Wallet, TrendingUp, TrendingDown, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  TransactionsSummary,
  ResponsiveTransactionTable,
  CategoryChangeModal,
} from '@/components/transactions'
import { useTransactionsStore } from '@/stores/transactionsStore'
import { getTodayLocal } from '@/lib/date-utils'
import { validateTransaction } from '@/validators/transaction-validators'

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
  date: getTodayLocal(),
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

export default function TransactionsClient({
  initialTransactions,
  initialTotal,
  initialCategories,
}: TransactionsClientProps) {
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
  const router = useRouter()

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
    reset: resetTransactions,
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
    reset: resetFilters,
  } = useFiltersStore()
  const [localSearch, setLocalSearch] = useState('')
  const deferredSearch = useDeferredValue(localSearch)

  const searchTerm = deferredSearch

  const hasActiveFilters =
    selectedMonth !== null ||
    (selectedYear !== null && selectedYear !== new Date().getFullYear()) ||
    selectedCategory !== '' ||
    searchTerm !== '' ||
    selectedType !== 'all' ||
    period !== 'monthly'

  const clearFilters = () => {
    resetFilters()
    resetTransactions()
    setLocalSearch('')
  }

  const handleMonthChange = (month: number | null) => {
    setMonth(month)
    setPeriod(month === null ? 'yearly' : 'monthly')
    setCustomDates('', '')
  }

  const handleYearChange = (year: number | null) => {
    setYear(year)
    if (year !== null) {
      setMonth(null)
      setPeriod('yearly')
      setCustomDates('', '')
    }
  }

  const handleDateRangeChange = (startDate: string, endDate: string) => {
    setCustomDates(startDate, endDate)
    setPeriod('custom')
    setYear(null)
    setMonth(null)
  }

  const activeTab = selectedType

  const tabsList = [
    { id: 'all', label: 'Todas', icon: <Wallet className="h-4 w-4" /> },
    { id: 'income', label: 'Ingresos', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'expense', label: 'Gastos', icon: <TrendingDown className="h-4 w-4" /> },
  ]

  // When searching, load all transactions to search client-side (encrypted data)
  // Otherwise use pagination with limit of 100
  const isSearching = searchTerm.length > 0
  const limit = 100
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TransactionForm>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [subcategoryList, setSubcategoryList] = useState<Subcategory[]>([])

  // Calculate date range based on filters
  // When selectedYear is null and no month selected, show ALL transactions (no date filter)
  const startDate =
    period === 'custom' && customStartDate
      ? customStartDate
      : selectedMonth !== null
        ? new Date(selectedYear ?? new Date().getFullYear(), selectedMonth, 1)
            .toISOString()
            .split('T')[0]
        : selectedYear !== null
          ? new Date(selectedYear, 0, 1).toISOString().split('T')[0]
          : '2020-01-01' // Show all when no year selected

  const endDate =
    period === 'custom' && customEndDate
      ? customEndDate
      : selectedMonth !== null
        ? new Date(selectedYear ?? new Date().getFullYear(), selectedMonth + 1, 0)
            .toISOString()
            .split('T')[0]
        : selectedYear !== null
          ? new Date(selectedYear, 11, 31).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0] // Today when no year selected

  const { data: txData, isLoading: isLoadingTx } = useTransactions(
    {
      account_id: account?.id || '',
      start_date: startDate,
      end_date: endDate,
      type: selectedType === 'all' ? undefined : (selectedType as any),
      subcategory_id: selectedCategory || undefined,
      // When searching, fetch all transactions (no limit/offset) to search client-side
      // This is necessary because descriptions are encrypted and can't be searched on backend
      limit: isSearching ? 10000 : limit,
      offset: isSearching ? 0 : (page - 1) * limit,
    },
    {
      // Only use initialData when there are no active filters
      initialData:
        initialTransactions && page === 1 && !hasActiveFilters && !searchTerm
          ? { transactions: initialTransactions, total: initialTotal || 0, limit, offset: 0 }
          : undefined,
    }
  )

  // Client-side search filtering for encrypted data
  // When data is encrypted, backend search doesn't work, so we filter here
  const allFilteredTransactions = useMemo(() => {
    let txs = txData?.transactions || []

    // Client-side search filtering (needed for encrypted data)
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase()
      txs = txs.filter((t) => t.description.toLowerCase().includes(lowerSearch))
    }

    return txs
  }, [txData?.transactions, searchTerm])

  // When searching, we paginate the filtered results client-side
  // Otherwise, pagination is handled by the backend
  const filteredTransactions = useMemo(() => {
    if (!isSearching) return allFilteredTransactions

    // Client-side pagination of search results
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    return allFilteredTransactions.slice(startIndex, endIndex)
  }, [allFilteredTransactions, isSearching, page, limit])

  // Total count for pagination - use filtered count when searching
  const totalCount = isSearching ? allFilteredTransactions.length : txData?.total || 0
  const totalPages = Math.ceil(totalCount / limit)

  // Calculate totals: use server/stats for period, or filtered results if searching
  // Now supports category filtering too
  const { data: statsData } = useTransactionStats(account?.id || '', startDate, endDate, {
    enabled: !!account?.id && !isSearching,
    subcategory_id: selectedCategory || undefined,
  })

  const totals = useMemo(() => {
    // Only fallback to client-side calc if SEARCHING (because search happens client-side)
    if (isSearching) {
      const txs = allFilteredTransactions
      const income = txs
        .filter((t) => t.amount > 0)
        .reduce((acc, t) => acc + Number(t.amount || 0), 0)
      const expenses = txs
        .filter((t) => t.amount < 0)
        .reduce((acc, t) => acc + Math.abs(Number(t.amount || 0)), 0)
      return { income, expenses }
    }

    // Default: use the stats hook which fetches ALL transactions correctly
    if (statsData?.stats) {
      return {
        income: statsData.stats.income,
        expenses: statsData.stats.expenses,
      }
    }

    return { income: 0, expenses: 0 }
  }, [statsData, allFilteredTransactions, isSearching])

  const { data: categoriesData } = useCategories(account?.id || '', {
    initialData: initialCategories ? { categories: initialCategories as any } : undefined,
    enabled: !!account?.id,
  })

  const categories: any[] = useMemo(() => categoriesData?.categories || [], [categoriesData])

  const categoryOptions = useMemo(() => {
    const options: any[] = [{ value: '', label: 'Todas las categorías' }]

    // Si no hay categorías, no devolvemos nada más que el default
    if (!categories || categories.length === 0) return options

    categories.forEach((cat) => {
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
  }, [
    setPage,
    selectedMonth,
    selectedYear,
    selectedCategory,
    searchTerm,
    selectedType,
    period,
    customStartDate,
    customEndDate,
  ])

  const createMutation = useCreateTransaction()
  const updateMutation = useUpdateTransaction()
  const deleteMutation = useDeleteTransaction()
  const bulkUpdateByIdsMutation = useBulkUpdateByIds()

  // Dialog states for confirmations
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null)
  const [bulkIds, setBulkIds] = useState<string[]>([])

  useEffect(() => {
    if (form.category_id) {
      subcategoriesApi.getAll(form.category_id).then((res) => {
        if (res.success) setSubcategoryList(res.subcategories)
      })
    } else {
      setSubcategoryList([])
    }
  }, [form.category_id])

  // Delete handlers
  const handleDeleteClick = (id: string) => {
    setTransactionToDelete(id)
    setDeleteDialogOpen(true)
  }

  const restoreTransaction = (tx: Transaction) => {
    toast.promise(
      createMutation.mutateAsync({
        account_id: tx.account_id,
        date: tx.date.split('T')[0],
        description: tx.description,
        amount: Number(tx.amount),
        subcategory_id: tx.subcategory_id || undefined,
      }),
      {
        loading: 'Restaurando transacción...',
        success: () => {
          invalidateTransactions()
          return 'Transacción restaurada'
        },
        error: 'Error al restaurar la transacción',
      }
    )
  }

  const handleConfirmDelete = () => {
    if (!transactionToDelete) return
    const txToRestore = allFilteredTransactions.find((t) => t.id === transactionToDelete)

    toast.promise(deleteMutation.mutateAsync(transactionToDelete), {
      loading: 'Eliminando transacción...',
      success: () => {
        invalidateTransactions()
        setDeleteDialogOpen(false)
        return 'Transacción eliminada'
      },
      error: 'Error al eliminar la transacción',
      action: txToRestore
        ? {
            label: 'Deshacer',
            onClick: () => restoreTransaction(txToRestore),
          }
        : undefined,
    })
  }

  // Bulk delete handlers
  const handleBulkDeleteClick = (ids: string[]) => {
    setBulkIds(ids)
    setBulkDeleteDialogOpen(true)
  }

  const handleConfirmBulkDelete = () => {
    toast.promise(Promise.all(bulkIds.map((id) => deleteMutation.mutateAsync(id))), {
      loading: `Eliminando ${bulkIds.length} transacciones...`,
      success: () => {
        invalidateTransactions()
        setBulkDeleteDialogOpen(false)
        setBulkIds([])
        return `${bulkIds.length} transacciones eliminadas`
      },
      error: 'Error al eliminar algunas transacciones',
    })
  }

  // Bulk category change - works directly without modal
  const handleBulkCategoryChange = (ids: string[], categoryId: string, subcategoryId?: string) => {
    if (!account) return

    toast.promise(
      bulkUpdateByIdsMutation.mutateAsync({
        account_id: account.id,
        transaction_ids: ids,
        subcategory_id: subcategoryId || null,
      }),
      {
        loading: `Actualizando ${ids.length} categorías...`,
        success: () => {
          invalidateTransactions()
          return `Categoría actualizada en ${ids.length} transacciones`
        },
        error: 'Error al actualizar categorías',
      }
    )
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!account) return

    const validation = validateTransaction({
      type: form.type,
      date: form.date,
      description: form.description,
      amount: form.amount,
      category_id: form.category_id,
      subcategory_id: form.subcategory_id,
    })

    if (!validation.success) {
      setFieldErrors(validation.errors)
      return
    }

    setFieldErrors({})

    toast.promise(
      createMutation.mutateAsync({
        account_id: account.id,
        date: form.date,
        description: form.description,
        amount: parseFloat(form.amount) * (form.type === 'expense' ? -1 : 1),
        subcategory_id: form.subcategory_id || undefined,
      }),
      {
        loading: 'Creando transacción...',
        success: () => {
          setCreateModalOpen(false)
          setForm(emptyForm)
          invalidateTransactions()
          return 'Transacción creada correctamente'
        },
        error: 'Error al crear la transacción',
      }
    )
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

    const validation = validateTransaction({
      type: form.type,
      date: form.date,
      description: form.description,
      amount: form.amount,
      category_id: form.category_id,
      subcategory_id: form.subcategory_id,
    })

    if (!validation.success) {
      setFieldErrors(validation.errors)
      return
    }

    setFieldErrors({})

    toast.promise(
      updateMutation.mutateAsync({
        id: editingId,
        accountId: account!.id,
        data: {
          description: form.description,
          date: form.date,
          amount: parseFloat(form.amount) * (form.type === 'expense' ? -1 : 1),
          subcategory_id: form.subcategory_id || null,
        },
      }),
      {
        loading: 'Actualizando transacción...',
        success: () => {
          setCreateModalOpen(false)
          setEditingId(null)
          setForm(emptyForm)
          invalidateTransactions()
          return 'Transacción actualizada correctamente'
        },
        error: 'Error al actualizar la transacción',
      }
    )
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
              onMonthChange={handleMonthChange}
              showYearSelect
              year={selectedYear}
              onYearChange={handleYearChange}
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

      <div className="flex items-center justify-between px-2 md:px-8 py-3 md:py-4 border-b border-border bg-layer-1/50 relative z-20">
        <FilterSelect
          options={categoryOptions}
          value={selectedCategory}
          onChange={(e) => setCategory(e.target.value)}
          className="h-9 md:h-10 max-w-[200px]"
        />

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 md:h-10 px-4 shrink-0 flex items-center gap-2"
            onClick={() => router.push('/import')}
          >
            <Upload className="h-4 w-4" />
            <span className="hidden lg:inline">Importar</span>
          </Button>

          <Button
            onClick={() => setCreateModalOpen(true)}
            size="sm"
            className="h-9 md:h-10 px-4 shrink-0 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden xl:inline">Nueva Transacción</span>
            <span className="xl:hidden">Nuevo</span>
          </Button>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        <TransactionsSummary totals={totals} />

        {/* Buscador integrado en la tabla */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Buscar por descripción..."
            value={localSearch || ''}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-9 pr-8 h-10 w-full"
          />
          {localSearch && (
            <button
              onClick={() => setLocalSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <ResponsiveTransactionTable
          transactions={filteredTransactions}
          total={totalCount}
          page={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          onCategoryClick={handleCategoryClick}
          onBulkDelete={handleBulkDeleteClick}
          onBulkCategoryChange={handleBulkCategoryChange}
          categories={categories}
          isLoading={isLoadingTx}
        />

        {/* Confirmation Dialogs */}
        <ConfirmDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="¿Eliminar transacción?"
          itemName="esta transacción"
          onConfirm={handleConfirmDelete}
        />

        <ConfirmDeleteDialog
          open={bulkDeleteDialogOpen}
          onOpenChange={setBulkDeleteDialogOpen}
          title={`¿Eliminar ${bulkIds.length} transacciones?`}
          itemName={`${bulkIds.length} transacciones`}
          onConfirm={handleConfirmBulkDelete}
        />

        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setCreateModalOpen(false)
            setEditingId(null)
            setForm(emptyForm)
            setFieldErrors({})
          }}
          title={editingId ? 'Editar transacción' : 'Nueva transacción'}
        >
          <form onSubmit={editingId ? handleUpdate : handleCreate} className="space-y-5">
            {/* Tipo — toggle buttons */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: 'expense' })}
                  className={`h-10 rounded-xl text-sm font-medium transition-all duration-200 border-2 flex items-center justify-center gap-2 ${
                    form.type === 'expense'
                      ? 'bg-red-500/10 border-red-500 text-red-600 dark:text-red-400'
                      : 'bg-muted/50 border-transparent text-muted-foreground hover:border-border'
                  }`}
                >
                  <TrendingDown className="w-4 h-4" />
                  Gasto
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: 'income' })}
                  className={`h-10 rounded-xl text-sm font-medium transition-all duration-200 border-2 flex items-center justify-center gap-2 ${
                    form.type === 'income'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'bg-muted/50 border-transparent text-muted-foreground hover:border-border'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  Ingreso
                </button>
              </div>
            </div>

            {/* Importe + Fecha */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Importe</label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => {
                      setForm({ ...form, amount: e.target.value })
                      if (fieldErrors.amount) {
                        setFieldErrors((prev) => ({ ...prev, amount: '' }))
                      }
                    }}
                    className={`pr-8 ${fieldErrors.amount ? 'border-red-500 focus:border-red-500' : ''}`}
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    €
                  </span>
                </div>
                {fieldErrors.amount && <p className="text-xs text-red-500">{fieldErrors.amount}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha</label>
                <DatePickerSimple
                  value={form.date}
                  onChange={(date) => setForm({ ...form, date })}
                />
              </div>
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción</label>
              <Input
                placeholder="Ej: Alquiler enero"
                value={form.description}
                onChange={(e) => {
                  setForm({ ...form, description: e.target.value })
                  if (fieldErrors.description) {
                    setFieldErrors((prev) => ({ ...prev, description: '' }))
                  }
                }}
                className={fieldErrors.description ? 'border-red-500 focus:border-red-500' : ''}
                required
              />
              {fieldErrors.description && (
                <p className="text-xs text-red-500">{fieldErrors.description}</p>
              )}
            </div>

            {/* Categoría + Subcategoría */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Categoría</label>
                <Select
                  options={[
                    { value: '', label: 'Seleccionar...' },
                    ...categories.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                  value={form.category_id}
                  onChange={(e) => {
                    setForm({ ...form, category_id: e.target.value, subcategory_id: '' })
                    if (fieldErrors.category_id) {
                      setFieldErrors((prev) => ({ ...prev, category_id: '' }))
                    }
                  }}
                  error={fieldErrors.category_id}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Subcategoría</label>
                <Select
                  options={[
                    { value: '', label: 'Seleccionar...' },
                    ...subcategoryList.map((s) => ({ value: s.id, label: s.name })),
                  ]}
                  value={form.subcategory_id}
                  onChange={(e) => setForm({ ...form, subcategory_id: e.target.value })}
                  disabled={!form.category_id}
                />
              </div>
            </div>

            <ModalFooter>
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                isLoading={createMutation.isPending || updateMutation.isPending}
              >
                {editingId ? 'Guardar cambios' : 'Crear transacción'}
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
            allTransactions={txData?.transactions || []}
            onSuccess={() => invalidateTransactions()}
          />
        )}
      </div>
    </div>
  )
}
