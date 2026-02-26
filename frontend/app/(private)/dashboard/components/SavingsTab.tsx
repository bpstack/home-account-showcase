'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { InvestmentWidget } from '@/components/investment/InvestmentWidget'
import { TrendingUp, TrendingUpIcon, Sparkles, Calendar } from 'lucide-react'

type Period = 'month' | 'year' | 'all' | 'custom'

interface SavingsTabProps {
  stats: {
    income: number
    expenses: number
    balance: number
  }
  period: Period
  accountId: string
}

export function SavingsTab({ stats, period, accountId }: SavingsTabProps) {
  const formatCurrency = (value: number) => `${value.toFixed(2)} €`

  const savingsRate = stats.income > 0 ? (stats.balance / stats.income) * 100 : 0

  const getSavingsLevel = (rate: number) => {
    if (rate >= 50)
      return {
        label: 'Excelente',
        color: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-100 dark:bg-green-900/30',
      }
    if (rate >= 20)
      return {
        label: 'Bueno',
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-100 dark:bg-blue-900/30',
      }
    if (rate >= 0)
      return {
        label: 'Regular',
        color: 'text-yellow-600 dark:text-yellow-400',
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      }
    return {
      label: 'Alto riesgo',
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/30',
    }
  }

  const savingsLevel = getSavingsLevel(savingsRate)
  const savingsAmount = Math.max(0, stats.balance)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Card className="bg-gradient-to-br from-blue-50/80 to-emerald-50/50 dark:from-blue-950/30 dark:to-emerald-950/20 border-blue-200/50 dark:border-blue-800/30">
          <CardContent className="py-4 px-4 text-center">
            <div className="mb-3">
              <div className="text-xs text-muted-foreground mb-1">Ahorro mensual</div>
              <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                <span className="text-text-secondary">{stats.balance >= 0 ? '+' : '-'}</span>
                <span className="ml-1">
                  {new Intl.NumberFormat('es-ES', {
                    style: 'decimal',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }).format(Math.abs(savingsAmount))}
                </span>
                <span className="text-text-secondary ml-1">EUR</span>
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/70 dark:bg-white/10 border border-border/40">
                <TrendingUpIcon className="h-3 w-3 text-success" />
                <span className={savingsLevel.color}>{savingsRate.toFixed(1)}%</span>
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/70 dark:bg-white/10 border border-border/40 ${savingsLevel.color}`}
              >
                <Sparkles className="h-3 w-3" />
                {savingsLevel.label}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Desglose
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 sm:space-y-2 px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="flex justify-between items-center py-1.5 sm:py-2 border-b border-layer-2 text-xs sm:text-sm">
              <span className="text-muted-foreground">Ingresos</span>
              <span>
                <span className="text-text-secondary">+</span>
                <span className="text-success ml-1">{formatCurrency(stats.income)}</span>
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 sm:py-2 border-b border-layer-2 text-xs sm:text-sm">
              <span className="text-muted-foreground">Gastos</span>
              <span>
                <span className="text-text-secondary">-</span>
                <span className="text-danger ml-1">{formatCurrency(stats.expenses)}</span>
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 sm:py-2 text-xs sm:text-sm font-medium">
              <span>Ahorro neto</span>
              <span>
                <span className="text-text-secondary">{stats.balance >= 0 ? '+' : '-'}</span>
                <span className={`ml-1 ${stats.balance >= 0 ? 'text-success' : 'text-danger'}`}>
                  {new Intl.NumberFormat('es-ES', {
                    style: 'decimal',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }).format(Math.abs(savingsAmount))}
                </span>
                <span className="text-text-secondary ml-1">€</span>
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {period === 'year' || period === 'all' ? 'Año completo' : 'Proyección anual'}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <div className="flex items-center justify-between sm:flex-col sm:text-center">
                <span className="text-xs text-muted-foreground">
                  {period === 'year' || period === 'all' ? 'Total ahorrado' : 'Ritmo actual'}
                </span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  <span className="text-text-secondary">+</span>
                  <span className="ml-1">
                    {new Intl.NumberFormat('es-ES', {
                      style: 'decimal',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(
                      period === 'year' || period === 'all' ? savingsAmount : savingsAmount * 12
                    )}
                  </span>
                  <span className="text-text-secondary ml-1">€</span>
                </span>
              </div>
              <div className="flex items-center justify-between sm:flex-col sm:text-center">
                <span className="text-xs text-muted-foreground">Objetivo 30%</span>
                <span className="font-semibold text-green-600">
                  <span className="text-text-secondary">+</span>
                  <span className="ml-1">
                    {new Intl.NumberFormat('es-ES', {
                      style: 'decimal',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(
                      period === 'year' || period === 'all'
                        ? stats.income * 0.3
                        : stats.income * 0.3 * 12
                    )}
                  </span>
                  <span className="text-text-secondary ml-1">€</span>
                </span>
              </div>
              <div className="flex items-center justify-between sm:flex-col sm:text-center">
                <span className="text-xs text-muted-foreground">Con inversión 5%</span>
                <span className="font-semibold text-primary">
                  <span className="text-text-secondary">+</span>
                  <span className="ml-1">
                    {new Intl.NumberFormat('es-ES', {
                      style: 'decimal',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(
                      period === 'year' || period === 'all'
                        ? savingsAmount * 1.05
                        : savingsAmount * 12 * 1.05
                    )}
                  </span>
                  <span className="text-text-secondary ml-1">€</span>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <InvestmentWidget accountId={accountId} stats={stats} />
      </div>
    </div>
  )
}
