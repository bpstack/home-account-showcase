// components/investment/InvestmentOverview.tsx
// Overview component for investment module

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useInvestmentOverview, useUpdateEmergencyFundMonths, useUpdateLiquidityReserve } from '@/lib/queries/investment'
import { formatCurrency, cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus, AlertCircle, PiggyBank, Wallet } from 'lucide-react'
import { useState } from 'react'
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
  const { data, isLoading, isError } = useInvestmentOverview(accountId)
  const [selectedMonths, setSelectedMonths] = useState<number | null>(null)
  const [isEditingFund, setIsEditingFund] = useState(false)
  const [fundAmount, setFundAmount] = useState('')

  const updateMonthsMutation = useUpdateEmergencyFundMonths()
  const updateLiquidityMutation = useUpdateLiquidityReserve()

  if (isLoading) {
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

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
           <CardTitle>Resumen de Inversión</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            Error al cargar los datos
          </div>
        </CardContent>
      </Card>
    )
  }

  const { financialSummary, profile } = data

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

  return (
    <Card className="h-full border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0 pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold tracking-tight">
              Resumen
            </CardTitle>
          </div>
          {profile && (
            <RiskBadge profile={profile.riskProfile} />
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            label="Ingresos"
            value={formatCurrency(financialSummary.avgMonthlyIncome)}
            icon={<Wallet className="h-4 w-4 text-blue-500" />}
          />
          <MetricCard
            label="Gastos"
            value={formatCurrency(financialSummary.avgMonthlyExpenses)}
            icon={<TrendingDown className="h-4 w-4 text-red-500" />}
          />
          <MetricCard
            label="Ahorro"
            value={formatCurrency(financialSummary.savingsCapacity)}
            icon={<PiggyBank className="h-4 w-4 text-emerald-500" />}
            highlight
            subtitle={`${financialSummary.savingsRate.toFixed(0)}%`}
          />
          <div className="p-4 rounded-xl bg-card border border-border/40 dark:border-white/5 dark:bg-zinc-900 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase">
                Fondo
              </span>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </div>
            {isEditingFund ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  className="h-8 px-2 text-lg font-bold w-24 border rounded bg-background"
                  min="0"
                  step="0.01"
                />
                <button
                  onClick={handleSaveFund}
                  disabled={updateLiquidityMutation.isPending}
                  className="text-green-600 hover:text-green-700 text-sm font-medium"
                >
                  {updateLiquidityMutation.isPending ? '...' : 'OK'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="text-muted-foreground hover:text-foreground text-sm"
                >
                  X
                </button>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold cursor-pointer hover:text-green-600 transition-colors" onClick={handleEditFund}>
                  {formatCurrency(currentFund)}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <span>Meta: {formatCurrency(financialSummary.emergencyFundGoal)}</span>
                  <span className="text-gray-400">({currentMonths} meses)</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground font-medium">Progreso fondo de emergencia</span>
            <span className="font-bold text-foreground">{savingsProgress.toFixed(0)}%</span>
          </div>
          <div className="h-3 bg-muted/50 rounded-full overflow-hidden border border-border/20">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-emerald-600 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${savingsProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatCurrency(financialSummary.emergencyFundStatus)}</span>
            <span>{formatCurrency(financialSummary.emergencyFundGoal)}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-card border border-border/40 dark:border-white/5 dark:bg-zinc-900 rounded-xl">
          <div className="flex-1">
            <span className="text-sm font-medium flex items-center gap-2">
              Configuración Fondo Emergencia
            </span>
          </div>
          <select
            className="text-xs border-none bg-muted/50 rounded-md px-3 py-1.5 cursor-pointer outline-none focus:ring-1 focus:ring-primary/20"
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mt-4 pt-4 border-t border-border/40">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            {getTrendIcon()}
            <span className={`font-medium ${getTrendColor()}`}>
              {financialSummary.trend === 'improving' ? 'Tendencia Positiva' :
               financialSummary.trend === 'declining' ? 'Tendencia Negativa' : 'Tendencia Estable'}
            </span>
          </div>
          <div className="text-muted-foreground text-center">
            📊 <span className="font-medium text-foreground">{financialSummary.historicalMonths}</span> meses analizados
          </div>
          <div className="text-muted-foreground text-center sm:text-right">
            📅 <span className="font-medium text-foreground">{financialSummary.deficitMonths}</span> mes(es) en déficit
          </div>
        </div>

        {financialSummary.deficitMonths > 3 && (
          <div className="flex items-start gap-3 p-4 bg-yellow-50/80 dark:bg-yellow-900/20 rounded-xl text-sm border border-yellow-200 dark:border-yellow-800/30">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-yellow-600 dark:text-yellow-500" />
            <span className="text-yellow-800 dark:text-yellow-200">
              Atención: Tienes {financialSummary.deficitMonths} meses con gastos superiores a ingresos. Considera revisar tu presupuesto antes de aumentar tus inversiones.
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
  tooltip
}: {
  label: string
  value: string
  icon?: React.ReactNode
  highlight?: boolean
  subtitle?: string
  tooltip?: string
}) {
  return (
    <div className={cn(
      "p-4 rounded-xl border flex flex-col relative overflow-hidden",
      highlight
        ? "bg-emerald-500/5 border-emerald-500/10 dark:bg-emerald-500/10 dark:border-emerald-500/10"
        : "bg-card border-border/40 dark:bg-zinc-900 dark:border-white/5"
    )}>
      {/* Header: Label + Icon/Tooltip */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider line-clamp-1">
          {label}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {tooltip && <InfoTooltip content={tooltip} className="w-3 h-3" />}
          <div className={cn("text-muted-foreground", highlight && "text-emerald-500")}>
            {icon}
          </div>
        </div>
      </div>
      
      {/* Body: Value */}
      <div className="text-xl font-bold tracking-tight text-foreground">
        {value}
      </div>

      {/* Footer: Subtitle (pushed to bottom if exists) */}
      {subtitle && (
        <div className="mt-auto pt-3 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
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
    dynamic: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  }

  const labels = {
    conservative: 'Conservador',
    balanced: 'Equilibrado',
    dynamic: 'Dinámico'
  }

  const descriptions = {
    conservative: 'Prefiere seguridad. Menor riesgo, menores retornos esperados.',
    balanced: 'Busca equilibrio entre riesgo y retorno.',
    dynamic: 'Acepta más riesgo buscando mayores ganancias.'
  }

  return (
    <Tooltip content={descriptions[profile as keyof typeof descriptions]}>
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[profile as keyof typeof colors]} cursor-help border border-current/20`}>
        {labels[profile as keyof typeof labels]}
      </span>
    </Tooltip>
  )
}
