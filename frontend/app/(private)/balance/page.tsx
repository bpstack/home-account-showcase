'use client'

import { Header } from '@/components/layout'
import { Card, CardHeader, CardTitle, CardContent, Button, Tabs, useActiveTab } from '@/components/ui'
import { mockMonthlyBalance, mockCategories, mockTransactions } from '@/lib/mock/data'
import { ArrowLeft, ArrowRight, Download, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { useState } from 'react'

const tabs = [
  { id: 'balance', label: 'Balance Mensual' },
  { id: 'income', label: 'Ingresos' },
  { id: 'expenses', label: 'Gastos' },
]

const months = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export default function BalancePage() {
  const activeTab = useActiveTab('tab', 'balance')
  const [currentMonth, setCurrentMonth] = useState(0)

  return (
    <div>
      <Header title="Control de Gastos 2025" description="Seguimiento mensual de finanzas" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <Tabs tabs={tabs} defaultTab="balance" />

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(Math.max(0, currentMonth - 1))}
            disabled={currentMonth === 0}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-text-primary min-w-[100px] text-center">
            {months[currentMonth]}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(Math.min(11, currentMonth + 1))}
            disabled={currentMonth === 11}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {activeTab === 'balance' && <BalanceTab currentMonth={currentMonth} />}
      {activeTab === 'income' && <IncomeTab currentMonth={currentMonth} />}
      {activeTab === 'expenses' && <ExpensesTab currentMonth={currentMonth} />}
    </div>
  )
}

function BalanceTab({ currentMonth }: { currentMonth: number }) {
  const data = mockMonthlyBalance[currentMonth]

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(value)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-success/5 border-success/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Total Ingresos</p>
                <p className="text-xl font-bold text-success">{formatCurrency(data.totalIngresos)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-danger/5 border-danger/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-danger/20 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-danger" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Total Gastos</p>
                <p className="text-xl font-bold text-danger">-{formatCurrency(data.totalGastos)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-accent/5 border-accent/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Ahorro</p>
                <p className={`text-xl font-bold ${data.ahorro >= 0 ? 'text-accent' : 'text-danger'}`}>
                  {data.ahorro >= 0 ? '+' : ''}{formatCurrency(data.ahorro)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-layer-2 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-text-secondary" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Saldo CC</p>
                <p className="text-xl font-bold text-text-primary">{formatCurrency(data.saldoCC)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ingresos del mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-layer-2">
                <span className="text-text-secondary">Nómina 1</span>
                <span className="font-medium text-success">{formatCurrency(data.nomina1)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-layer-2">
                <span className="text-text-secondary">Nómina 2</span>
                <span className="font-medium text-success">{formatCurrency(data.nomina2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-layer-2">
                <span className="text-text-secondary">Transferencias</span>
                <span className="font-medium text-success">{formatCurrency(data.transferencias)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-layer-2">
                <span className="text-text-secondary">Bizum</span>
                <span className="font-medium text-success">{formatCurrency(data.bizum)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-layer-2">
                <span className="text-text-secondary">Bonificaciones</span>
                <span className="font-medium text-success">{formatCurrency(data.bonificaciones)}</span>
              </div>
              <div className="flex justify-between py-2 font-medium">
                <span className="text-text-primary">Total Ingresos</span>
                <span className="text-success">{formatCurrency(data.totalIngresos)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gastos del mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-layer-2">
                <span className="text-text-secondary">Gastos Fijos</span>
                <span className="font-medium text-danger">-{formatCurrency(data.gastosFijos)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-layer-2">
                <span className="text-text-secondary">Otros Gastos</span>
                <span className="font-medium text-danger">-{formatCurrency(data.totalGastos - data.gastosFijos)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-layer-2 font-medium">
                <span className="text-text-primary">Total Gastos</span>
                <span className="text-danger">-{formatCurrency(data.totalGastos)}</span>
              </div>
              <div className="flex justify-between py-2 font-bold">
                <span className="text-text-primary">Ahorro</span>
                <span className={data.ahorro >= 0 ? 'text-success' : 'text-danger'}>
                  {data.ahorro >= 0 ? '+' : ''}{formatCurrency(data.ahorro)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Resumen Anual</CardTitle>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-layer-3 bg-layer-1">
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">Mes</th>
                  <th className="text-right py-3 px-4 font-medium text-text-secondary">Nómina 1</th>
                  <th className="text-right py-3 px-4 font-medium text-text-secondary">Nómina 2</th>
                  <th className="text-right py-3 px-4 font-medium text-text-secondary">Gastos Fijos</th>
                  <th className="text-right py-3 px-4 font-medium text-text-secondary hidden md:table-cell">Transferencias</th>
                  <th className="text-right py-3 px-4 font-medium text-text-secondary hidden lg:table-cell">Bizum</th>
                  <th className="text-right py-3 px-4 font-medium text-text-secondary">Ingresos</th>
                  <th className="text-right py-3 px-4 font-medium text-text-secondary">Gastos</th>
                  <th className="text-right py-3 px-4 font-medium text-text-secondary">Ahorro</th>
                  <th className="text-right py-3 px-4 font-medium text-text-secondary hidden xl:table-cell">Saldo CC</th>
                </tr>
              </thead>
              <tbody>
                {mockMonthlyBalance.map((row) => {
                  const hasData = row.totalIngresos > 0 || row.totalGastos > 0
                  return (
                    <tr
                      key={row.month}
                      className={`border-b border-layer-2 hover:bg-layer-1 ${
                        row.month === months[currentMonth] ? 'bg-accent/5' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-medium text-text-primary">{row.month}</td>
                      <td className="py-3 px-4 text-right text-text-secondary">{formatCurrency(row.nomina1)}</td>
                      <td className="py-3 px-4 text-right text-text-secondary">{formatCurrency(row.nomina2)}</td>
                      <td className="py-3 px-4 text-right text-text-secondary">{formatCurrency(row.gastosFijos)}</td>
                      <td className="py-3 px-4 text-right text-text-secondary hidden md:table-cell">{formatCurrency(row.transferencias)}</td>
                      <td className="py-3 px-4 text-right text-text-secondary hidden lg:table-cell">{formatCurrency(row.bizum)}</td>
                      <td className="py-3 px-4 text-right text-success font-medium">{formatCurrency(row.totalIngresos)}</td>
                      <td className="py-3 px-4 text-right text-danger">-{formatCurrency(row.totalGastos)}</td>
                      <td className={`py-3 px-4 text-right font-medium ${row.ahorro >= 0 ? 'text-success' : 'text-danger'}`}>
                        {row.ahorro >= 0 ? '+' : ''}{formatCurrency(row.ahorro)}
                      </td>
                      <td className="py-3 px-4 text-right text-text-secondary hidden xl:table-cell">{formatCurrency(row.saldoCC)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-layer-1 font-bold">
                  <td className="py-3 px-4 text-text-primary">Total</td>
                  <td className="py-3 px-4 text-right text-text-primary">
                    {formatCurrency(mockMonthlyBalance.reduce((sum, m) => sum + m.nomina1, 0))}
                  </td>
                  <td className="py-3 px-4 text-right text-text-primary">
                    {formatCurrency(mockMonthlyBalance.reduce((sum, m) => sum + m.nomina2, 0))}
                  </td>
                  <td className="py-3 px-4 text-right text-text-primary">
                    {formatCurrency(mockMonthlyBalance.reduce((sum, m) => sum + m.gastosFijos, 0))}
                  </td>
                  <td className="py-3 px-4 text-right text-text-primary hidden md:table-cell">
                    {formatCurrency(mockMonthlyBalance.reduce((sum, m) => sum + m.transferencias, 0))}
                  </td>
                  <td className="py-3 px-4 text-right text-text-primary hidden lg:table-cell">
                    {formatCurrency(mockMonthlyBalance.reduce((sum, m) => sum + m.bizum, 0))}
                  </td>
                  <td className="py-3 px-4 text-right text-success">
                    {formatCurrency(mockMonthlyBalance.reduce((sum, m) => sum + m.totalIngresos, 0))}
                  </td>
                  <td className="py-3 px-4 text-right text-danger">
                    -{formatCurrency(mockMonthlyBalance.reduce((sum, m) => sum + m.totalGastos, 0))}
                  </td>
                  <td className="py-3 px-4 text-right text-accent">
                    +{formatCurrency(mockMonthlyBalance.reduce((sum, m) => sum + m.ahorro, 0))}
                  </td>
                  <td className="py-3 px-4 text-right text-text-primary hidden xl:table-cell">
                    {formatCurrency(mockMonthlyBalance[mockMonthlyBalance.length - 1]?.saldoCC || 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function IncomeTab({ currentMonth }: { currentMonth: number }) {
  const data = mockMonthlyBalance[currentMonth]
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Desglose de Ingresos - {months[currentMonth]}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center p-4 bg-layer-2 rounded-lg">
            <p className="text-sm text-text-secondary mb-1">Nómina 1</p>
            <p className="text-lg font-bold text-success">{formatCurrency(data.nomina1)}</p>
          </div>
          <div className="text-center p-4 bg-layer-2 rounded-lg">
            <p className="text-sm text-text-secondary mb-1">Nómina 2</p>
            <p className="text-lg font-bold text-success">{formatCurrency(data.nomina2)}</p>
          </div>
          <div className="text-center p-4 bg-layer-2 rounded-lg">
            <p className="text-sm text-text-secondary mb-1">Transferencias</p>
            <p className="text-lg font-bold text-success">{formatCurrency(data.transferencias)}</p>
          </div>
          <div className="text-center p-4 bg-layer-2 rounded-lg">
            <p className="text-sm text-text-secondary mb-1">Bizum</p>
            <p className="text-lg font-bold text-success">{formatCurrency(data.bizum)}</p>
          </div>
          <div className="text-center p-4 bg-layer-2 rounded-lg">
            <p className="text-sm text-text-secondary mb-1">Bonificaciones</p>
            <p className="text-lg font-bold text-success">{formatCurrency(data.bonificaciones)}</p>
          </div>
          <div className="text-center p-4 bg-accent/10 rounded-lg border border-accent/30">
            <p className="text-sm text-text-secondary mb-1">Total</p>
            <p className="text-xl font-bold text-accent">{formatCurrency(data.totalIngresos)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ExpensesTab({ currentMonth }: { currentMonth: number }) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)
  }

  const data = mockMonthlyBalance[currentMonth]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Gastos - {months[currentMonth]}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-danger/5 border border-danger/20 rounded-lg">
              <p className="text-sm text-text-secondary mb-1">Gastos Fijos</p>
              <p className="text-2xl font-bold text-danger">-{formatCurrency(data.gastosFijos)}</p>
            </div>
            <div className="p-4 bg-layer-2 rounded-lg">
              <p className="text-sm text-text-secondary mb-1">Gastos Variables</p>
              <p className="text-2xl font-bold text-text-primary">
                -{formatCurrency(Math.max(0, data.totalGastos - data.gastosFijos))}
              </p>
            </div>
            <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg">
              <p className="text-sm text-text-secondary mb-1">Total Gastos</p>
              <p className="text-2xl font-bold text-danger">-{formatCurrency(data.totalGastos)}</p>
            </div>
            <div className={`p-4 rounded-lg border ${
              data.ahorro >= 0
                ? 'bg-accent/10 border-accent/30'
                : 'bg-danger/10 border-danger/30'
            }`}>
              <p className="text-sm text-text-secondary mb-1">Ahorro</p>
              <p className={`text-2xl font-bold ${data.ahorro >= 0 ? 'text-accent' : 'text-danger'}`}>
                {data.ahorro >= 0 ? '+' : ''}{formatCurrency(data.ahorro)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gastos por Categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockCategories.map((category) => {
              const categoryTransactions = mockTransactions.filter(
                tx => tx.subcategoryId && category.subcategories.some(s => s.id === tx.subcategoryId)
              )
              const total = categoryTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)

              if (total === 0) return null

              const percentage = (total / data.totalGastos) * 100

              return (
                <div key={category.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-2 text-text-primary">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name}
                    </span>
                    <span className="text-text-secondary">
                      {formatCurrency(total)} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-3 bg-layer-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: category.color
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
