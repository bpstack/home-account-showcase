'use client'

import { Header } from '@/components/layout'
import { Card, CardHeader, CardTitle, CardContent, Tabs, useActiveTab } from '@/components/ui'
import { mockTransactions, mockCategories, getMonthlyStats, getExpensesByCategory, getCategoryBySubcategory } from '@/lib/mock/data'
import { TrendingDown, TrendingUp, Wallet, PieChart, Calendar, BarChart3 } from 'lucide-react'

const tabs = [
  { id: 'overview', label: 'Resumen' },
  { id: 'monthly', label: 'Por meses' },
  { id: 'stats', label: 'Estadísticas' },
]

const months = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export default function DashboardPage() {
  const activeTab = useActiveTab('tab', 'overview')
  const stats = getMonthlyStats(mockTransactions)
  const expensesByCategory = getExpensesByCategory(mockTransactions)

  return (
    <div>
      <Header title="Dashboard" description="Resumen de tus finanzas" />

      <Tabs tabs={tabs} defaultTab="overview" className="mb-6" variant="pills" />

      {activeTab === 'overview' && <OverviewTab stats={stats} expensesByCategory={expensesByCategory} />}
      {activeTab === 'monthly' && <MonthlyTab />}
      {activeTab === 'stats' && <StatsTab expensesByCategory={expensesByCategory} />}
    </div>
  )
}

// Tab: Resumen
function OverviewTab({ stats, expensesByCategory }: { stats: ReturnType<typeof getMonthlyStats>, expensesByCategory: ReturnType<typeof getExpensesByCategory> }) {
  const recentTransactions = mockTransactions.slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Ingresos</p>
                <p className="text-2xl font-bold text-success">+{stats.income.toFixed(2)} €</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Gastos</p>
                <p className="text-2xl font-bold text-danger">-{stats.expenses.toFixed(2)} €</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-danger/10 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-danger" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Balance</p>
                <p className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-success' : 'text-danger'}`}>
                  {stats.balance >= 0 ? '+' : ''}{stats.balance.toFixed(2)} €
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gastos por categoría */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Gastos por categoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expensesByCategory.slice(0, 5).map((item) => {
                const category = mockCategories.find(c => c.name === item.name)
                const percentage = (item.amount / stats.expenses) * 100
                return (
                  <div key={item.name} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category?.color || '#6B7280' }}
                    />
                    <div className="flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-text-primary">{item.name}</span>
                        <span className="text-text-secondary">{item.amount.toFixed(2)} €</span>
                      </div>
                      <div className="mt-1 h-2 bg-layer-2 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: category?.color || '#6B7280'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Últimas transacciones */}
        <Card>
          <CardHeader>
            <CardTitle>Últimas transacciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTransactions.map((tx) => {
                const category = tx.subcategoryId ? getCategoryBySubcategory(tx.subcategoryId) : null
                return (
                  <div key={tx.id} className="flex items-center justify-between py-2 border-b border-layer-2 last:border-0">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-2 h-8 rounded-full"
                        style={{ backgroundColor: category?.color || '#6B7280' }}
                      />
                      <div>
                        <p className="text-sm text-text-primary">{tx.description}</p>
                        <p className="text-xs text-text-secondary">{tx.date}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-medium ${tx.amount >= 0 ? 'text-success' : 'text-danger'}`}>
                      {tx.amount >= 0 ? '+' : ''}{tx.amount.toFixed(2)} €
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Tab: Por meses
function MonthlyTab() {
  // Mock data por mes
  const monthlyData = months.map((month, index) => ({
    month,
    income: index < 1 ? 2300 : 0,
    expenses: index < 1 ? 1650.32 : 0,
  }))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Resumen mensual 2025
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-layer-3">
                  <th className="text-left py-3 px-4 text-text-secondary font-medium">Mes</th>
                  <th className="text-right py-3 px-4 text-text-secondary font-medium">Ingresos</th>
                  <th className="text-right py-3 px-4 text-text-secondary font-medium">Gastos</th>
                  <th className="text-right py-3 px-4 text-text-secondary font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((data) => {
                  const balance = data.income - data.expenses
                  const hasData = data.income > 0 || data.expenses > 0
                  return (
                    <tr key={data.month} className="border-b border-layer-2 hover:bg-layer-1">
                      <td className="py-3 px-4 text-text-primary font-medium">{data.month}</td>
                      <td className="py-3 px-4 text-right text-success">
                        {hasData ? `+${data.income.toFixed(2)} €` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right text-danger">
                        {hasData ? `-${data.expenses.toFixed(2)} €` : '-'}
                      </td>
                      <td className={`py-3 px-4 text-right font-medium ${balance >= 0 ? 'text-success' : 'text-danger'}`}>
                        {hasData ? `${balance >= 0 ? '+' : ''}${balance.toFixed(2)} €` : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-layer-1 font-medium">
                  <td className="py-3 px-4 text-text-primary">Total</td>
                  <td className="py-3 px-4 text-right text-success">+2,300.00 €</td>
                  <td className="py-3 px-4 text-right text-danger">-1,650.32 €</td>
                  <td className="py-3 px-4 text-right text-success">+649.68 €</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Tab: Estadísticas
function StatsTab({ expensesByCategory }: { expensesByCategory: ReturnType<typeof getExpensesByCategory> }) {
  const totalExpenses = expensesByCategory.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Distribución de gastos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {expensesByCategory.map((item) => {
              const category = mockCategories.find(c => c.name === item.name)
              const percentage = (item.amount / totalExpenses) * 100
              return (
                <div key={item.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-text-primary font-medium">{item.name}</span>
                    <span className="text-text-secondary">
                      {item.amount.toFixed(2)} € ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-4 bg-layer-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: category?.color || '#6B7280'
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Resumen por categorías */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {expensesByCategory.map((item) => {
          const category = mockCategories.find(c => c.name === item.name)
          const percentage = (item.amount / totalExpenses) * 100
          return (
            <Card key={item.name} hover>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: category?.color || '#6B7280' }}
                  />
                  <span className="font-medium text-text-primary">{item.name}</span>
                </div>
                <p className="text-2xl font-bold text-text-primary">{item.amount.toFixed(2)} €</p>
                <p className="text-sm text-text-secondary">{percentage.toFixed(1)}% del total</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
