'use client'

import { useAuth } from '@/hooks/useAuth'
import { useMonthlySummary, useBalanceHistory } from '@/lib/queries/transactions'
import { MonthlyBarChart, BalanceLineChart } from '@/components/charts'
import { MONTHS_ES } from '@/lib/constants'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
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
            <div className="space-y-3">
              <div className="hidden sm:block bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-[#0d1117] border-b border-gray-200 dark:border-gray-800">
                      <tr>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Mes
                        </th>
                        <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Ingresos
                        </th>
                        <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Gastos
                        </th>
                        <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Balance
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {chartData.map((item, index) => {
                        const balance = item.income - item.expenses
                        const hasData = item.income > 0 || item.expenses > 0
                        const isCurrentMonth =
                          index === new Date().getMonth() && selectedYear === currentYear

                        return (
                          <tr
                            key={item.month}
                            className={`hover:bg-gray-50 dark:hover:bg-[#0d1117] transition-colors ${isCurrentMonth ? 'bg-accent/5' : ''}`}
                          >
                            <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400 font-medium">
                              {MONTHS_ES[index]}
                              {isCurrentMonth && (
                                <span className="ml-2 text-xs text-accent">(Actual)</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs text-right">
                              <span className="text-text-secondary">+</span>
                              <span className="text-success text-sm">
                                {hasData ? item.income.toFixed(2) : '-'}
                              </span>
                              {hasData && <span className="text-text-secondary ml-1">€</span>}
                            </td>
                            <td className="px-3 py-2 text-xs text-right">
                              <span className="text-text-secondary">-</span>
                              <span className="text-danger text-sm">
                                {hasData ? item.expenses.toFixed(2) : '-'}
                              </span>
                              {hasData && <span className="text-text-secondary ml-1">€</span>}
                            </td>
                            <td className="px-3 py-2 text-xs text-right">
                              <span className="text-text-secondary">
                                {hasData ? (balance >= 0 ? '+' : '-') : ''}
                              </span>
                              <span
                                className={`text-sm ${balance >= 0 ? 'text-success' : 'text-danger'}`}
                              >
                                {hasData ? Math.abs(balance).toFixed(2) : '-'}
                              </span>
                              {hasData && <span className="text-text-secondary ml-1">€</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="sm:hidden space-y-2">
                {chartData.map((item, index) => {
                  const balance = item.income - item.expenses
                  const hasData = item.income > 0 || item.expenses > 0
                  const isCurrentMonth =
                    index === new Date().getMonth() && selectedYear === currentYear

                  return (
                    <div
                      key={item.month}
                      className={`rounded-lg border p-4 transition-colors ${isCurrentMonth ? 'border-accent/50 bg-accent/5' : 'border-layer-2 hover:bg-layer-1'}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-semibold text-text-primary">
                          {MONTHS_ES[index]}
                          {isCurrentMonth && (
                            <span className="ml-2 text-xs text-accent font-normal">(Actual)</span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-text-secondary text-xs mb-1">Ingresos</p>
                          <p>
                            <span className="text-text-secondary">+</span>
                            <span className="text-success text-sm ml-1">
                              {hasData ? item.income.toFixed(2) : '-'}
                            </span>
                            {hasData && <span className="text-text-secondary ml-1">€</span>}
                          </p>
                        </div>
                        <div>
                          <p className="text-text-secondary text-xs mb-1">Gastos</p>
                          <p>
                            <span className="text-text-secondary">-</span>
                            <span className="text-danger text-sm ml-1">
                              {hasData ? item.expenses.toFixed(2) : '-'}
                            </span>
                            {hasData && <span className="text-text-secondary ml-1">€</span>}
                          </p>
                        </div>
                        <div>
                          <p className="text-text-secondary text-xs mb-1">Balance</p>
                          <p>
                            <span className="text-text-secondary">
                              {hasData ? (balance >= 0 ? '+' : '-') : ''}
                            </span>
                            <span
                              className={`text-sm ml-1 ${balance >= 0 ? 'text-success' : 'text-danger'}`}
                            >
                              {hasData ? Math.abs(balance).toFixed(2) : '-'}
                            </span>
                            {hasData && <span className="text-text-secondary ml-1">€</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-text-secondary">No hay datos disponibles</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
