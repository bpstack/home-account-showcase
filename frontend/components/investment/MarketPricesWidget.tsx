// components/investment/MarketPricesWidget.tsx
// Market prices widget for investment module

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useMarketPrices } from '@/lib/queries/investment'
import { RefreshCw, TrendingUp, TrendingDown, Bitcoin, BarChart3 } from 'lucide-react'
import { formatDistanceToNow, cn } from '@/lib/utils'

interface MarketPricesWidgetProps {
  accountId: string
  compact?: boolean
}

export function MarketPricesWidget({ accountId, compact = false }: MarketPricesWidgetProps) {
  const { data, isLoading, isError, refetch, isFetching } = useMarketPrices(accountId)

  if (isError) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Mercados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-4">
            Error al cargar precios
          </div>
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return <CompactView data={data} isLoading={isLoading} isFetching={isFetching} onRefresh={refetch} />
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Mercados en vivo
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <CompactSkeleton />
        ) : (
          <FullView data={data} />
        )}
      </CardContent>
    </Card>
  )
}

// ========================
// Full View
// ========================

function FullView({ data }: { data: any }) {
  if (!data) return null

  return (
    <div className="space-y-4">
      {/* Índices */}
      {data.indices && data.indices.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Índices
          </p>
          {data.indices.map((index: any) => (
            <MarketRow
              key={index.symbol}
              name={index.name}
              value={index.value}
              change={index.change24h}
              prefix=""
              formatter={(v) => v.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            />
          ))}
        </div>
      )}

      {/* Criptomonedas */}
      {data.cryptocurrencies && data.cryptocurrencies.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Criptomonedas
          </p>
          {data.cryptocurrencies.map((crypto: any) => (
            <MarketRow
              key={crypto.symbol}
              name={crypto.symbol}
              value={crypto.price}
              change={crypto.change24h}
              prefix="€"
              formatter={(v) => v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            />
          ))}
        </div>
      )}

      {/* Divisas */}
      {data.currencies && data.currencies.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Divisas
          </p>
          {data.currencies.map((currency: any) => (
            <MarketRow
              key={currency.pair}
              name={currency.pair}
              value={currency.rate}
              change={currency.change24h}
              prefix=""
              formatter={(v) => v.toFixed(4)}
            />
          ))}
        </div>
      )}

      {/* Timestamp */}
      {data.cachedAt && (
        <p className="text-xs text-muted-foreground text-center pt-2 border-t">
          Actualizado {formatDistanceToNow(new Date(data.cachedAt), { addSuffix: true })}
        </p>
      )}
    </div>
  )
}

// ========================
// Compact View - Solo S&P 500 y Bitcoin
// ========================

function CompactView({ data, isLoading, isFetching, onRefresh }: any) {
  if (isLoading) {
    return <CompactSkeleton />
  }

  const sp500 = data?.indices?.find((i: any) => i.symbol === 'SP500')
  const btc = data?.cryptocurrencies?.find((c: any) => c.symbol === 'bitcoin')

  return (
    <div className="flex items-center gap-2 text-sm overflow-x-auto no-scrollbar max-w-[calc(100vw-4rem)] md:max-w-none">
      {sp500 ? (
        <div className="flex items-center gap-2 bg-background/50 hover:bg-background/80 transition-colors px-3 py-1.5 rounded-full border border-border/50 shadow-sm cursor-default group">
          <span className="text-muted-foreground text-xs font-semibold group-hover:text-foreground transition-colors">S&P</span>
          <span className="font-mono font-medium">{sp500.value.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
          <ChangeBadge change={sp500.change24h} variant="pill" />
        </div>
      ) : null}
      {btc ? (
        <div className="flex items-center gap-2 bg-background/50 hover:bg-background/80 transition-colors px-3 py-1.5 rounded-full border border-border/50 shadow-sm cursor-default group">
          <Bitcoin className="h-3.5 w-3.5 text-muted-foreground group-hover:text-amber-500 transition-colors" />
          <span className="font-mono font-medium">€{btc.price.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
          <ChangeBadge change={btc.change24h} variant="pill" />
        </div>
      ) : null}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRefresh()}
        disabled={isFetching}
        className="h-8 w-8 rounded-full hover:bg-background/80 text-muted-foreground hover:text-primary transition-colors"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  )
}

function CompactSkeleton() {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <div className="h-4 w-12 bg-muted rounded animate-pulse" />
        <div className="h-4 w-8 bg-muted rounded animate-pulse" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-4 w-12 bg-muted rounded animate-pulse" />
        <div className="h-4 w-8 bg-muted rounded animate-pulse" />
      </div>
    </div>
  )
}

// ========================
// Market Row Component
// ========================

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

  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-foreground">{name}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono">
          {prefix}{formatter(valueNumber)}
        </span>
        <ChangeBadge change={changeValue} />
      </div>
    </div>
  )
}

function ChangeBadge({ change, variant = 'default' }: { change: number, variant?: 'default' | 'pill' }) {
  const isPositive = (change || 0) >= 0
  const isNeutral = Math.abs(change || 0) < 0.1

  if (isNeutral) {
    return (
      <span className={cn(
        "text-muted-foreground bg-muted px-1.5 py-0.5 rounded text-xs",
        variant === 'pill' && "bg-transparent px-0"
      )}>
        0%
      </span>
    )
  }

  const colorClass = isPositive
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-rose-600 dark:text-rose-400'

  const bgClass = isPositive
    ? 'bg-emerald-500/10 dark:bg-emerald-500/20'
    : 'bg-rose-500/10 dark:bg-rose-500/20'

  if (variant === 'pill') {
    return (
      <span className={cn("text-xs font-bold flex items-center gap-0.5", colorClass)}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {Math.abs(change).toFixed(2)}%
      </span>
    )
  }

  return (
    <span className={cn(
      "text-xs font-medium px-1.5 py-0.5 rounded backdrop-blur-sm",
      colorClass,
      bgClass
    )}>
      {isPositive ? '+' : ''}{change?.toFixed(2)}%
    </span>
  )
}
