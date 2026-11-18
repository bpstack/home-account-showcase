'use client'

import { useState, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useQueryClient } from '@tanstack/react-query'
import { useCategories } from '@/lib/queries/categories'
import { useCreateTransaction } from '@/lib/queries/transactions'
import { type CreateTransactionData } from '@/lib/apiClient'
import { BulkImport } from './bulk/BulkImport'

import { Tabs, Button, Input, Select, DatePickerSimple } from '@/components/ui'
import { CheckCircle2, AlertCircle } from 'lucide-react'

import { getTodayLocal } from '@/lib/date-utils'
import { validateTransaction } from '@/validators/transaction-validators'

// Importing a statement is what the page is for; adding one by hand stays as the second tab
const importTabs = [
  { id: 'mass', label: 'Importar extracto' },
  { id: 'individual', label: 'Añadir a mano' },
]

interface SingleForm {
  description: string
  date: string
  amount: string
  type: 'expense' | 'income'
  category_id: string
  subcategory_id: string
}

const emptyForm: SingleForm = {
  description: '',
  date: getTodayLocal(),
  amount: '',
  type: 'expense',
  category_id: '',
  subcategory_id: '',
}

export default function ImportClient() {
  const { account } = useAuth()
  const queryClient = useQueryClient()
  const createMutation = useCreateTransaction()
  const [activeTab, setActiveTab] = useState('mass')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [form, setForm] = useState<SingleForm>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const { data: catData } = useCategories(account?.id || '', {
    enabled: !!account?.id,
  })

  const categories = useMemo(() => catData?.categories || [], [catData])

  const categoryOptions = useMemo(
    () => [
      { value: '', label: 'Seleccionar categoría...' },
      ...categories.map((c) => ({ value: c.id, label: c.name })),
    ],
    [categories]
  )

  const subcategoryOptions = useMemo(() => {
    if (!form.category_id) return [{ value: '', label: 'Primero selecciona categoría' }]
    const cat = categories.find((c) => c.id === form.category_id)
    if (!cat?.subcategories) return [{ value: '', label: 'Sin subcategorías' }]

    return [
      { value: '', label: 'Seleccionar subcategoría...' },
      ...cat.subcategories.map((s) => ({ value: s.id, label: s.name })),
    ]
  }, [categories, form.category_id])

  const handleSubmitIndividual = async (e: React.FormEvent) => {
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
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const amount = parseFloat(form.amount) * (form.type === 'expense' ? -1 : 1)
      const data: CreateTransactionData = {
        account_id: account.id,
        description: form.description,
        date: form.date,
        amount,
        subcategory_id: form.subcategory_id || undefined,
      }

      const res = await createMutation.mutateAsync(data)
      if (res.success) {
        setSuccess('Transacción creada correctamente')
        setForm(emptyForm)
        queryClient.invalidateQueries({ queryKey: ['transactions'] })
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear la transacción')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Tabs tabs={importTabs} activeTab={activeTab} onChange={(id) => setActiveTab(id)} />

      {activeTab === 'individual' ? (
        <form onSubmit={handleSubmitIndividual} className="max-w-xl space-y-5">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-text-primary">Tipo</legend>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-layer-2 p-1">
              {(
                [
                  ['expense', 'Gasto'],
                  ['income', 'Ingreso'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm({ ...form, type: value })}
                  aria-pressed={form.type === value}
                  className={`h-9 rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    form.type === value
                      ? 'bg-layer-1 font-medium text-text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="relative">
              <Input
                id="manual-amount"
                label="Importe"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={form.amount}
                onChange={(e) => {
                  setForm({ ...form, amount: e.target.value })
                  if (fieldErrors.amount) setFieldErrors((prev) => ({ ...prev, amount: '' }))
                }}
                error={fieldErrors.amount}
                className="pr-8"
                required
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-[2.1rem] text-sm text-text-secondary"
              >
                €
              </span>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-text-primary">Fecha</p>
              <DatePickerSimple value={form.date} onChange={(date) => setForm({ ...form, date })} />
            </div>
          </div>

          <Input
            id="manual-description"
            label="Concepto"
            placeholder="Por ejemplo, compra semanal"
            value={form.description}
            onChange={(e) => {
              setForm({ ...form, description: e.target.value })
              if (fieldErrors.description) {
                setFieldErrors((prev) => ({ ...prev, description: '' }))
              }
            }}
            error={fieldErrors.description}
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              id="manual-category"
              label="Categoría"
              options={categoryOptions}
              value={form.category_id}
              error={fieldErrors.category_id}
              onChange={(e) =>
                setForm({ ...form, category_id: e.target.value, subcategory_id: '' })
              }
            />
            <Select
              id="manual-subcategory"
              label="Subcategoría"
              options={subcategoryOptions}
              value={form.subcategory_id}
              onChange={(e) => setForm({ ...form, subcategory_id: e.target.value })}
              disabled={!form.category_id}
            />
          </div>

          {error && (
            <p
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}
          {success && (
            <p
              role="status"
              className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success"
            >
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              {success}
            </p>
          )}

          <Button type="submit" isLoading={isLoading} className="w-full sm:w-auto">
            Añadir transacción
          </Button>
        </form>
      ) : (
        account && <BulkImport accountId={account.id} categories={categories} />
      )}
    </div>
  )
}
