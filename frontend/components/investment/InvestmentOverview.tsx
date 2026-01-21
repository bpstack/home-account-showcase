// components/investment/InvestmentOverview.tsx
// Overview component for investment module

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useInvestmentOverview, useUpdateEmergencyFundMonths, useUpdateLiquidityReserve } from '@/lib/queries/investment'
import { investmentApi } from '@/lib/api/investment'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus, AlertCircle, PiggyBank, Wallet, Info } from 'lucide-react'
import { useState } from 'react'
import { Tooltip, InfoTooltip } from '@/components/ui/Tooltip'

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
  const { data, isLoading, isError, refetch } = useInvestmentOverview(accountId)
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
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded-lg" />
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
    setSelectedMonths(months)
    await updateMonthsMutation.mutateAsync({ accountId, months })
  }

  const handleEditFund = () => {
    setFundAmount(currentFund.toString())
    setIsEditingFund(true)
  }

  const handleSaveFund = async () => {
    const amount = parseFloat(fundAmount)
    if (isNaN(amount) || amount < 0) return

    await updateLiquidityMutation.mutateAsync({ accountId, amount })
    setIsEditingFund(false)
  }

  const handleCancelEdit = () => {
    setIsEditingFund(false)
    setFundAmount('')
  }

  return (
    <Card className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/10 border-blue-200/50 dark:border-blue-800/30">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-blue-700 dark:text-blue-300">Resumen de Inversión</CardTitle>
        {profile && (
          <RiskBadge profile={profile.riskProfile} />
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Ingreso mensual"
            value={formatCurrency(financialSummary.avgMonthlyIncome)}
            icon={<Wallet className="h-4 w-4 text-blue-500" />}
            tooltip="Tu promedio de ingresos mensuales basado en los últimos 12 meses"
          />
          <MetricCard
            label="Gastos mensuales"
            value={formatCurrency(financialSummary.avgMonthlyExpenses)}
            icon={<TrendingDown className="h-4 w-4 text-red-500" />}
            tooltip="Tu promedio de gastos mensuales (excluyendo inversiones)"
          />
          <MetricCard
            label="Capacidad de ahorro"
            value={formatCurrency(financialSummary.savingsCapacity)}
            highlight
            subtitle={`${financialSummary.savingsRate.toFixed(1)}% rate`}
            tooltip="Lo que te sobra cada mes después de gastos. Esta es la cantidad que puedes invertir."
          />
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <PiggyBank className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                Fondo de emergencia
                <InfoTooltip content="Ahorro reservado para imprevistos (pérdida de empleo, reparaciones, etc.). Recomendado: 3-6 meses de gastos." />
              </span>
            </div>
            {isEditingFund ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  className="h-8 px-2 text-lg font-bold w-24 border rounded"
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
                <div className="text-lg font-bold cursor-pointer hover:text-green-600" onClick={handleEditFund}>
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

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progreso fondo de emergencia</span>
            <span className="font-medium">{savingsProgress.toFixed(0)}%</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
              style={{ width: `${savingsProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatCurrency(financialSummary.emergencyFundStatus)}</span>
            <span>{formatCurrency(financialSummary.emergencyFundGoal)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 p-3 bg-muted/30 rounded-lg">
          <span className="text-sm font-medium flex items-center gap-1">
            Meses de respaldo
            <InfoTooltip content="¿Cuántos meses de gastos quieres tener reservados en tu fondo de emergencia? Recomendado: 3-6 meses." />
          </span>
          <select
            className="text-sm border rounded-md px-2 py-1 bg-background"
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
          {updateMonthsMutation.isPending && <span className="text-xs text-muted-foreground">Guardando...</span>}
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            {getTrendIcon()}
            <span className={getTrendColor()}>
              {financialSummary.trend === 'improving' ? 'Mejorando' :
               financialSummary.trend === 'declining' ? 'Empeorando' : 'Estable'}
            </span>
          </div>
          <div className="text-muted-foreground">
            📊 {financialSummary.historicalMonths} meses analizados
          </div>
          <div className="text-muted-foreground">
            📅 {financialSummary.deficitMonths} mes(es) en déficit
          </div>
        </div>

        {financialSummary.deficitMonths > 3 && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>Tienes {financialSummary.deficitMonths} meses con gastos superiores a ingresos. Considera revisar tu presupuesto.</span>
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
    <div className={`p-3 rounded-lg ${highlight ? 'bg-primary/10' : 'bg-muted/50'}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          {label}
          {tooltip && <InfoTooltip content={tooltip} />}
        </span>
      </div>
      <div className={`text-lg font-bold ${highlight ? 'text-primary' : ''}`}>
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-muted-foreground">{subtitle}</div>
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
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[profile as keyof typeof colors]} cursor-help`}>
        {labels[profile as keyof typeof labels]}
      </span>
    </Tooltip>
  )
}
