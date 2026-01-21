// components/investment/MarketSummary.tsx
// Resumen de mercados - diseño consistente modo claro/oscuro

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useMarketPrices } from '@/lib/queries/investment'
import { RefreshCw, BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface MarketSummaryProps {
  accountId: string
}

export function MarketSummary({ accountId }: MarketSummaryProps) {
  const { data, isLoading, isError, refetch, isFetching } = useMarketPrices(accountId, false)
  const [showTooltip, setShowTooltip] = useState(false)

  if (isError) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-foreground">
            <BarChart3 className="h-4 w-4" />
            Mercados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-2 text-sm text-muted-foreground">
            Error al cargar
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 text-foreground/90">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Mercados
          </CardTitle>
          <div className="relative">
            <button
              onClick={() => refetch()}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              disabled={isFetching}
              className={cn(
                'p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground',
                isFetching && 'animate-spin'
              )}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            {showTooltip && (
              <div className="absolute right-0 top-full mt-1 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md whitespace-nowrap z-10">
                Actualizar
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <MarketSummarySkeleton />
        ) : data ? (
          <MarketSummaryContent data={data} />
        ) : null}
      </CardContent>
    </Card>
  )
}

function MarketSummaryContent({ data }: { data: any }) {
  return (
    <div className="space-y-3 text-sm">
      <TrendBadge trend={data.marketTrend} />
      {/* Índices */}
      <MarketSection
        title="ÍNDICES"
        items={data.indices}
        prefix=""
        formatter={(v) => v.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
      />

      {/* Criptomonedas */}
      <MarketSection
        title="CRIPTOMONEDAS"
        items={data.cryptocurrencies}
        prefix="€"
        formatter={(v) => v.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
      />

      {/* Divisas */}
      <MarketSection
        title="DIVISAS"
        items={data.currencies}
        prefix=""
        formatter={(v) => v.toFixed(4)}
      />
    </div>
  )
}

function TrendBadge({ trend }: { trend?: 'alcista' | 'bajista' | 'neutral' }) {
  if (!trend || trend === 'neutral') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg border border-border/40">
        <Minus className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Mercado neutral</span>
      </div>
    )
  }

  const isBullish = trend === 'alcista'

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg border',
      isBullish
        ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50'
        : 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900/50'
    )}>
      {isBullish ? (
        <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
      )}
      <span className={cn(
        'text-sm font-medium',
        isBullish
          ? 'text-emerald-700 dark:text-emerald-300'
          : 'text-red-700 dark:text-red-300'
      )}>
        Mercado {trend === 'alcista' ? 'alcista' : 'bajista'}
      </span>
    </div>
  )
}

function MarketSection({
  title,
  items,
  prefix,
  formatter
}: {
  title: string
  items: any[]
  prefix: string
  formatter: (v: number) => string
}) {
  if (!items || items.length === 0) return null

  return (
    <div>
      <h4 className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider mb-1.5 border-b border-border/40 dark:border-border/20 pb-1">
        {title}
      </h4>
      <div className="space-y-0.5">
        {items.map((item) => (
          <MarketRow
            key={item.symbol || item.pair}
            name={item.name || item.pair}
            value={item.value || item.price}
            change={item.change24h}
            prefix={prefix}
            formatter={formatter}
          />
        ))}
      </div>
    </div>
  )
}

function MarketRow({
  name,
  value,
  change,
  prefix = '',
  formatter = (v: number) => v.toLocaleString()
}: {
  name: string
  value?: number | null
  change?: number | null
  prefix?: string
  formatter?: (v: number) => string
}) {
  const changeValue = change ?? 0
  const valueNumber = value ?? 0
  const isPositive = changeValue >= 0
  const isNeutral = Math.abs(changeValue) < 0.1

  return (
    <div className={cn(
      'grid grid-cols-[1fr_85px_65px] gap-2 items-center py-1 px-1.5 rounded transition-colors',
      'hover:bg-muted/40'
    )}>
      <span className="text-xs font-medium text-foreground/80 truncate" title={name}>{name}</span>
      <span className="text-xs font-mono text-foreground/80 text-right">
        {prefix}{formatter(valueNumber)}
      </span>
      <span className={cn(
        'text-xs font-medium px-1.5 py-0.5 rounded text-center',
        isNeutral && 'bg-muted/60 text-muted-foreground',
        isPositive && changeValue > 0.1 && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
        !isPositive && changeValue < -0.1 && 'bg-red-500/15 text-red-600 dark:text-red-400'
      )}>
        {isNeutral ? '0.00%' : `${isPositive ? '+' : ''}${changeValue.toFixed(2)}%`}
      </span>
    </div>
  )
}

function MarketSummarySkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="space-y-0.5">
        <div className="h-4 w-12 bg-muted rounded border-b border-border" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="grid grid-cols-[1fr_85px_65px] gap-2 py-1 px-1.5">
            <div className="h-3 bg-muted rounded" />
            <div className="h-3 bg-muted rounded" />
            <div className="h-3 bg-muted rounded" />
          </div>
        ))}
      </div>
      <div className="space-y-0.5">
        <div className="h-4 w-16 bg-muted rounded border-b border-border" />
        {[1, 2].map((i) => (
          <div key={i} className="grid grid-cols-[1fr_85px_65px] gap-2 py-1 px-1.5">
            <div className="h-3 bg-muted rounded" />
            <div className="h-3 bg-muted rounded" />
            <div className="h-3 bg-muted rounded" />
          </div>
        ))}
      </div>
      <div className="space-y-0.5">
        <div className="h-4 w-14 bg-muted rounded border-b border-border" />
        {[1, 2].map((i) => (
          <div key={i} className="grid grid-cols-[1fr_85px_65px] gap-2 py-1 px-1.5">
            <div className="h-3 bg-muted rounded" />
            <div className="h-3 bg-muted rounded" />
            <div className="h-3 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
