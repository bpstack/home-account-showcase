'use client'

import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import {
  transactions as transactionsApi,
  subcategories as subcategoriesApi,
  Subcategory,
  Transaction,
} from '@/lib/apiClient'
import {
  useTransactions,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from '@/lib/queries/transactions'
import { useCategories } from '@/lib/queries/categories'
import { Button, Card, CardContent, Input, Select, Modal, ModalFooter } from '@/components/ui'
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Upload,
  Loader2,
} from 'lucide-react'

const months = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

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

export default function TransactionsPage() {
  const { account } = useAuth()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TransactionForm>(emptyForm)
  const [importData, setImportData] = useState('')

  const startDate = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0]
  const endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0]

  const { data: txData, isLoading: isLoadingTx } = useTransactions({
    account_id: account?.id || '',
    start_date: startDate,
    end_date: endDate,
    search: searchTerm || undefined,
    type: filterType !== 'all' ? filterType : undefined,
  })

  const { data: catData } = useCategories(account?.id || '')

  const createMutation = useCreateTransaction()
  const updateMutation = useUpdateTransaction()
  const deleteMutation = useDeleteTransaction()

  const transactionList = txData?.transactions || []
  const categoryList = catData?.categories || []

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

  const [subcategoryList, setSubcategoryList] = useState<Subcategory[]>([])

  const filteredTransactions = transactionList.filter((tx) => {
    const matchesCategory = !filterCategory || tx.category_name === filterCategory
    return matchesCategory
  })

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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
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
      category_id: '', // We'd need to load this from subcategory
      subcategory_id: tx.subcategory_id || '',
    })
    setIsModalOpen(true)
  }

  const handleSave = () => {
    if (!account || !form.description || !form.date || !form.amount) return

    const amount =
      form.type === 'expense'
        ? -Math.abs(parseFloat(form.amount))
        : Math.abs(parseFloat(form.amount))

    const mutation = editingId
      ? updateMutation.mutateAsync({
          id: editingId,
          data: {
            description: form.description,
            date: form.date,
            amount,
            subcategory_id: form.subcategory_id || null,
          },
        })
      : createMutation.mutateAsync({
          account_id: account.id,
          description: form.description,
          date: form.date,
          amount,
          subcategory_id: form.subcategory_id || undefined,
        })

    mutation.then(() => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      setIsModalOpen(false)
      setForm(emptyForm)
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta transacción?')) return
    deleteMutation.mutate(id, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
    })
  }

  const handleImport = () => {
    if (!account || !importData.trim()) return

    const lines = importData.trim().split('\n')
    let successCount = 0
    let errorCount = 0

    const createPromises = lines.map(async (line) => {
      try {
        const [date, description, amountStr] = line.split(';').map((s) => s.trim())

        if (!date || !description || !amountStr) {
          errorCount++
          return
        }

        const amount = parseFloat(amountStr)
        if (isNaN(amount)) {
          errorCount++
          return
        }

        await transactionsApi.create({
          account_id: account.id,
          date,
          description,
          amount,
        })
        successCount++
      } catch {
        errorCount++
      }
    })

    Promise.all(createPromises).then(() => {
      alert(
        `Importación completada: ${successCount} transacciones importadas, ${errorCount} errores`
      )
      setIsImportModalOpen(false)
      setImportData('')
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    })
  }

  const totals = filteredTransactions.reduce(
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

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        {/* Month Selector */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-text-primary min-w-[140px] text-center">
            {months[currentMonth]} {currentYear}
          </span>
          <Button variant="ghost" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Type Filter */}
        <div className="inline-flex items-center bg-layer-2 rounded-lg p-0.5">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              filterType === 'all'
                ? 'text-text-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Todos
          </button>
          <div className="w-px h-5 bg-layer-3 mx-0.5" />
          <button
            onClick={() => setFilterType('income')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              filterType === 'income'
                ? 'text-success'
                : 'text-text-secondary hover:text-success'
            }`}
          >
            Ingresos
          </button>
          <div className="w-px h-5 bg-layer-3 mx-0.5" />
          <button
            onClick={() => setFilterType('expense')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              filterType === 'expense'
                ? 'text-danger'
                : 'text-text-secondary hover:text-danger'
            }`}
          >
            Gastos
          </button>
        </div>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <Input
            placeholder="Buscar transacciones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Select
            options={categoryOptions}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-auto min-w-[180px]"
          />
          <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Importar</span>
          </Button>
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Nueva</span>
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-text-secondary">Ingresos</p>
            <p className="text-lg font-semibold text-success">+{totals.income.toFixed(2)} €</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-text-secondary">Gastos</p>
            <p className="text-lg font-semibold text-danger">-{totals.expenses.toFixed(2)} €</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-text-secondary">Balance</p>
            <p
              className={`text-lg font-semibold ${totals.income - totals.expenses >= 0 ? 'text-success' : 'text-danger'}`}
            >
              {(totals.income - totals.expenses).toFixed(2)} €
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {isLoadingTx ? (
              <div className="py-12 flex items-center justify-center gap-2 text-text-secondary">
                <Loader2 className="h-5 w-5 animate-spin" />
                Cargando transacciones...
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-layer-3 bg-layer-1">
                    <th className="text-left py-3 px-4 text-text-secondary font-medium">Fecha</th>
                    <th className="text-left py-3 px-4 text-text-secondary font-medium">
                      Descripción
                    </th>
                    <th className="text-left py-3 px-4 text-text-secondary font-medium hidden md:table-cell">
                      Categoría
                    </th>
                    <th className="text-right py-3 px-4 text-text-secondary font-medium">
                      Importe
                    </th>
                    <th className="text-right py-3 px-4 text-text-secondary font-medium w-24">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-layer-2 hover:bg-layer-1">
                      <td className="py-3 px-4 text-text-primary text-xs">{formatDate(tx.date)}</td>
                      <td className="py-3 px-4 text-text-primary">{tx.description}</td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        {tx.category_name ? (
                          <div>
                            <span
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: `${tx.category_color}20`,
                                color: tx.category_color,
                              }}
                            >
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: tx.category_color }}
                              />
                              {tx.category_name}
                            </span>
                            {tx.subcategory_name && (
                              <div className="text-xs text-text-secondary mt-0.5 ml-2">
                                {tx.subcategory_name}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-text-secondary text-xs">Sin categoría</span>
                        )}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-medium ${Number(tx.amount) >= 0 ? 'text-success' : 'text-danger'}`}
                      >
                        {Number(tx.amount) >= 0 ? '+' : ''}
                        {Number(tx.amount).toFixed(2)} €
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditModal(tx)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-danger hover:text-danger"
                            onClick={() => handleDelete(tx.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {!isLoadingTx && filteredTransactions.length === 0 && (
            <div className="py-12 text-center text-text-secondary">
              No se encontraron transacciones para {months[currentMonth]} {currentYear}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Nueva/Editar Transacción */}
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

      {/* Modal Importar */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Importar transacciones"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Pega las transacciones en formato CSV (una por línea):
          </p>
          <p className="text-xs text-text-secondary bg-layer-2 p-2 rounded font-mono">
            fecha;descripción;importe
            <br />
            2025-01-15;Compra supermercado;-45.50
            <br />
            2025-01-16;Nómina;1500.00
          </p>
          <textarea
            className="w-full h-48 p-3 text-sm bg-layer-2 border border-layer-3 rounded-lg text-text-primary font-mono resize-none focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="2025-01-15;Compra supermercado;-45.50"
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
          />
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={!importData.trim()}>
            <Upload className="h-4 w-4" />
            <span className="ml-2">Importar</span>
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
