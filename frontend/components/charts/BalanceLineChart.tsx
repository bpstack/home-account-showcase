'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatMoneyCompact } from '@/lib/money'
import { ChartTooltip, chartColors } from './ChartTooltip'

interface BalanceData {
  date: string
  balance: number
  [key: string]: string | number
}

interface Props {
  data: BalanceData[]
}

/** The balance at the end of each month. Straight segments: a curve would draw values that never existed. */
export function BalanceLineChart({ data }: Props) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={chartColors.grid} />
          <XAxis
            dataKey="date"
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
          <Tooltip content={<ChartTooltip />} />
          <Line
            type="linear"
            dataKey="balance"
            name="Saldo"
            stroke={chartColors.line}
            strokeWidth={2}
            dot={{ r: 3, fill: chartColors.line, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
