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
  PeriodSelector,
  DatePickerSimple,
  ConfirmDeleteDialog,
  Figures,
  Sheet,
} from '@/components/ui'
import { Loader2, Search, Plus, SlidersHorizontal, TrendingUp, TrendingDown, X } from 'lucide-react'
import { toast } from 'sonner'
import { CategoryChangeModal } from '@/components/transactions'
import { TxList } from '@/components/transactions/TxList'
import { useTransactionsStore } from '@/stores/transactionsStore'
import { getTodayLocal } from '@/lib/date-utils'
import { periodLabel, periodRange, toPeriod, toYearMonth, type Period } from '@/lib/period'
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
  } = useFiltersStore()
  const [localSearch, setLocalSearch] = useState('')
  const deferredSearch = useDeferredValue(localSearch)

  const searchTerm = deferredSearch

  // The period is always set (PeriodSelector); these are the filters on top of it
  const hasActiveFilters = selectedCategory !== '' || searchTerm !== '' || selectedType !== 'all'

  const periodValue = toPeriod(
    selectedYear,
    selectedMonth,
    period === 'custom' ? { start: customStartDate, end: customEndDate } : null
  )
  const isCurrentMonth =
    periodValue.kind === 'month' &&
    periodValue.year === new Date().getFullYear() &&
    periodValue.month === new Date().getMonth()

  const handlePeriodChange = (next: Period) => {
    const { year, month } = toYearMonth(next)
    setYear(year)
    setMonth(month)
    setPeriod(next.kind === 'range' ? 'custom' : next.kind === 'month' ? 'monthly' : 'yearly')
    setCustomDates(next.kind === 'range' ? next.start : '', next.kind === 'range' ? next.end : '')
    setPage(1)
  }

  // When searching, load all transactions to search client-side (encrypted data)
  // Otherwise use pagination with limit of 100
  const isSearching = searchTerm.length > 0
  const limit = 100
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TransactionForm>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [subcategoryList, setSubcategoryList] = useState<Subcategory[]>([])

  const { start: startDate, end: endDate } = periodRange(periodValue)

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
        // The server prefetches the current month with no other filter
        initialTransactions && page === 1 && isCurrentMonth && !hasActiveFilters
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

  // Filters panel, selection mode and bulk category change
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkCategoryOpen, setBulkCategoryOpen] = useState(false)
  const [bulkCategory, setBulkCategory] = useState({ categoryId: '', subcategoryId: '' })

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const stopSelecting = () => {
    setSelecting(false)
    setSelectedIds(new Set())
  }
  const allVisibleSelected =
    filteredTransactions.length > 0 && filteredTransactions.every((t) => selectedIds.has(t.id))

  const subcategoryName = (id: string): string => {
    for (const cat of categories) {
      const sub = (cat.subcategories || []).find((s: Subcategory) => s.id === id)
      if (sub) return `${cat.name} / ${sub.name}`
    }
    return 'Categoría'
  }
  const activeFilterCount = (selectedType !== 'all' ? 1 : 0) + (selectedCategory ? 1 : 0)
  const bulkSubcategories =
    categories.find((c) => c.id === bulkCategory.categoryId)?.subcategories || []

  return (
    // A ledger reads best in a column: concept and amount stay within reach of each other
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Period and the one main action */}
      <div className="flex items-center justify-between gap-3">
        <PeriodSelector value={periodValue} onChange={handlePeriodChange} className="-ml-2" />
        <Button onClick={() => setCreateModalOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span className="sm:hidden">Nueva</span>
          <span className="hidden sm:inline">Nueva transacción</span>
        </Button>
      </div>

      <Figures income={totals.income} expenses={totals.expenses} />

      {/* Toolbar: search, filters, selection; or the bulk actions while selecting */}
      {selecting ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-layer-3 bg-layer-1 p-2">
          <label className="flex items-center gap-2 px-2 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={() =>
                setSelectedIds(
                  allVisibleSelected ? new Set() : new Set(filteredTransactions.map((t) => t.id))
                )
              }
              className="h-4 w-4 accent-[hsl(var(--accent))]"
            />
            {selectedIds.size === 1 ? '1 seleccionada' : `${selectedIds.size} seleccionadas`}
          </label>
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={selectedIds.size === 0}
              onClick={() => setBulkCategoryOpen(true)}
            >
              Cambiar categoría
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={selectedIds.size === 0}
              onClick={() => handleBulkDeleteClick([...selectedIds])}
              className="text-danger"
            >
              Eliminar
            </Button>
            <Button variant="ghost" size="sm" onClick={stopSelecting}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
                aria-hidden="true"
              />
              <Input
                type="search"
                placeholder="Buscar por concepto"
                aria-label="Buscar por concepto"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" onClick={() => setFiltersOpen(true)} className="shrink-0">
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Filtros</span>
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-accent px-1.5 text-xs text-accent-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setSelecting(true)}
              className="hidden shrink-0 sm:inline-flex"
              disabled={filteredTransactions.length === 0}
            >
              Seleccionar
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            {selectedType !== 'all' && (
              <button
                type="button"
                onClick={() => setType('all')}
                className="inline-flex items-center gap-1 rounded-full border border-layer-3 px-3 py-1 text-text-primary hover:bg-layer-2"
                aria-label={`Quitar filtro ${selectedType === 'income' ? 'Ingresos' : 'Gastos'}`}
              >
                {selectedType === 'income' ? 'Ingresos' : 'Gastos'}
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            {selectedCategory && (
              <button
                type="button"
                onClick={() => setCategory('')}
                className="inline-flex items-center gap-1 rounded-full border border-layer-3 px-3 py-1 text-text-primary hover:bg-layer-2"
                aria-label={`Quitar filtro ${subcategoryName(selectedCategory)}`}
              >
                {subcategoryName(selectedCategory)}
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            <span className="text-text-secondary" aria-live="polite">
              {totalCount === 1 ? '1 transacción' : `${totalCount} transacciones`}
            </span>
          </div>
        </div>
      )}

      {isLoadingTx ? (
        <p className="flex items-center justify-center gap-2 py-12 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Cargando transacciones
        </p>
      ) : filteredTransactions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-layer-3 px-6 py-12 text-center">
          <p className="text-sm text-text-primary">
            {localSearch || activeFilterCount > 0
              ? 'Ninguna transacción coincide con la búsqueda y los filtros.'
              : `No hay transacciones en ${periodLabel(periodValue).toLowerCase()}.`}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            {localSearch || activeFilterCount > 0 ? (
              <Button
                variant="outline"
                onClick={() => {
                  setLocalSearch('')
                  setType('all')
                  setCategory('')
                }}
              >
                Quitar búsqueda y filtros
              </Button>
            ) : (
              <Button variant="outline" onClick={() => router.push('/import')}>
                Importar un extracto
              </Button>
            )}
          </div>
        </div>
      ) : (
        <TxList
          transactions={filteredTransactions}
          selecting={selecting}
          selectedIds={selectedIds}
          onToggle={toggleSelected}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          onCategoryClick={handleCategoryClick}
        />
      )}

      {totalPages > 1 && (
        <nav aria-label="Páginas" className="flex items-center justify-between text-sm">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
          >
            Anterior
          </Button>
          <span className="text-text-secondary">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => handlePageChange(page + 1)}
          >
            Siguiente
          </Button>
        </nav>
      )}

      <Sheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filtros"
        footer={
          <>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setType('all')
                setCategory('')
              }}
            >
              Quitar filtros
            </Button>
            <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
              Ver {totalCount === 1 ? '1 transacción' : `${totalCount} transacciones`}
            </Button>
          </>
        }
      >
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-text-primary">Tipo</legend>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-layer-2 p-1">
            {(
              [
                ['all', 'Todas'],
                ['income', 'Ingresos'],
                ['expense', 'Gastos'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setType(value)}
                aria-pressed={selectedType === value}
                className={`h-9 rounded-md text-sm ${
                  selectedType === value
                    ? 'bg-layer-1 font-medium text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Options listed in the panel itself: a native dropdown of ~60 options opened near the
            bottom of the screen and was cut off */}
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-text-primary">Categoría</legend>
          <div className="divide-y divide-layer-3 border-y border-layer-3">
            <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm text-text-primary">
              Todas las categorías
              <input
                type="radio"
                name="filter-category"
                checked={selectedCategory === ''}
                onChange={() => setCategory('')}
                className="h-4 w-4 accent-[hsl(var(--accent))]"
              />
            </label>
            {categories.map((cat) => (
              <div key={cat.id} role="group" aria-label={cat.name}>
                <p className="pb-1 pt-3 text-xs text-text-secondary">{cat.name}</p>
                {(cat.subcategories || []).map((sub: Subcategory) => (
                  <label
                    key={sub.id}
                    className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm text-text-primary"
                  >
                    {sub.name}
                    <input
                      type="radio"
                      name="filter-category"
                      checked={selectedCategory === sub.id}
                      onChange={() => setCategory(sub.id)}
                      className="h-4 w-4 accent-[hsl(var(--accent))]"
                    />
                  </label>
                ))}
              </div>
            ))}
          </div>
        </fieldset>
      </Sheet>

      <Sheet
        open={bulkCategoryOpen}
        onClose={() => setBulkCategoryOpen(false)}
        title={`Cambiar categoría de ${selectedIds.size}`}
        footer={
          <>
            <Button variant="outline" className="flex-1" onClick={() => setBulkCategoryOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="flex-1"
              disabled={!bulkCategory.categoryId}
              onClick={() => {
                handleBulkCategoryChange(
                  [...selectedIds],
                  bulkCategory.categoryId,
                  bulkCategory.subcategoryId || undefined
                )
                setBulkCategoryOpen(false)
                setBulkCategory({ categoryId: '', subcategoryId: '' })
                stopSelecting()
              }}
            >
              Cambiar
            </Button>
          </>
        }
      >
        <Select
          id="bulk-category"
          label="Categoría"
          options={[
            { value: '', label: 'Elegir…' },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
          ]}
          value={bulkCategory.categoryId}
          onChange={(e) => setBulkCategory({ categoryId: e.target.value, subcategoryId: '' })}
        />
        <Select
          id="bulk-subcategory"
          label="Subcategoría"
          options={[
            { value: '', label: 'Elegir…' },
            ...bulkSubcategories.map((sub: Subcategory) => ({ value: sub.id, label: sub.name })),
          ]}
          value={bulkCategory.subcategoryId}
          onChange={(e) => setBulkCategory({ ...bulkCategory, subcategoryId: e.target.value })}
          disabled={!bulkCategory.categoryId}
        />
      </Sheet>

      <div>
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
                  aria-pressed={form.type === 'expense'}
                  className={`h-10 rounded-md text-sm font-medium border flex items-center justify-center gap-2 ${
                    form.type === 'expense'
                      ? 'bg-danger/10 border-danger text-danger'
                      : 'border-layer-3 text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <TrendingDown className="w-4 h-4" />
                  Gasto
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: 'income' })}
                  aria-pressed={form.type === 'income'}
                  className={`h-10 rounded-md text-sm font-medium border flex items-center justify-center gap-2 ${
                    form.type === 'income'
                      ? 'bg-success/10 border-success text-success'
                      : 'border-layer-3 text-text-secondary hover:text-text-primary'
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
                    className={`pr-8 ${fieldErrors.amount ? 'border-danger' : ''}`}
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    €
                  </span>
                </div>
                {fieldErrors.amount && <p className="text-xs text-danger">{fieldErrors.amount}</p>}
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
                className={fieldErrors.description ? 'border-danger' : ''}
                required
              />
              {fieldErrors.description && (
                <p className="text-xs text-danger">{fieldErrors.description}</p>
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
