'use client'

import { useAuth } from '@/hooks/useAuth'
import { useMonthlySummary, useBalanceHistory } from '@/lib/queries/transactions'
import { MonthlyBarChart, BalanceLineChart } from '@/components/charts'
import { MONTHS_ES } from '@/lib/constants'
import { Card, CardHeader, CardTitle, CardContent, Money } from '@/components/ui'
import { Loader2, BarChart3, Calendar } from 'lucide-react'
import type { DashboardInitialData } from '../DashboardClient'

interface HistoryTabProps {
  selectedYear: number
  initialData: DashboardInitialData
}

export function HistoryTab({ selectedYear, initialData }: HistoryTabProps) {
  const { account } = useAuth()
  const currentYear = new Date().getFullYear()

  const { data: monthlySummaryData, isLoading } = useMonthlySummary(account?.id || '', selectedYear)

  const { data: balanceHistoryData, isLoading: isLoadingBalance } = useBalanceHistory(
    account?.id || '',
    selectedYear
  )

  const chartData = monthlySummaryData?.monthlySummary || []
  const balanceData = balanceHistoryData?.balanceHistory || []

  const isLoadingMonthlySummary = isLoading && !initialData.monthlySummary
  const isLoadingBalanceHistory = isLoadingBalance && !initialData.balanceHistory

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Ingresos vs Gastos - {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingMonthlySummary ? (
            <div className="py-12 flex items-center justify-center gap-2 text-text-secondary">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando datos...
            </div>
          ) : (
            <MonthlyBarChart data={chartData} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {isLoadingBalanceHistory ? (
            <div className="py-12 flex items-center justify-center gap-2 text-text-secondary">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando datos...
            </div>
          ) : balanceData && balanceData.length > 0 ? (
            <BalanceLineChart data={balanceData} year={selectedYear} />
          ) : (
            <div className="py-12 text-center text-text-secondary">
              No hay transacciones suficientes para mostrar
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Resumen mensual {selectedYear}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingMonthlySummary ? (
            <div className="py-12 flex items-center justify-center gap-2 text-text-secondary">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando datos...
            </div>
          ) : chartData.length > 0 ? (
            // One table for every width: four short columns fit a phone
            <table className="w-full text-[13px] sm:text-sm">
              <thead>
                <tr className="border-b border-layer-3 text-text-secondary">
                  <th scope="col" className="py-2 pr-2 text-left font-medium">
                    Mes
                  </th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">
                    Ingresos
                  </th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">
                    Gastos
                  </th>
                  <th scope="col" className="py-2 pl-2 text-right font-medium">
                    Saldo
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-layer-3">
                {chartData.map((item, index) => {
                  const hasData = item.income > 0 || item.expenses > 0
                  const isCurrentMonth =
                    index === new Date().getMonth() && selectedYear === currentYear
                  return (
                    <tr
                      key={item.month}
                      aria-current={isCurrentMonth ? 'date' : undefined}
                      className={isCurrentMonth ? 'bg-layer-2' : undefined}
                    >
                      <th
                        scope="row"
                        className={`py-3 pr-2 text-left ${isCurrentMonth ? 'font-medium text-text-primary' : 'font-normal text-text-primary'}`}
                      >
                        {MONTHS_ES[index]}
                      </th>
                      <td className="px-2 py-3 text-right">
                        <Money value={hasData ? item.income : null} sign="always" />
                      </td>
                      <td className="px-2 py-3 text-right">
                        <Money value={hasData ? -item.expenses : null} />
                      </td>
                      <td className="py-3 pl-2 text-right">
                        <Money
                          value={hasData ? item.income - item.expenses : null}
                          className="font-medium"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-text-secondary">No hay datos disponibles</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
