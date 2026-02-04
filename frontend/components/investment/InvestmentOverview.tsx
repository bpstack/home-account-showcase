// components/investment/InvestmentOverview.tsx
// Overview component for investment module - Redesigned for better mobile/desktop UX

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import {
  useInvestmentOverview,
  useUpdateEmergencyFundMonths,
  useUpdateLiquidityReserve,
} from '@/lib/queries/investment'
import { useTransactions } from '@/lib/queries/transactions'
import { useCryptoStore } from '@/stores/cryptoStore'
import { formatCurrency, cn } from '@/lib/utils'
import { InvestmentWidget } from './InvestmentWidget'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  PiggyBank,
  Wallet,
  ArrowRight,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { Tooltip, InfoTooltip } from '@/components/ui/Tooltip'
import { Skeleton } from '@/components/ui/Skeleton'
import { toast } from 'sonner'

interface InvestmentOverviewProps {
  accountId: string
}

const MONTHS_OPTIONS = [
  { value: 3, label: '3 meses' },
  { value: 6, label: '6 meses' },
  { value: 9, label: '9 meses' },
  { value: 12, label: '12 meses' },
  { value: 18, label: '18 meses' },
  { value: 24, label: '24 meses' },
  { value: 36, label: '36 meses' },
  { value: 48, label: '48 meses' },
  { value: 60, label: '60 meses' },
]

export function InvestmentOverview({ accountId }: InvestmentOverviewProps) {
  const { data: investmentData, isLoading: isInvestmentLoading } = useInvestmentOverview(accountId)
  const { data: txData, isLoading: isTxLoading } = useTransactions({ account_id: accountId, limit: 10000 })
  const isAccountUnlocked = useCryptoStore((s) => s.isAccountUnlocked)
  
  const transactions = txData?.transactions || []

  const [selectedMonths, setSelectedMonths] = useState<number | null>(null)
  const [isEditingFund, setIsEditingFund] = useState(false)
  const [fundAmount, setFundAmount] = useState('')

  const updateMonthsMutation = useUpdateEmergencyFundMonths()
  const updateLiquidityMutation = useUpdateLiquidityReserve()

  const isLoading = isInvestmentLoading || isTxLoading

  // Calculate financial summary from decrypted transactions (client-side)
  // This must be declared before any early returns to comply with React Hooks rules
  const financialSummary = useMemo(() => {
    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return {
        avgMonthlyIncome: 0,
        avgMonthlyExpenses: 0,
        savingsCapacity: 0,
        savingsRate: 0,
        trend: 'stable' as const,
        deficitMonths: 0,
        historicalMonths: 0,
        emergencyFundStatus: investmentData?.financialSummary?.emergencyFundStatus || 0,
        emergencyFundGoal: investmentData?.financialSummary?.emergencyFundGoal || 0,
      }
    }

    const incomeTxs = transactions.filter(t => t.amount > 0)
    const expenseTxs = transactions.filter(t => t.amount < 0)

    const totalIncome = incomeTxs.reduce((sum, t) => sum + Number(t.amount), 0)
    const totalExpenses = Math.abs(expenseTxs.reduce((sum, t) => sum + Number(t.amount), 0))

    const monthlyIncome: Record<string, number> = {}
    const monthlyExpenses: Record<string, number> = {}

    transactions.forEach(t => {
      const month = t.date.split('T')[0].slice(0, 7)
      if (t.amount > 0) {
        monthlyIncome[month] = (monthlyIncome[month] || 0) + Number(t.amount)
      } else {
        monthlyExpenses[month] = (monthlyExpenses[month] || 0) + Math.abs(Number(t.amount))
      }
    })

    const months = Object.keys(monthlyIncome)
    const avgMonthlyIncome = months.length > 0 
      ? totalIncome / months.length 
      : 0
    const avgMonthlyExpenses = months.length > 0 
      ? totalExpenses / months.length 
      : 0

    const savingsCapacity = Math.max(0, avgMonthlyIncome - avgMonthlyExpenses)
    const savingsRate = avgMonthlyIncome > 0 
      ? (savingsCapacity / avgMonthlyIncome) * 100 
      : 0

    const monthlySavings: Record<string, number> = {}
    transactions.forEach(t => {
      const month = t.date.split('T')[0].slice(0, 7)
      monthlySavings[month] = (monthlySavings[month] || 0) + Number(t.amount)
    })

    const savingsValues = Object.values(monthlySavings)
    const trend = savingsValues.length >= 2
      ? (savingsValues[savingsValues.length - 1] > savingsValues[0] ? 'improving' : 
         savingsValues[savingsValues.length - 1] < savingsValues[0] ? 'declining' : 'stable')
      : 'stable'

    const deficitMonths = savingsValues.filter(s => s < 0).length

    return {
      avgMonthlyIncome,
      avgMonthlyExpenses,
      savingsCapacity,
      savingsRate,
      trend: trend as 'improving' | 'stable' | 'declining',
      deficitMonths,
      historicalMonths: months.length,
      emergencyFundStatus: investmentData?.financialSummary?.emergencyFundStatus || 0,
      emergencyFundGoal: investmentData?.financialSummary?.emergencyFundGoal || 0,
    }
  }, [transactions, investmentData])

  const profile = investmentData?.profile
  const currentMonths = profile?.emergencyFundMonths || 6
  const currentFund = financialSummary.emergencyFundStatus

  const getTrendIcon = () => {
    switch (financialSummary.trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-yellow-500" />
    }
  }

  const getTrendColor = () => {
    switch (financialSummary.trend) {
      case 'improving':
        return 'text-green-600 dark:text-green-400'
      case 'declining':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-yellow-600 dark:text-yellow-400'
    }
  }

  const savingsProgress = Math.min(
    100,
    (financialSummary.emergencyFundStatus / financialSummary.emergencyFundGoal) * 100
  )

  const handleMonthsChange = async (months: number) => {
    try {
      setSelectedMonths(months)
      await updateMonthsMutation.mutateAsync({ accountId, months })
      toast.success('Meses de respaldo actualizados')
    } catch (error) {
      toast.error('Error al actualizar meses de respaldo')
    }
  }

  const handleEditFund = () => {
    setFundAmount(currentFund.toString())
    setIsEditingFund(true)
  }

  const handleSaveFund = async () => {
    const amount = parseFloat(fundAmount)
    if (isNaN(amount) || amount < 0) return

    try {
      await updateLiquidityMutation.mutateAsync({ accountId, amount })
      setIsEditingFund(false)
      toast.success('Fondo de emergencia actualizado')
    } catch (error) {
      toast.error('Error al actualizar fondo de emergencia')
    }
  }

  const handleCancelEdit = () => {
    setIsEditingFund(false)
    setFundAmount('')
  }

  // Show skeleton while loading or account is locked (data can't be decrypted)
  if (isLoading || !isAccountUnlocked(accountId)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Inversión</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-full rounded-full" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-4 w-20" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0 pb-2 sm:pb-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base sm:text-lg font-bold tracking-tight">Resumen</CardTitle>
          {profile && <RiskBadge profile={profile.riskProfile} />}
        </div>
      </CardHeader>
      <CardContent className="p-0 space-y-3 sm:space-y-4">
        {/* Investment Module Banner - Compact on mobile */}
        <a
          href="/investment"
          className="group flex items-center justify-between p-2.5 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-br from-accent/10 to-primary/10 border border-accent/20 hover:border-accent/40 transition-all"
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-lg bg-accent/20 shrink-0">
              <TrendingUp className="h-4 w-4 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">Módulo de Inversión</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                {profile
                  ? `${profile.riskProfile === 'dynamic' ? 'Dinámico' : profile.riskProfile === 'conservative' ? 'Conservador' : 'Equilibrado'} • ${financialSummary.savingsRate.toFixed(0)}% ahorro`
                  : 'Sin configurar'}
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors shrink-0 ml-2" />
        </a>

        {/* Financial Metrics Grid - More compact */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
          <MetricCard
            label="Ingresos"
            value={formatCurrency(financialSummary.avgMonthlyIncome)}
            icon={<Wallet className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />}
          />
          <MetricCard
            label="Gastos"
            value={formatCurrency(financialSummary.avgMonthlyExpenses)}
            icon={<TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />}
          />
          <MetricCard
            label="Ahorro"
            value={formatCurrency(financialSummary.savingsCapacity)}
            icon={<PiggyBank className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500" />}
            highlight
            subtitle={`${financialSummary.savingsRate.toFixed(0)}%`}
          />
        </div>

        {/* Emergency Fund Card - More compact on mobile */}
        <div className="p-2.5 sm:p-4 rounded-lg sm:rounded-xl bg-card border border-border/40 dark:border-white/5 dark:bg-zinc-900 space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Fondo de Emergencia
            </span>
            <Tooltip
              content="El fondo de emergencia es un colchón financiero para imprevistos (pérdida de empleo, reparaciones urgentes, gastos médicos). Se calcula como N meses de tus gastos mensuales promedio."
              side="left"
            >
              <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500 cursor-help shrink-0" />
            </Tooltip>
          </div>

          {isEditingFund ? (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="number"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                className="h-9 px-3 text-lg font-bold w-28 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                min="0"
                step="0.01"
                autoFocus
              />
              <button
                onClick={handleSaveFund}
                disabled={updateLiquidityMutation.isPending}
                className="px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {updateLiquidityMutation.isPending ? '...' : 'Guardar'}
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <button
                onClick={handleEditFund}
                className="text-xl sm:text-2xl font-bold hover:text-emerald-600 transition-colors cursor-pointer"
              >
                {formatCurrency(currentFund)}
              </button>
              <div className="text-xs text-muted-foreground">
                Meta: {formatCurrency(financialSummary.emergencyFundGoal)} ({currentMonths} meses)
              </div>
            </div>
          )}

          {/* Progress bar */}
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex justify-between text-[10px] sm:text-xs">
              <span className="text-muted-foreground">Progreso</span>
              <span className="font-semibold">{savingsProgress.toFixed(0)}%</span>
            </div>
            <div className="h-2 sm:h-3 bg-muted/50 rounded-full overflow-hidden border border-border/20">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-emerald-600 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${savingsProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] sm:text-xs text-muted-foreground">
              <span>{formatCurrency(financialSummary.emergencyFundStatus)}</span>
              <span>{formatCurrency(financialSummary.emergencyFundGoal)}</span>
            </div>
          </div>
        </div>

        {/* Emergency Fund Configuration - Compact */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 p-2.5 sm:p-4 bg-card border border-border/40 dark:border-white/5 dark:bg-zinc-900 rounded-lg sm:rounded-xl">
          <span className="text-xs sm:text-sm font-medium flex-1">Config. Fondo Emergencia</span>
          <select
            className="w-full sm:w-auto text-xs sm:text-sm border-none bg-muted/50 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 cursor-pointer outline-none focus:ring-2 focus:ring-primary/20 min-w-[100px] sm:min-w-[120px]"
            value={selectedMonths ?? currentMonths}
            onChange={(e) => handleMonthsChange(Number(e.target.value))}
            disabled={updateMonthsMutation.isPending}
          >
            {MONTHS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Trend and stats - More compact */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-3 text-[10px] sm:text-sm pt-2 sm:pt-3 border-t border-border/40">
          <div className="flex items-center gap-1 sm:gap-2 justify-center p-1.5 sm:p-2 rounded-lg bg-muted/30">
            {getTrendIcon()}
            <span className={`font-medium ${getTrendColor()}`}>
              {financialSummary.trend === 'improving'
                ? 'Positiva'
                : financialSummary.trend === 'declining'
                  ? 'Negativa'
                  : 'Estable'}
            </span>
          </div>
          <div className="text-muted-foreground text-center p-1.5 sm:p-2 rounded-lg bg-muted/30">
            📊{' '}
            <span className="font-medium text-foreground">{financialSummary.historicalMonths}</span>{' '}
            meses
          </div>
          <div className="text-muted-foreground text-center p-1.5 sm:p-2 rounded-lg bg-muted/30">
            📅 <span className="font-medium text-foreground">{financialSummary.deficitMonths}</span>{' '}
            déficit
          </div>
        </div>

        {financialSummary.deficitMonths > 3 && (
          <div className="flex items-start gap-2 p-2 sm:p-3 bg-yellow-50/80 dark:bg-yellow-900/20 rounded-lg sm:rounded-xl text-[10px] sm:text-sm border border-yellow-200 dark:border-yellow-800/30">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-yellow-600 dark:text-yellow-500" />
            <span className="text-yellow-800 dark:text-yellow-200">
              Atención: {financialSummary.deficitMonths} meses con gastos superiores a ingresos.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ========================
// Subcomponents
// ========================

function MetricCard({
  label,
  value,
  icon,
  highlight = false,
  subtitle,
  tooltip,
  className,
}: {
  label: string
  value: string
  icon?: React.ReactNode
  highlight?: boolean
  subtitle?: string
  tooltip?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'p-2 sm:p-3 rounded-lg sm:rounded-xl border flex flex-col relative overflow-hidden min-w-0',
        highlight
          ? 'bg-emerald-500/5 border-emerald-500/10 dark:bg-emerald-500/10 dark:border-emerald-500/10'
          : 'bg-card border-border/40 dark:bg-zinc-900 dark:border-white/5',
        className
      )}
    >
      {/* Header: Icon + Label */}
      <div className="flex items-center gap-1 mb-1 sm:mb-1.5">
        <div className={cn('shrink-0', highlight ? 'text-emerald-500' : 'text-muted-foreground')}>
          {icon}
        </div>
        <span className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
          {label}
        </span>
        {tooltip && <InfoTooltip content={tooltip} className="w-3 h-3 shrink-0" />}
      </div>

      {/* Body: Value */}
      <div className="text-sm sm:text-lg font-bold tracking-tight text-foreground truncate">
        {value}
      </div>

      {/* Footer: Subtitle */}
      {subtitle && (
        <div className="mt-0.5 sm:mt-1 text-[9px] sm:text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
          <div className="w-1 h-1 rounded-full bg-current" />
          {subtitle}
        </div>
      )}
    </div>
  )
}

export function RiskBadge({ profile }: { profile: string }) {
  const colors = {
    conservative: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    balanced: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    dynamic: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }

  const labels = {
    conservative: 'Conservador',
    balanced: 'Equilibrado',
    dynamic: 'Dinámico',
  }

  const descriptions = {
    conservative: 'Prefiere seguridad. Menor riesgo, menores retornos esperados.',
    balanced: 'Busca equilibrio entre riesgo y retorno.',
    dynamic: 'Acepta más riesgo buscando mayores ganancias.',
  }

  return (
    <Tooltip content={descriptions[profile as keyof typeof descriptions]}>
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${colors[profile as keyof typeof colors]} cursor-help border border-current/20`}
      >
        {labels[profile as keyof typeof labels]}
      </span>
    </Tooltip>
  )
}
