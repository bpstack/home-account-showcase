'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatMoneyCompact } from '@/lib/money'
import { ChartTooltip, chartColors } from './ChartTooltip'

interface MonthlyData {
  month: string
  income: number
  expenses: number
  [key: string]: string | number
}

interface Props {
  data: MonthlyData[]
}

/** Income and expenses per month, side by side; the axis in euros. */
export function MonthlyBarChart({ data }: Props) {
  return (
    <div className="w-full">
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
            <CartesianGrid vertical={false} stroke={chartColors.grid} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fill: chartColors.axis, fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={formatMoneyCompact}
              tickLine={false}
              axisLine={false}
              tick={{ fill: chartColors.axis, fontSize: 12 }}
              width={64}
            />
            <Tooltip cursor={{ fill: chartColors.grid, opacity: 0.4 }} content={<ChartTooltip />} />
            <Bar dataKey="income" name="Ingresos" fill={chartColors.income} radius={[3, 3, 0, 0]} />
            <Bar
              dataKey="expenses"
              name="Gastos"
              fill={chartColors.expense}
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center justify-center gap-4 text-xs text-text-secondary">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-success" />
          Ingresos
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-danger" />
          Gastos
        </span>
      </div>
    </div>
  )
}
