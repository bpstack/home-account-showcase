'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { transactions as transactionsApi } from '@/lib/apiClient'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Tabs,
  useActiveTab,
} from '@/components/ui'
import {
  ArrowLeft,
  ArrowRight,
  Download,
  TrendingUp,
  TrendingDown,
  Wallet,
  Loader2,
} from 'lucide-react'
import type { Transaction } from '@/lib/apiClient'

const tabs = [
  { id: 'balance', label: 'Balance Mensual' },
  { id: 'income', label: 'Ingresos' },
  { id: 'expenses', label: 'Gastos' },
]

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

export default function BalancePage() {
  const { account } = useAuth()
  const activeTab = useActiveTab('tab', 'balance')
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadTransactions = useCallback(async () => {
    if (!account) return
    setIsLoading(true)

    try {
      const startDate = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0]
      const endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0]

      const response = await transactionsApi.getAll({
        account_id: account.id,
        start_date: startDate,
        end_date: endDate,
      })

      setTransactions(response.transactions)
    } catch (error) {
      console.error('Error loading transactions:', error)
      setTransactions([])
    } finally {
      setIsLoading(false)
    }
  }, [account, currentYear, currentMonth])

  useEffect(() => {
    if (account) {
      loadTransactions()
    }
  }, [account, currentMonth, currentYear, loadTransactions])

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

  // Calculate totals from real transactions
  const totals = transactions.reduce(
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

  const savings = totals.income - totals.expenses

  // Group income by description (simple categorization)
  const incomeByType = transactions
    .filter((tx) => Number(tx.amount) >= 0)
    .reduce(
      (acc, tx) => {
        const desc = tx.description.toLowerCase()
        let type = 'Otros Ingresos'
        if (desc.includes('nómina') || desc.includes('nomina')) type = 'Nómina'
        else if (desc.includes('transferencia') || desc.includes('transfer'))
          type = 'Transferencias'
        else if (desc.includes('bizum')) type = 'Bizum'
        else if (desc.includes('bonus') || desc.includes('bonific')) type = 'Bonificaciones'
        acc[type] = (acc[type] || 0) + Number(tx.amount)
        return acc
      },
      {} as Record<string, number>
    )

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <Tabs tabs={tabs} defaultTab="balance" />

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={prevMonth}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-text-primary min-w-[140px] text-center">
            {months[currentMonth]} {currentYear}
          </span>
          <Button variant="ghost" size="icon" onClick={nextMonth}>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-text-secondary">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando datos...
        </div>
      ) : (
        <>
          {activeTab === 'balance' && <BalanceTab totals={totals} savings={savings} />}
          {activeTab === 'income' && (
            <IncomeTab incomeByType={incomeByType} totalIncome={totals.income} />
          )}
          {activeTab === 'expenses' && <ExpensesTab totals={totals} savings={savings} />}
        </>
      )}
    </div>
  )
}

function BalanceTab({
  totals,
  savings,
}: {
  totals: { income: number; expenses: number }
  savings: number
}) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-success/5 border-success/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Total Ingresos</p>
                <p className="text-xl font-bold text-success">+{formatCurrency(totals.income)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-danger/5 border-danger/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-danger/20 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-danger" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Total Gastos</p>
                <p className="text-xl font-bold text-danger">-{formatCurrency(totals.expenses)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-accent/5 border-accent/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Ahorro</p>
                <p className={`text-xl font-bold ${savings >= 0 ? 'text-accent' : 'text-danger'}`}>
                  {savings >= 0 ? '+' : ''}
                  {formatCurrency(savings)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-layer-2 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-text-secondary" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Saldo CC</p>
                <p className="text-xl font-bold text-text-primary">{formatCurrency(savings)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Transacciones del mes</CardTitle>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary text-center py-8">
            Consulta el detalle en la sección Transacciones
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function IncomeTab({
  incomeByType,
  totalIncome,
}: {
  incomeByType: Record<string, number>
  totalIncome: number
}) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)
  }

  const incomeTypes = [
    { key: 'Nómina', label: 'Nómina' },
    { key: 'Transferencias', label: 'Transferencias' },
    { key: 'Bizum', label: 'Bizum' },
    { key: 'Bonificaciones', label: 'Bonificaciones' },
    { key: 'Otros Ingresos', label: 'Otros Ingresos' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Desglose de Ingresos</CardTitle>
      </CardHeader>
      <CardContent>
        {totalIncome === 0 ? (
          <p className="text-sm text-text-secondary text-center py-8">
            No hay ingresos registrados este mes
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {incomeTypes.map(({ key, label }) => {
              const value = incomeByType[key] || 0
              if (value === 0) return null
              return (
                <div key={key} className="text-center p-4 bg-layer-2 rounded-lg">
                  <p className="text-sm text-text-secondary mb-1">{label}</p>
                  <p className="text-lg font-bold text-success">{formatCurrency(value)}</p>
                </div>
              )
            })}
            <div className="text-center p-4 bg-accent/10 rounded-lg border border-accent/30">
              <p className="text-sm text-text-secondary mb-1">Total</p>
              <p className="text-xl font-bold text-accent">{formatCurrency(totalIncome)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ExpensesTab({
  totals,
  savings,
}: {
  totals: { income: number; expenses: number }
  savings: number
}) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)
  }

  const variableExpenses = Math.max(0, totals.expenses - 576.25) // Assuming fixed expenses ~576.25

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Gastos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-danger/5 border border-danger/20 rounded-lg">
              <p className="text-sm text-text-secondary mb-1">Gastos Fijos</p>
              <p className="text-2xl font-bold text-danger">-{formatCurrency(576.25)}</p>
            </div>
            <div className="p-4 bg-layer-2 rounded-lg">
              <p className="text-sm text-text-secondary mb-1">Gastos Variables</p>
              <p className="text-2xl font-bold text-text-primary">
                -{formatCurrency(variableExpenses)}
              </p>
            </div>
            <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg">
              <p className="text-sm text-text-secondary mb-1">Total Gastos</p>
              <p className="text-2xl font-bold text-danger">-{formatCurrency(totals.expenses)}</p>
            </div>
            <div
              className={`p-4 rounded-lg border ${
                savings >= 0 ? 'bg-accent/10 border-accent/30' : 'bg-danger/10 border-danger/30'
              }`}
            >
              <p className="text-sm text-text-secondary mb-1">Ahorro</p>
              <p className={`text-2xl font-bold ${savings >= 0 ? 'text-accent' : 'text-danger'}`}>
                {savings >= 0 ? '+' : ''}
                {formatCurrency(savings)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gastos por Categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary text-center py-8">
            Consulta el desglose por categorías en la sección Transacciones
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
