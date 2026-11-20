'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { CategorySummary } from '@/lib/apiClient'
import { useTransactions, useTransactionStats } from '@/lib/queries/transactions'
import { Figures, Money } from '@/components/ui'
import { TxList } from '@/components/transactions/TxList'
import { formatMoney } from '@/lib/money'
import { periodLabel, periodRange, previousPeriod, type Period } from '@/lib/period'

interface OverviewTabProps {
  stats: { income: number; expenses: number; balance: number }
  summary: CategorySummary[]
  period: Period
}

interface CategoryRow {
  name: string
  color: string
  amount: number
  subcategories: { name: string; amount: number }[]
}

type Kind = 'expense' | 'income'

/** Expenses (or income) grouped by category, largest first; the other kind is left out. */
function byCategory(summary: CategorySummary[], kind: Kind): CategoryRow[] {
  const map = new Map<string, CategoryRow>()
  for (const item of summary) {
    const signed = Number(item.total_amount)
    if (!(kind === 'expense' ? signed < 0 : signed > 0)) continue
    const amount = -Math.abs(signed)
    const name = item.category_name || 'Sin categoría'
    let row = map.get(name)
    if (!row) {
      row = { name, color: item.category_color || '', amount: 0, subcategories: [] }
      map.set(name, row)
    }
    row.amount += -amount
    if (item.subcategory_name)
      row.subcategories.push({ name: item.subcategory_name, amount: -amount })
  }
  const rows = [...map.values()].sort((a, b) => b.amount - a.amount)
  for (const row of rows) row.subcategories.sort((a, b) => b.amount - a.amount)
  return rows
}

const percent = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 })

/** One sentence comparing expenses with the previous period, or nothing if there is none. */
function ExpensesComparison({ period, expenses }: { period: Period; expenses: number }) {
  const { account } = useAuth()
  const previous = previousPeriod(period)
  const range = previous ? periodRange(previous) : { start: '', end: '' }
  const { data } = useTransactionStats(account?.id || '', range.start, range.end, {
    enabled: !!account?.id && !!previous,
  })
  const before = data?.stats?.expenses
  if (!previous || !before) return null

  const diff = expenses - before
  const when = periodLabel(previous).toLowerCase()
  if (Math.abs(diff) < 0.005) {
    return <p className="text-sm text-text-secondary">Has gastado lo mismo que en {when}.</p>
  }
  return (
    <p className="text-sm text-text-secondary">
      Has gastado {formatMoney(Math.abs(diff), 'never')} {diff < 0 ? 'menos' : 'más'} que en {when}{' '}
      ({diff < 0 ? '−' : '+'}
      {percent.format(Math.abs(diff / before) * 100)} %).
    </p>
  )
}

function CategoryBreakdown({ rows, emptyText }: { rows: CategoryRow[]; emptyText: string }) {
  const [open, setOpen] = useState<string | null>(null)
  const total = rows.reduce((sum, row) => sum + row.amount, 0)

  if (rows.length === 0) {
    return <p className="py-6 text-sm text-text-secondary">{emptyText}</p>
  }

  return (
    <ul className="divide-y divide-layer-3 border-y border-layer-3">
      {rows.map((row) => {
        const share = total > 0 ? (row.amount / total) * 100 : 0
        const expanded = open === row.name
        const canExpand = row.subcategories.length > 1
        return (
          <li key={row.name} className="py-3">
            <button
              type="button"
              onClick={() => canExpand && setOpen(expanded ? null : row.name)}
              aria-expanded={canExpand ? expanded : undefined}
              disabled={!canExpand}
              className="flex w-full items-center gap-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
            >
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-layer-3"
                style={row.color ? { backgroundColor: row.color } : undefined}
              />
              <span className="min-w-0 flex-1 truncate text-text-primary">{row.name}</span>
              <span className="w-10 text-right tabular-nums text-text-secondary">
                {percent.format(share)} %
              </span>
              <Money value={row.amount} sign="never" tone="neutral" className="w-28 text-right" />
              <ChevronDown
                aria-hidden="true"
                className={`h-4 w-4 flex-shrink-0 text-text-secondary transition-transform motion-reduce:transition-none ${
                  canExpand ? '' : 'invisible'
                } ${expanded ? 'rotate-180' : ''}`}
              />
            </button>
            <div className="mt-2 ml-5 h-1.5 overflow-hidden rounded-full bg-layer-2">
              <div
                className="h-full rounded-full bg-accent"
                style={{
                  width: `${share}%`,
                  ...(row.color ? { backgroundColor: row.color } : {}),
                }}
              />
            </div>
            {expanded && (
              <ul className="mt-3 ml-5 space-y-2">
                {row.subcategories.map((sub) => (
                  <li key={sub.name} className="flex items-center gap-3 text-sm">
                    <span className="min-w-0 flex-1 truncate text-text-secondary">{sub.name}</span>
                    <Money
                      value={sub.amount}
                      sign="never"
                      tone="neutral"
                      className="w-28 text-right"
                    />
                    <span className="w-4" aria-hidden="true" />
                  </li>
                ))}
              </ul>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function LatestMovements({ period }: { period: Period }) {
  const { account } = useAuth()
  const { start, end } = periodRange(period)
  const { data, isLoading } = useTransactions({
    account_id: account?.id || '',
    start_date: start,
    end_date: end,
    limit: 5,
    offset: 0,
  })
  const rows = data?.transactions || []

  if (isLoading) return <p className="py-6 text-sm text-text-secondary">Cargando…</p>
  if (rows.length === 0) {
    return <p className="py-6 text-sm text-text-secondary">No hay transacciones en este periodo.</p>
  }
  return <TxList transactions={rows} />
}

/** The period at a glance: the three figures, where the money went, and the latest transactions. */
export function OverviewTab({ stats, summary, period }: OverviewTabProps) {
  const [kind, setKind] = useState<Kind>('expense')
  const categories = useMemo(() => byCategory(summary, kind), [summary, kind])

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Figures income={stats.income} expenses={stats.expenses} />
        <ExpensesComparison period={period} expenses={stats.expenses} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-labelledby="overview-categories">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="overview-categories" className="text-sm font-medium text-text-primary">
              Por categoría
            </h2>
            <div className="flex rounded-lg bg-layer-2 p-0.5 text-sm">
              {(
                [
                  ['expense', 'Gastos'],
                  ['income', 'Ingresos'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setKind(value)}
                  aria-pressed={kind === value}
                  className={`rounded-md px-3 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    kind === value
                      ? 'bg-layer-1 font-medium text-text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <CategoryBreakdown
            rows={categories}
            emptyText={
              kind === 'expense'
                ? 'No hay gastos en este periodo.'
                : 'No hay ingresos en este periodo.'
            }
          />
        </section>

        <section aria-labelledby="overview-latest">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="overview-latest" className="text-sm font-medium text-text-primary">
              Últimas transacciones
            </h2>
            <Link href="/transactions" className="text-sm text-accent hover:underline">
              Ver todas
            </Link>
          </div>
          <LatestMovements period={period} />
        </section>
      </div>
    </div>
  )
}
