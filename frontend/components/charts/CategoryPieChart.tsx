'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useState } from 'react'

interface CategoryData {
  name: string
  value: number
  color: string
  [key: string]: string | number
}

interface Props {
  data: CategoryData[]
  showLegend?: boolean
}

export function CategoryPieChart({ data, showLegend = true }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const total = data.reduce((sum, item) => sum + item.value, 0)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(value))
  }

  const formatPercent = (value: number) => {
    return ((value / total) * 100).toFixed(1)
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="font-medium text-foreground">{item.name}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {formatCurrency(item.value)} ({formatPercent(item.value)}%)
          </div>
        </div>
      )
    }
    return null
  }

  // Sort data by value descending for legend
  const sortedData = [...data].sort((a, b) => b.value - a.value)

  return (
    <div className="flex flex-col gap-6">
      {/* Chart */}
      <div className="w-full flex justify-center">
        <div className="w-[280px] h-[280px] sm:w-[320px] sm:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius="85%"
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.color}
                    opacity={activeIndex === null || activeIndex === index ? 1 : 0.5}
                    stroke={activeIndex === index ? entry.color : 'transparent'}
                    strokeWidth={activeIndex === index ? 2 : 0}
                    style={{
                      transition: 'opacity 0.2s ease',
                      cursor: 'pointer',
                      filter: activeIndex === index ? 'brightness(1.1)' : 'none'
                    }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="w-full">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2">
            {sortedData.map((item, index) => {
              const percent = formatPercent(item.value)
              const isActive = activeIndex === data.findIndex(d => d.name === item.name)

              return (
                <div
                  key={index}
                  className={`flex items-center gap-2 py-1 px-1.5 rounded transition-colors cursor-pointer ${
                    isActive ? 'bg-muted' : 'hover:bg-muted/50'
                  }`}
                  onMouseEnter={() => setActiveIndex(data.findIndex(d => d.name === item.name))}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-sm text-foreground truncate block">
                      {item.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency(item.value)} · {percent}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
