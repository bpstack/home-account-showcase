// components/investment/Recommendations.tsx
// Investment recommendations component

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useRecommendations, useInvestmentOverview } from '@/lib/queries/investment'
import { DisclaimerAlert } from './DisclaimerAlert'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ArrowRight,
  Wallet,
  Coins,
  Info
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'

interface RecommendationsProps {
  accountId: string
  profile?: string
  monthlyAmount?: number
}

export function Recommendations({ accountId, profile, monthlyAmount }: RecommendationsProps) {
  const { data, isLoading, isError, refetch } = useRecommendations(
    accountId,
    profile ? { profile } : undefined
  )

  const { data: overviewData } = useInvestmentOverview(accountId)
  const investmentPercentage = overviewData?.profile?.investmentPercentage || 20
  const savingsCapacity = overviewData?.financialSummary?.savingsCapacity || 0
  const investmentAmount = (savingsCapacity * investmentPercentage) / 100

  if (isLoading) {
    return <RecommendationsSkeleton />
  }

  if (isError || !data) {
    return (
      <Card className="border-emerald-200 dark:border-emerald-800/50 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 dark:from-gray-900 dark:to-gray-800/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <TrendingUp className="h-5 w-5" />
            Plan de Inversión Mensual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            Error al cargar recomendaciones
            <Button variant="ghost" onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-emerald-200/50 dark:border-emerald-800/30 bg-gradient-to-br from-emerald-50/30 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400/90">
          <TrendingUp className="h-5 w-5" />
          Plan de Inversión Mensual ({investmentPercentage}%)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <DisclaimerAlert type="recommendations" />

        {/* Resumen */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-4 rounded-xl border border-emerald-200/50 dark:border-emerald-800/50 bg-white/50 dark:bg-gray-800/50">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(investmentAmount)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Mensual a invertir
              <span className="block text-[10px] opacity-70 mt-0.5">
                ({investmentPercentage}% de {formatCurrency(savingsCapacity)})
              </span>
            </div>
          </div>
          <div className="p-4 rounded-xl border border-green-200/50 dark:border-green-800/50 bg-green-50/50 dark:bg-green-900/20">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {data.assetAllocation.stocks + data.assetAllocation.crypto}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Acciones/crypto
              <span className="block text-[10px] opacity-70 mt-0.5">
                {formatCurrency(investmentAmount * (data.assetAllocation.stocks + data.assetAllocation.crypto) / 100)}
              </span>
            </div>
          </div>
          <div className="p-4 rounded-xl border border-blue-200/50 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-900/20">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {data.assetAllocation.bonds + data.assetAllocation.cash}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Bonos/liquidez
              <span className="block text-[10px] opacity-70 mt-0.5">
                {formatCurrency(investmentAmount * (data.assetAllocation.bonds + data.assetAllocation.cash) / 100)}
              </span>
            </div>
          </div>
        </div>

        {/* Gráfico de distribución */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[
                  { name: 'Acciones', value: data.assetAllocation.stocks, color: '#22c55e' },
                  { name: 'Bonos', value: data.assetAllocation.bonds, color: '#3b82f6' },
                  { name: 'Crypto', value: data.assetAllocation.crypto, color: '#f59e0b' },
                  { name: 'Liquidez', value: data.assetAllocation.cash, color: '#6b7280' }
                ]}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {data.recommendations.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#22c55e', '#3b82f6', '#f59e0b', '#6b7280'][index % 4]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number | undefined) => `${value ?? 0}%`}
                contentStyle={{
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px'
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Lista de recomendaciones */}
        <div className="space-y-3">
          {data.recommendations.map((rec, index) => (
            <RecommendationCard key={index} recommendation={rec} amount={investmentAmount} />
          ))}
        </div>

        {/* Market context */}
        {data.marketContext && (
          <div className="p-3 bg-muted rounded-lg text-sm">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <span className="text-muted-foreground">{data.marketContext}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ========================
// Subcomponents
// ========================

function RecommendationCard({ recommendation, amount }: { recommendation: any; amount: number }) {
  const typeIcons = {
    ETF: <TrendingUp className="h-4 w-4" />,
    BOND_FUND: <Wallet className="h-4 w-4" />,
    CRYPTO: <Coins className="h-4 w-4" />,
    STOCK: <TrendingUp className="h-4 w-4" />,
    SAVINGS: <PiggyBank className="h-4 w-4" />
  }

  const typeColors = {
    ETF: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    BOND_FUND: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    CRYPTO: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    STOCK: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    SAVINGS: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'
  }

  const riskColors = {
    low: 'text-green-600',
    medium: 'text-yellow-600',
    high: 'text-red-600'
  }

  const recommendationAmount = (amount * recommendation.percentage) / 100

  return (
    <div className="p-4 border border-border/40 dark:border-border/20 rounded-lg hover:border-primary/30 transition-colors bg-card/50">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            typeColors[recommendation.type as keyof typeof typeColors]
          )}>
            {typeIcons[recommendation.type as keyof typeof typeIcons]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-foreground/90">{recommendation.name}</h4>
              <span className="text-xs text-muted-foreground">
                ({recommendation.symbol})
              </span>
            </div>
            <p className="text-sm text-muted-foreground/80 mt-1">
              {recommendation.reason}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="font-bold text-lg text-foreground/90">
            {formatCurrency(recommendationAmount)}
          </div>
          <div className="text-sm text-muted-foreground">
            {recommendation.percentage}% del mensual
          </div>
          <div className={cn(
            'text-xs font-medium mt-1',
            riskColors[recommendation.risk as keyof typeof riskColors]
          )}>
            Riesgo {recommendation.risk}
          </div>
        </div>
      </div>

      {recommendation.units && (
        <div className="mt-2 text-xs text-muted-foreground/70 text-right">
          ≈ {recommendation.units.toFixed(4)} unidades a {formatCurrency(recommendation.currentPrice || 0)}
        </div>
      )}
    </div>
  )
}

function RecommendationsSkeleton() {
  return (
    <Card className="border-emerald-200 dark:border-emerald-800/50 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 dark:from-gray-900 dark:to-gray-800/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
          <TrendingUp className="h-5 w-5" />
          Plan de Inversión Mensual
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-64 bg-muted/50 rounded-lg animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </CardContent>
    </Card>
  )
}
