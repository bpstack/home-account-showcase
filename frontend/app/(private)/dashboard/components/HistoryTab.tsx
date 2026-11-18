'use client'

import { useAuth } from '@/hooks/useAuth'
import { useMonthlySummary, useBalanceHistory } from '@/lib/queries/transactions'
import { MonthlyBarChart, BalanceLineChart } from '@/components/charts'
import { MONTHS_ES } from '@/lib/constants'
import { Money } from '@/components/ui'
import { Loader2 } from 'lucide-react'
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

  const loading = (
    <p className="flex items-center justify-center gap-2 py-12 text-sm text-text-secondary">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      Cargando
    </p>
  )

  return (
    <div className="space-y-10">
      <section aria-labelledby="history-months">
        <h2 id="history-months" className="mb-3 text-sm font-medium text-text-primary">
          Ingresos y gastos por mes, {selectedYear}
        </h2>
        {isLoadingMonthlySummary ? loading : <MonthlyBarChart data={chartData} />}
      </section>

      <section aria-labelledby="history-balance">
        <h2 id="history-balance" className="mb-3 text-sm font-medium text-text-primary">
          Saldo acumulado a fin de mes, {selectedYear}
        </h2>
        {isLoadingBalanceHistory ? (
          loading
        ) : balanceData.length > 0 ? (
          <BalanceLineChart data={balanceData} />
        ) : (
          <p className="py-12 text-center text-sm text-text-secondary">
            Aún no hay transacciones suficientes para dibujarlo.
          </p>
        )}
      </section>

      <section aria-labelledby="history-table">
        <h2 id="history-table" className="mb-3 text-sm font-medium text-text-primary">
          Resumen mensual, {selectedYear}
        </h2>
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
          <p className="py-12 text-center text-sm text-text-secondary">No hay datos de este año.</p>
        )}
      </section>
    </div>
  )
}
