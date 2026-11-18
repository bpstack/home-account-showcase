'use client'

import { Money } from '@/components/ui'

interface ChartTooltipProps {
  active?: boolean
  label?: string
  payload?: { dataKey?: string | number; name?: string; value?: number; color?: string }[]
  /** Passed down by recharts from <Tooltip labelFormatter> */
  labelFormatter?: (_label: string) => string
}

/** The same tooltip for every chart: the label and each series with its amount. */
export function ChartTooltip({ active, label, payload, labelFormatter }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-layer-3 bg-layer-1 px-3 py-2 text-sm shadow-lg">
      <p className="mb-1 font-medium text-text-primary">
        {labelFormatter && label !== undefined ? labelFormatter(label) : label}
      </p>
      {payload.map((entry) => (
        <p key={String(entry.dataKey)} className="flex items-center gap-2 text-text-secondary">
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          {entry.name}
          <Money value={entry.value ?? null} tone="neutral" className="ml-auto pl-4" />
        </p>
      ))}
    </div>
  )
}

/** Theme colors for charts (SVG attributes accept CSS variables). */
export const chartColors = {
  income: 'var(--success)',
  expense: 'var(--danger)',
  line: 'hsl(var(--accent))',
  grid: 'var(--layer-3)',
  axis: 'var(--text-secondary)',
}
