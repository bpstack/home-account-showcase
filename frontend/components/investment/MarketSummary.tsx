'use client'

import { RefreshCw } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { useMarketPrices } from '@/lib/queries/investment'
import { formatMoney, MISSING } from '@/lib/money'
import { ECONOMY_ROWS, formatIndicator, formatIndicatorPeriod } from '@/lib/economy'
import { cn, formatDistanceToNow } from '@/lib/utils'

const rate = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
})
const change = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
})

interface Row {
  key: string
  name: string
  value: string
  change: number | null | undefined
}

const orMissing = (value: number | null, format: (v: number) => string) =>
  value === null ? MISSING : format(value)

/**
 * Today's markets in one table, crypto and currencies against the euro, and how the economy is
 * doing in another, each figure with the period it belongs to. A figure its source did not give
 * shows as missing; none is made up.
 */
export function MarketSummary({ accountId }: { accountId: string }) {
  const { data, isLoading, isError, isFetching, refetch } = useMarketPrices(accountId, {
    refetchOnMount: false,
  })

  const groups: { title: string; rows: Row[] }[] = data
    ? [
        {
          title: 'Cripto',
          rows: data.cryptocurrencies.map((c) => ({
            key: c.symbol,
            name: c.name,
            value: formatMoney(c.price),
            change: c.change24h,
          })),
        },
        {
          title: 'Divisas',
          rows: data.currencies.map((c) => ({
            key: c.pair,
            name: c.pair,
            value: orMissing(c.rate, (v) => rate.format(v)),
            change: c.change24h,
          })),
        },
      ].filter((group) => group.rows.length > 0)
    : []

  return (
    <section aria-labelledby="markets">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="markets" className="text-sm font-medium text-text-primary">
          Mercados
        </h2>
        <div className="flex items-center gap-1 text-xs text-text-secondary">
          {data?.cachedAt && (
            <span>
              Actualizado {formatDistanceToNow(new Date(data.cachedAt), { addSuffix: true })}
            </span>
          )}
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Actualizar mercados"
            className="rounded-md p-2 hover:bg-layer-2 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <RefreshCw
              aria-hidden="true"
              className={cn('h-4 w-4', isFetching && 'motion-safe:animate-spin')}
            />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      ) : isError ? (
        <p className="text-sm text-text-secondary">No se han podido cargar los mercados.</p>
      ) : (
        <table className="w-full text-sm" aria-labelledby="markets">
          <thead>
            <tr className="text-xs text-text-secondary">
              <th scope="col" className="pb-2 text-left font-medium">
                Mercado
              </th>
              <th scope="col" className="pb-2 text-right font-medium">
                Valor
              </th>
              <th scope="col" className="pb-2 pl-3 text-right font-medium">
                Hoy
              </th>
            </tr>
          </thead>
          {groups.map((group) => (
            <tbody key={group.title} className="border-t border-layer-3">
              <tr>
                <th
                  scope="rowgroup"
                  colSpan={3}
                  className="pb-1 pt-3 text-left text-xs font-medium text-text-secondary"
                >
                  {group.title}
                </th>
              </tr>
              {group.rows.map((row) => (
                <tr key={row.key}>
                  <th scope="row" className="py-1.5 text-left font-normal text-text-primary">
                    {row.name}
                  </th>
                  <td className="py-1.5 text-right tabular-nums text-text-primary">{row.value}</td>
                  <td className="py-1.5 pl-3 text-right tabular-nums text-text-secondary">
                    {row.change === null || row.change === undefined
                      ? MISSING
                      : `${change.format(row.change).replace('-', '−')} %`}
                  </td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      )}

      {data && (
        <table className="mt-4 w-full text-sm" aria-labelledby="economy">
          <caption
            id="economy"
            className="border-t border-layer-3 pb-1 pt-3 text-left text-xs font-medium text-text-secondary"
          >
            Economía
          </caption>
          <thead className="sr-only">
            <tr>
              <th scope="col">Indicador</th>
              <th scope="col">Valor</th>
              <th scope="col">Periodo</th>
            </tr>
          </thead>
          <tbody>
            {ECONOMY_ROWS.map(({ key, name, detail }) => (
              <tr key={key}>
                <th scope="row" className="py-1.5 text-left font-normal text-text-primary">
                  {name}
                  <span className="block text-xs text-text-secondary">{detail}</span>
                </th>
                <td className="py-1.5 text-right tabular-nums text-text-primary">
                  {formatIndicator(data.economy[key])}
                </td>
                <td className="py-1.5 pl-3 text-right tabular-nums text-text-secondary">
                  {formatIndicatorPeriod(data.economy[key])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
