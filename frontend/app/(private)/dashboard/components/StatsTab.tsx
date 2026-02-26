'use client'

import { useState, useMemo } from 'react'
import { CategorySummary } from '@/lib/apiClient'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react'

interface StatsTabProps {
  summary: CategorySummary[]
}

export function StatsTab({ summary }: StatsTabProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [drillCategory, setDrillCategory] = useState<string | null>(null)

  const fmt = (v: number) =>
    new Intl.NumberFormat('es-ES', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v)

  const categoriesWithSubs = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string
        color: string
        amount: number
        subcategories: { name: string; amount: number; count: number }[]
      }
    >()
    for (const item of summary) {
      const catName = item.category_name || 'Sin categoría'
      const amt = Math.abs(Number(item.total_amount))
      let cat = map.get(catName)
      if (!cat) {
        cat = {
          name: catName,
          color: item.category_color || '#6B7280',
          amount: 0,
          subcategories: [],
        }
        map.set(catName, cat)
      }
      cat.amount += amt
      if (item.subcategory_name) {
        cat.subcategories.push({
          name: item.subcategory_name,
          amount: amt,
          count: item.transaction_count,
        })
      }
    }
    const result = Array.from(map.values())
    result.sort((a, b) => b.amount - a.amount)
    for (const cat of result) {
      cat.subcategories.sort((a, b) => b.amount - a.amount)
    }
    return result
  }, [summary])

  const totalExpenses = categoriesWithSubs.reduce((sum, item) => sum + item.amount, 0) || 1

  const drillData = drillCategory ? categoriesWithSubs.find((c) => c.name === drillCategory) : null

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Distribución de ingresos y gastos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categoriesWithSubs.length === 0 ? (
            <p className="text-text-secondary text-center py-4">No hay gastos para mostrar</p>
          ) : (
            <div className="space-y-4">
              {categoriesWithSubs.map((item) => {
                const percentage = (item.amount / totalExpenses) * 100
                const isExpanded = expandedCategory === item.name
                const hasSubs = item.subcategories.length > 0
                return (
                  <div key={item.name}>
                    <div
                      className={`flex justify-between text-sm mb-1 ${hasSubs ? 'cursor-pointer' : ''}`}
                      onClick={() => hasSubs && setExpandedCategory(isExpanded ? null : item.name)}
                    >
                      <span className="text-text-primary font-medium flex items-center gap-1">
                        {item.name}
                        {hasSubs &&
                          (isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5 text-text-secondary" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-text-secondary" />
                          ))}
                      </span>
                      <span className="text-text-secondary">
                        {fmt(item.amount)} € ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-4 bg-layer-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${percentage}%`, backgroundColor: item.color }}
                      />
                    </div>
                    {isExpanded && (
                      <div className="ml-4 mt-2 space-y-2">
                        {item.subcategories.map((sub) => {
                          const subPct = (sub.amount / item.amount) * 100
                          return (
                            <div key={sub.name}>
                              <div className="flex justify-between text-xs mb-0.5">
                                <span className="text-text-secondary">{sub.name}</span>
                                <span className="text-text-secondary">
                                  {fmt(sub.amount)} € ({subPct.toFixed(1)}%)
                                </span>
                              </div>
                              <div className="h-2.5 bg-layer-2 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${subPct}%`,
                                    backgroundColor: item.color,
                                    opacity: 0.7,
                                  }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {categoriesWithSubs.length > 0 && !drillData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoriesWithSubs.map((item) => {
            const percentage = (item.amount / totalExpenses) * 100
            const hasSubs = item.subcategories.length > 0
            return (
              <Card
                key={item.name}
                hover
                className={hasSubs ? 'cursor-pointer' : ''}
                onClick={() => hasSubs && setDrillCategory(item.name)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-medium text-text-primary">{item.name}</span>
                    {hasSubs && <ChevronDown className="h-4 w-4 text-text-secondary ml-auto" />}
                  </div>
                  <p className="text-2xl font-bold text-text-primary">
                    {fmt(item.amount)}{' '}
                    <span className="text-text-secondary text-lg font-normal">€</span>
                  </p>
                  <p className="text-sm text-text-secondary">{percentage.toFixed(1)}% del total</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {drillData && (
        <div>
          <button
            onClick={() => setDrillCategory(null)}
            className="flex items-center gap-2 mb-4 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: drillData.color }} />
            <span className="font-medium">{drillData.name}</span>
          </button>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drillData.subcategories.map((sub) => {
              const subPct = (sub.amount / drillData.amount) * 100
              return (
                <Card key={sub.name} hover>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: drillData.color, opacity: 0.7 }}
                      />
                      <span className="font-medium text-text-primary">{sub.name}</span>
                    </div>
                    <p className="text-2xl font-bold text-text-primary">
                      {fmt(sub.amount)}{' '}
                      <span className="text-text-secondary text-lg font-normal">€</span>
                    </p>
                    <div className="flex justify-between text-sm text-text-secondary">
                      <span>{subPct.toFixed(1)}% de la categoría</span>
                      <span>{sub.count} transacciones</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
