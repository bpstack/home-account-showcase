'use client'

import { useState, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useQueryClient } from '@tanstack/react-query'
import { useCategories } from '@/lib/queries/categories'
import { useCreateTransaction } from '@/lib/queries/transactions'
import { type CreateTransactionData } from '@/lib/apiClient'
import { BulkImport } from './bulk/BulkImport'

import {
  Tabs,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Select,
  DatePickerSimple,
} from '@/components/ui'

import {
  User,
  Database,
  Info,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Lock,
} from 'lucide-react'

import { getTodayLocal } from '@/lib/date-utils'
import { validateTransaction } from '@/validators/transaction-validators'

const importTabs = [
  { id: 'individual', label: 'Individual', icon: <User className="h-4 w-4" /> },
  { id: 'mass', label: 'Masivo', icon: <Database className="h-4 w-4" /> },
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
  const [activeTab, setActiveTab] = useState('individual')
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
    <div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6">
      {/* Header con Tabs standard UI */}
      <div className="relative">
        <Tabs
          tabs={importTabs}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id)}
          variant="underline-responsive"
        />
      </div>

      <div className="px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Columna Izquierda: Funcionalidad (Tab Content) */}
          <div className="lg:col-span-8 space-y-6">
            {activeTab === 'individual' ? (
              <Card className="overflow-hidden border border-slate-200 dark:border-transparent shadow-sm dark:shadow-premium bg-white dark:bg-layer-1">
                <CardHeader className="pb-4 pt-4 sm:pb-6 sm:pt-6">
                  <div className="flex flex-col items-center text-center sm:flex-row sm:text-left gap-3 sm:gap-4">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-blue-100 dark:bg-accent/20 flex items-center justify-center">
                      <User className="h-6 w-6 text-blue-600 dark:text-accent" />
                    </div>
                    <div>
                      <CardTitle className="text-lg sm:text-xl font-bold tracking-tight text-slate-800 dark:text-text-primary">
                        Nueva Transacción Individual
                      </CardTitle>
                      <p className="text-sm text-slate-600 dark:text-text-secondary mt-1">
                        Añade un gasto o ingreso manualmente de forma rápida.
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 pb-8 px-4 sm:px-8">
                  <form onSubmit={handleSubmitIndividual} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-text-primary">
                          Tipo
                        </label>
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
                        <label className="text-sm font-medium text-slate-700 dark:text-text-primary">
                          Fecha
                        </label>
                        <DatePickerSimple
                          value={form.date}
                          onChange={(date) => setForm({ ...form, date })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-primary">Descripción</label>
                      <Input
                        placeholder="Ej: Compra semanal Mercadona"
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
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-primary">Importe</label>
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
                          error={fieldErrors.amount}
                          className={`pr-10 ${fieldErrors.amount ? 'border-red-500' : ''}`}
                          required
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary font-medium">
                          €
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-text-primary">
                          Categoría
                        </label>
                        <Select
                          options={categoryOptions}
                          value={form.category_id}
                          error={fieldErrors.category_id}
                          onChange={(e) =>
                            setForm({ ...form, category_id: e.target.value, subcategory_id: '' })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-text-primary">
                          Subcategoría
                        </label>
                        <Select
                          options={subcategoryOptions}
                          value={form.subcategory_id}
                          onChange={(e) => setForm({ ...form, subcategory_id: e.target.value })}
                          disabled={!form.category_id}
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-destructive text-sm">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                      </div>
                    )}

                    {success && (
                      <div className="p-3 rounded-lg bg-success/10 border border-success/20 flex items-center gap-2 text-success text-sm">
                        <CheckCircle2 className="h-4 w-4" />
                        {success}
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-12 text-base font-semibold shadow-accent/20 transition-all hover:scale-[1.01]"
                      isLoading={isLoading}
                    >
                      Añadir Transacción
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : (
              account && <BulkImport accountId={account.id} categories={categories} />
            )}
          </div>

          {/* Columna Derecha: Informativa (Sidebar) */}
          <div className="hidden lg:block lg:col-span-4 space-y-6 lg:sticky lg:top-6 lg:self-start">
            <Card className="bg-gradient-to-br from-slate-50 dark:from-layer-2 to-white dark:to-layer-1 border-slate-200 dark:border-layer-3">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                    <Info className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-800 dark:text-text-primary leading-tight">
                      Guía de Importación
                    </CardTitle>
                    <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-0.5">
                      Consejos rápidos
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-layer-3">
                  <div className="flex gap-4 group items-start">
                    <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-text-primary leading-tight mb-1">
                        Formato estándar
                      </p>
                      <p className="text-xs text-slate-600 dark:text-text-secondary leading-relaxed">
                        Reconocemos la fecha, el concepto y el importe por el nombre de su columna;
                        si no, los eliges tú.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 group items-start">
                    <div className="h-10 w-10 rounded-xl bg-violet-100 dark:bg-violet-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <Lock className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-text-primary leading-tight mb-1">
                        Tu extracto no sale de tu equipo
                      </p>
                      <p className="text-xs text-slate-600 dark:text-text-secondary leading-relaxed">
                        Se lee en tu navegador y los movimientos se guardan cifrados.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 group items-start">
                    <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-text-primary leading-tight mb-1">
                        Adiós duplicados
                      </p>
                      <p className="text-xs text-slate-600 dark:text-text-secondary leading-relaxed">
                        Omitimos registros que ya existan en tu historial para evitar errores.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-layer-3">
                  <a
                    href="/templates/import-template.xlsx"
                    download
                    className="flex items-center gap-2 text-slate-600 dark:text-text-secondary hover:text-slate-900 dark:hover:text-text-primary hover:bg-slate-100 dark:hover:bg-layer-2 px-3 py-2 rounded-lg transition-colors w-full"
                  >
                    <HelpCircle className="h-4 w-4" />
                    Descargar ejemplo de plantilla
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Help Card */}
            <Card className="overflow-hidden border border-slate-200 dark:border-layer-3 shadow-sm bg-gradient-to-br from-blue-50 dark:from-accent/5 to-white dark:to-transparent">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-2xl bg-blue-100 dark:bg-layer-1 shadow-sm">
                    <HelpCircle className="h-5 w-5 text-blue-600 dark:text-accent" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 dark:text-text-primary mb-1 uppercase tracking-tight">
                      ¿Tienes dudas?
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-text-secondary leading-relaxed mb-4">
                      Si tu banco tiene un formato extraño, nuestro soporte técnico te ayudará a
                      importarlo.
                    </p>
                    <a
                      href="mailto:contact.bstack@gmail.com"
                      className="text-[10px] font-black text-blue-600 dark:text-accent uppercase tracking-widest hover:underline text-left flex items-center gap-1"
                    >
                      Hablar con soporte
                      <ArrowRight className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
