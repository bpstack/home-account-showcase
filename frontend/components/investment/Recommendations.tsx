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

  const { data: overviewData } = useInvestmentOverview(accountId, { refetchOnMount: false })
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
    <Card className="h-full border-border/50 bg-background/50 dark:bg-card/40 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-6 border-b border-border/40">
        <CardTitle className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
            </div>
            <span className="text-xl font-bold tracking-tight">Plan de Inversión</span>
          </div>
          <span className="text-sm font-medium text-muted-foreground bg-muted/50 px-3 py-1 rounded-full border border-border/50">
            {investmentPercentage}% ahorro
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <DisclaimerAlert type="recommendations" />

        {/* Resumen */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
          <div className="p-2 sm:p-4 rounded-xl sm:rounded-2xl bg-muted/30 dark:bg-muted/10 border border-border/50 flex flex-col justify-center">
            <div className="text-lg sm:text-3xl font-bold text-foreground tracking-tight">
              {formatCurrency(investmentAmount)}
            </div>
            <div className="text-[10px] sm:text-xs font-semibold text-muted-foreground mt-1 uppercase tracking-wider">
              Mensual
            </div>
          </div>
          <div className="p-2 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 flex flex-col justify-center">
            <div className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {data.assetAllocation.stocks + data.assetAllocation.crypto}%
            </div>
            <div className="text-[10px] sm:text-xs font-medium text-emerald-600/80 dark:text-emerald-400/80 mt-1">
              R. Variable
            </div>
          </div>
          <div className="p-2 sm:p-4 rounded-xl sm:rounded-2xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 flex flex-col justify-center">
            <div className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
              {data.assetAllocation.bonds + data.assetAllocation.cash}%
            </div>
            <div className="text-[10px] sm:text-xs font-medium text-blue-600/80 dark:text-blue-400/80 mt-1">
              R. Fija
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
    ETF: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    BOND_FUND: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    CRYPTO: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    STOCK: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    SAVINGS: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400'
  }

  const riskColors = {
    low: 'text-green-600',
    medium: 'text-yellow-600',
    high: 'text-red-600'
  }

  const recommendationAmount = (amount * recommendation.percentage) / 100

  return (
    <div className="p-2 sm:p-3 rounded-lg border border-border/40 dark:bg-zinc-900 dark:border-white/5 hover:bg-muted/10 transition-colors group">
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className={cn(
            'p-1.5 sm:p-2 rounded-lg shrink-0',
             typeColors[recommendation.type as keyof typeof typeColors] || 'bg-muted text-muted-foreground'
          )}>
            {typeIcons[recommendation.type as keyof typeof typeIcons]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              <h4 className="font-semibold text-foreground text-xs sm:text-sm truncate">{recommendation.name}</h4>
              <span className="text-[9px] sm:text-[10px] uppercase text-muted-foreground">
                {recommendation.symbol}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
              {recommendation.reason}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="font-semibold text-xs sm:text-sm text-foreground">
            {formatCurrency(recommendationAmount)}
          </div>
          <div className={cn(
            'text-[8px] sm:text-[9px] font-bold mt-1 inline-flex items-center px-1 sm:px-1.5 py-0.5 rounded border',
            riskColors[recommendation.risk as keyof typeof riskColors] === 'text-green-600' ? 'bg-green-500/5 border-green-500/10 text-green-600 dark:text-green-400' :
            riskColors[recommendation.risk as keyof typeof riskColors] === 'text-yellow-600' ? 'bg-yellow-500/5 border-yellow-500/10 text-yellow-600 dark:text-yellow-400' :
            'bg-red-500/5 border-red-500/10 text-red-600 dark:text-red-400'
          )}>
            {recommendation.risk.toUpperCase()}
          </div>
        </div>
      </div>
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
