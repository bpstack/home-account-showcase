'use client'

import { Money } from '@/components/ui'
import Link from 'next/link'
import { periodLabel, type Period } from '@/lib/period'

interface SavingsTabProps {
  stats: { income: number; expenses: number; balance: number }
  period: Period
}

const percent = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 })

/** What was saved in the period and where that pace leads in a year. */
export function SavingsTab({ stats, period }: SavingsTabProps) {
  const saved = stats.income - stats.expenses
  const rate = stats.income > 0 ? (saved / stats.income) * 100 : null
  // Only a month's pace can be projected to a year
  const projection =
    period.kind === 'month'
      ? [
          { label: 'Ahorrarías', value: Math.max(0, saved) * 12 },
          { label: 'Con el objetivo de ahorrar el 30 %', value: stats.income * 0.3 * 12 },
          { label: 'Invirtiendo lo ahorrado al 5 % anual', value: Math.max(0, saved) * 12 * 1.05 },
        ]
      : null
  const title =
    period.kind === 'all'
      ? 'Ahorro total'
      : period.kind === 'range'
        ? 'Ahorro en estas fechas'
        : `Ahorro de ${periodLabel(period).toLowerCase()}`

  return (
    <div className="max-w-3xl space-y-8">
      <section aria-labelledby="savings-total">
        <h2 id="savings-total" className="text-sm text-text-secondary">
          {title}
        </h2>
        <p className="mt-1 text-2xl font-bold sm:text-3xl">
          <Money value={saved} />
        </p>
        {rate !== null && (
          <p className="mt-2 text-sm text-text-secondary">
            {saved >= 0
              ? `Ahorras el ${percent.format(rate)} % de lo que ingresas.`
              : `Gastas un ${percent.format(-rate)} % más de lo que ingresas.`}
          </p>
        )}
      </section>

      {projection && (
        <section aria-labelledby="savings-projection">
          <h2 id="savings-projection" className="mb-3 text-sm font-medium text-text-primary">
            Si sigues a este ritmo, en un año
          </h2>
          <dl className="divide-y divide-layer-3 border-y border-layer-3">
            {projection.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-4 py-3 text-sm">
                <dt className="text-text-secondary">{row.label}</dt>
                <dd>
                  <Money value={row.value} tone="neutral" className="font-medium" />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <p className="text-sm text-text-secondary">
        Qué hacer con lo que ahorras, en{' '}
        <Link href="/investment" className="text-accent hover:underline">
          Inversión
        </Link>
        .
      </p>
    </div>
  )
}
