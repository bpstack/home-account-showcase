'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
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
import { Button, Input, Select, Modal, ModalFooter } from '@/components/ui'
import { Loader2 } from 'lucide-react'
import { TransactionsToolbar, TransactionsSummary, ResponsiveTransactionTable, CategoryChangeModal } from '@/components/transactions'

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
  initialCategories?: { id: string; name: string; color?: string }[]
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

  const searchTerm = searchParams.get('search') || ''

  const { selectedYear, selectedMonth, selectedCategory, selectedType, setCategory } = useFiltersStore()

  const pageParam = searchParams.get('page')
  const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1
  const limit = 100

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TransactionForm>(emptyForm)

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [subcategoryList, setSubcategoryList] = useState<Subcategory[]>([])

  const startDate = selectedMonth !== null
    ? new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0]
    : new Date(selectedYear, 0, 1).toISOString().split('T')[0]
  const endDate = selectedMonth !== null
    ? new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0]
    : new Date(selectedYear, 11, 31).toISOString().split('T')[0]

  const { data: txData, isLoading: isLoadingTx } = useTransactions({
    account_id: account?.id || '',
    start_date: startDate,
    end_date: endDate,
    search: searchTerm || undefined,
    type: selectedType !== 'all' ? selectedType : undefined,
    limit,
    offset: (page - 1) * limit,
  }, {
    initialData: initialTransactions && page === 1
      ? { transactions: initialTransactions, total: initialTotal || 0, limit, offset: 0 }
      : undefined,
  })

  const { data: catData } = useCategories(account?.id || '', {
    initialData: initialCategories
      ? { categories: initialCategories as any }
      : undefined,
  })

  const { data: allTxData } = useTransactions({
    account_id: account?.id || '',
    start_date: startDate,
    end_date: endDate,
    search: searchTerm || undefined,
    type: selectedType !== 'all' ? selectedType : undefined,
  })

  const createMutation = useCreateTransaction()
  const updateMutation = useUpdateTransaction()
  const deleteMutation = useDeleteTransaction()

  // Invalidate all transactions queries after any mutation
  const invalidateTransactions = () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
  }

  const categoryList = catData?.categories || []

  const categoryOptions = [
    { value: '', label: 'Todas las categorías' },
    ...categoryList.map((c) => ({ value: c.name, label: c.name })),
  ]

  const categoryFormOptions = [
    { value: '', label: 'Selecciona categoría' },
    ...categoryList.map((c) => ({ value: c.id, label: c.name })),
  ]

  const subcategoryFormOptions = [
    { value: '', label: 'Selecciona subcategoría' },
    ...subcategoryList.map((s) => ({ value: s.id, label: s.name })),
  ]

  useEffect(() => {
    if (form.category_id) {
      loadSubcategories(form.category_id)
    } else {
      setSubcategoryList([])
    }
  }, [form.category_id])

  async function loadSubcategories(categoryId: string) {
    try {
      const res = await subcategoriesApi.getAll(categoryId)
      setSubcategoryList(res.subcategories)
    } catch (error) {
      console.error('Error loading subcategories:', error)
      setSubcategoryList([])
    }
  }

  const transactionList = txData?.transactions || []
  const filteredTransactions = transactionList.filter((tx) => {
    const matchesCategory = !selectedCategory || tx.category_name === selectedCategory
    return matchesCategory
  })

  const allTransactions = allTxData?.transactions || []

  const totals = allTransactions.reduce(
    (acc, tx) => {
      const amount = Number(tx.amount)
      if (amount >= 0) {
        acc.income += amount
      } else {
        acc.expenses += Math.abs(amount)
      }
      return acc
    },
    { income: 0, expenses: 0 }
  )

  const handleCategoryClick = (tx: Transaction) => {
    setSelectedTransaction(tx)
    setIsCategoryModalOpen(true)
  }

  const handleCategoryModalClose = () => {
    setIsCategoryModalOpen(false)
    setSelectedTransaction(null)
  }

  const handleCategoryChangeSuccess = () => {
    invalidateTransactions()
  }

  const openCreateModal = () => {
    setEditingId(null)
    setForm(emptyForm)
    setIsModalOpen(true)
  }

  const openEditModal = (tx: Transaction) => {
    setEditingId(tx.id)
    setForm({
      description: tx.description,
      date: tx.date.split('T')[0],
      amount: Math.abs(Number(tx.amount)).toString(),
      type: Number(tx.amount) >= 0 ? 'income' : 'expense',
      category_id: '',
      subcategory_id: tx.subcategory_id || '',
    })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!account || !form.description || !form.date || !form.amount) return

    const amount =
      form.type === 'expense'
        ? -Math.abs(parseFloat(form.amount))
        : Math.abs(parseFloat(form.amount))

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          data: {
            description: form.description,
            date: form.date,
            amount,
            subcategory_id: form.subcategory_id || null,
          },
        })
      } else {
        await createMutation.mutateAsync({
          account_id: account.id,
          description: form.description,
          date: form.date,
          amount,
          subcategory_id: form.subcategory_id || undefined,
        })
      }
      setIsModalOpen(false)
      setForm(emptyForm)
      await invalidateTransactions()
    } catch (error) {
      console.error('Error saving transaction:', error)
    }
  }

  const handleDelete = (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta transacción?')) return
    deleteMutation.mutate(id, {
      onSuccess: () => invalidateTransactions(),
    })
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (newPage <= 1) {
      params.delete('page')
    } else {
      params.set('page', String(newPage))
    }
    window.history.pushState(null, '', `?${params.toString()}`)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <div>
      <TransactionsToolbar
        categoryOptions={categoryOptions}
        onOpenCreateModal={openCreateModal}
      />

      <TransactionsSummary totals={totals} />

      <ResponsiveTransactionTable
        transactions={filteredTransactions}
        isLoading={isLoadingTx}
        total={txData?.total || 0}
        page={page}
        totalPages={Math.ceil((txData?.total || 0) / limit)}
        onEdit={openEditModal}
        onDelete={handleDelete}
        onPageChange={handlePageChange}
        onCategoryClick={handleCategoryClick}
        showSubcategory
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Editar transacción' : 'Nueva transacción'}
        size="md"
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            handleSave()
          }}
        >
          <Input
            label="Descripción"
            placeholder="Ej: Compra supermercado"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
            <Input
              label="Importe"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="type"
                checked={form.type === 'expense'}
                onChange={() => setForm({ ...form, type: 'expense' })}
                className="w-4 h-4 text-danger"
              />
              <span className="text-sm text-text-primary">Gasto</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="type"
                checked={form.type === 'income'}
                onChange={() => setForm({ ...form, type: 'income' })}
                className="w-4 h-4 text-success"
              />
              <span className="text-sm text-text-primary">Ingreso</span>
            </label>
          </div>

          <Select
            label="Categoría"
            options={categoryFormOptions}
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value, subcategory_id: '' })}
          />

          {subcategoryList.length > 0 && (
            <Select
              label="Subcategoría"
              options={subcategoryFormOptions}
              value={form.subcategory_id}
              onChange={(e) => setForm({ ...form, subcategory_id: e.target.value })}
            />
          )}
        </form>

        <ModalFooter>
          <Button variant="outline" onClick={() => setIsModalOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            {editingId ? 'Guardar' : 'Crear'}
          </Button>
        </ModalFooter>
      </Modal>

      {account && (
        <CategoryChangeModal
          isOpen={isCategoryModalOpen}
          onClose={handleCategoryModalClose}
          transaction={selectedTransaction}
          accountId={account.id}
          onSuccess={handleCategoryChangeSuccess}
        />
      )}
    </div>
  )
}
