// components/investment/InvestmentWidget.tsx
// Compact investment widget for dashboard

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useInvestmentOverview } from '@/lib/queries/investment'
import { TrendingUp, ArrowRight, Sparkles, PiggyBank, Wallet, Target } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'

interface InvestmentWidgetProps {
  accountId: string
  compact?: boolean
}

export function InvestmentWidget({ accountId, compact = false }: InvestmentWidgetProps) {
  const { data, isLoading, isError } = useInvestmentOverview(accountId)

  if (isLoading) {
    return <InvestmentWidgetSkeleton compact={compact} />
  }

  if (isError || !data) {
    return null
  }

  const { financialSummary, profile, marketPrices } = data

  if (compact) {
    return (
      <Card className="bg-gradient-to-br from-accent/10 to-primary/10 border-accent/20">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/20">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium">Módulo de Inversión</p>
                <p className="text-xs text-muted-foreground">
                  {profile ? `${profile.riskProfile} • ${data.financialSummary.savingsRate.toFixed(0)}% ahorro` : 'Sin configurar'}
                </p>
              </div>
            </div>
            <a
              href="/investment"
              className="inline-flex items-center justify-center gap-2 h-8 px-3 text-xs font-medium rounded-md border border-layer-3 bg-transparent hover:bg-layer-1 text-text-primary transition-colors"
            >
              Ver <ArrowRight className="h-3 w-3 ml-1" />
            </a>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gradient-to-br from-accent/5 to-primary/5 border-accent/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-accent" />
          Inversión
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3">
          <QuickStat
            icon={<PiggyBank className="h-4 w-4" />}
            label="Ahorro mensual"
            value={formatCurrency(financialSummary.savingsCapacity)}
            color="text-green-600"
          />
          <QuickStat
            icon={<Wallet className="h-4 w-4" />}
            label="Tasa ahorro"
            value={`${financialSummary.savingsRate.toFixed(1)}%`}
            color="text-accent"
          />
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Fondo de emergencia</span>
            <span className="font-medium">
              {((financialSummary.emergencyFundStatus / financialSummary.emergencyFundGoal) * 100).toFixed(0)}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"
              style={{ width: `${Math.min(100, (financialSummary.emergencyFundStatus / financialSummary.emergencyFundGoal) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(financialSummary.emergencyFundStatus)} de {formatCurrency(financialSummary.emergencyFundGoal)}
          </p>
        </div>

        {/* Market preview */}
        {marketPrices && (
          <div className="p-3 bg-background/50 rounded-lg space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase">Mercados</p>
            <div className="flex justify-between text-sm">
              <span>S&P 500</span>
              <span className={cn(
                'font-medium',
                marketPrices.sp500.change24h >= 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {marketPrices.sp500.change24h >= 0 ? '+' : ''}{marketPrices.sp500.change24h.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Bitcoin</span>
              <span className={cn(
                'font-medium',
                marketPrices.btc.change24h >= 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {marketPrices.btc.change24h >= 0 ? '+' : ''}{marketPrices.btc.change24h.toFixed(2)}%
              </span>
            </div>
          </div>
        )}

        {/* Profile badge */}
        {profile && (
          <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Perfil</span>
            </div>
            <Badge profile={profile.riskProfile} />
          </div>
        )}

        {/* CTA */}
        <a
          href="/investment"
          className="inline-flex items-center justify-center w-full h-10 px-4 py-2 text-sm font-medium rounded-md bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Acceder al módulo
        </a>

        <p className="text-xs text-muted-foreground text-center">
          Recomendaciones personalizadas basadas en tu historial
        </p>
      </CardContent>
    </Card>
  )
}

// ========================
// Subcomponents
// ========================

function QuickStat({
  icon,
  label,
  value,
  color
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: string
}) {
  return (
    <div className="flex items-center gap-2 p-2 bg-background/50 rounded-lg">
      <div className={color}>{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  )
}

function Badge({ profile }: { profile: string }) {
  const colors: Record<string, string> = {
    conservative: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    balanced: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    dynamic: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
  }

  const labels: Record<string, string> = {
    conservative: 'Conservador',
    balanced: 'Equilibrado',
    dynamic: 'Dinámico'
  }

  return (
    <span className={cn(
      'px-2 py-1 rounded-full text-xs font-medium',
      colors[profile] || colors.balanced
    )}>
      {labels[profile] || 'Equilibrado'}
    </span>
  )
}

function InvestmentWidgetSkeleton({ compact }: { compact: boolean }) {
  if (compact) {
    return (
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="animate-pulse flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-muted rounded-lg" />
              <div className="space-y-2">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-3 w-32 bg-muted rounded" />
              </div>
            </div>
            <div className="h-8 w-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="h-5 w-32 bg-muted rounded animate-pulse" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="h-16 bg-muted rounded animate-pulse" />
          <div className="h-16 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-20 bg-muted rounded animate-pulse" />
        <div className="h-10 bg-muted rounded animate-pulse" />
      </CardContent>
    </Card>
  )
}
