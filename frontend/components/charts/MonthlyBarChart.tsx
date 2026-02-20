'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { useState } from 'react'

interface MonthlyData {
  month: string
  income: number
  expenses: number
  [key: string]: string | number
}

interface Props {
  data: MonthlyData[]
}

export function MonthlyBarChart({ data }: Props) {
  const [hoveredBar, setHoveredBar] = useState<{ dataKey: string; index: number } | null>(null)

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return '-'
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(Math.abs(value))
  }

  const formatYAxis = (value: number | undefined) => {
    if (value === undefined) return '-'
    const thousands = Math.abs(value) / 1000
    return thousands.toFixed(1)
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const minWidth = isMobile ? Math.max(data.length * 60, 600) : '100%'

  return (
    <div className="w-full">
      <div className="w-full overflow-x-auto">
        <ResponsiveContainer width={minWidth} height={300}>
          <BarChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
            <YAxis tickFormatter={formatYAxis} stroke="#9CA3AF" fontSize={12} width={40} />
            <Tooltip
              cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
              formatter={(value: number | undefined) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F9FAFB',
              }}
              labelStyle={{ color: '#F9FAFB' }}
            />
            <Bar dataKey="income" name="Ingresos" radius={[4, 4, 0, 0]}>
              {data.map((_, index) => {
                const isHovered = hoveredBar?.dataKey === 'income' && hoveredBar?.index === index
                return (
                  <Cell
                    key={`income-${index}`}
                    fill="#22C55E"
                    opacity={isHovered ? 0.5 : 1}
                    style={{ transition: 'opacity 0.2s ease', cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredBar({ dataKey: 'income', index })}
                    onMouseLeave={() => setHoveredBar(null)}
                  />
                )
              })}
            </Bar>
            <Bar dataKey="expenses" name="Gastos" radius={[4, 4, 0, 0]}>
              {data.map((_, index) => {
                const isHovered = hoveredBar?.dataKey === 'expenses' && hoveredBar?.index === index
                return (
                  <Cell
                    key={`expenses-${index}`}
                    fill="#EF4444"
                    opacity={isHovered ? 0.5 : 1}
                    style={{ transition: 'opacity 0.2s ease', cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredBar({ dataKey: 'expenses', index })}
                    onMouseLeave={() => setHoveredBar(null)}
                  />
                )
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded" style={{ backgroundColor: '#22C55E' }}></div>
          <span className="text-muted-foreground">Ingresos</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded" style={{ backgroundColor: '#EF4444' }}></div>
          <span className="text-muted-foreground">Gastos</span>
        </div>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">Datos en miles de €</span>
      </div>
    </div>
  )
}
