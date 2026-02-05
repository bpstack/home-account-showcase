import { useMemo } from 'react'
import { useInvestmentOverview } from '@/lib/queries/investment'
import { useTransactions } from '@/lib/queries/transactions'

export interface FinancialSummary {
  avgMonthlyIncome: number
  avgMonthlyExpenses: number
  savingsCapacity: number
  savingsRate: number
  trend: 'improving' | 'stable' | 'declining'
  deficitMonths: number
  historicalMonths: number
  emergencyFundStatus: number
  emergencyFundGoal: number
}

export function useFinancialMetrics(accountId: string) {
  const { data: investmentData, isLoading: isInvestmentLoading } = useInvestmentOverview(accountId)
  const { data: txData, isLoading: isTxLoading } = useTransactions({ 
    account_id: accountId, 
    limit: 10000 // High limit for accurate stats
  })

  const transactions = txData?.transactions

  const metrics = useMemo((): FinancialSummary => {
    // Default values
    const defaults = {
      avgMonthlyIncome: 0,
      avgMonthlyExpenses: 0,
      savingsCapacity: 0,
      savingsRate: 0,
      trend: 'stable' as const,
      deficitMonths: 0,
      historicalMonths: 0,
      emergencyFundStatus: investmentData?.profile?.liquidityReserve || 0,
      emergencyFundGoal: 0,
    }

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return defaults
    }

    const incomeTxs = transactions.filter((t) => Number(t.amount) > 0)
    const expenseTxs = transactions.filter((t) => Number(t.amount) < 0)

    const totalIncome = incomeTxs.reduce((sum, t) => sum + Number(t.amount), 0)
    const totalExpenses = Math.abs(expenseTxs.reduce((sum, t) => sum + Number(t.amount), 0))

    const monthlyIncome: Record<string, number> = {}
    const monthlyExpenses: Record<string, number> = {}
    const monthlySavings: Record<string, number> = {}

    transactions.forEach((t) => {
      const amount = Number(t.amount)
      const month = t.date.split('T')[0].slice(0, 7)
      
      if (amount > 0) {
        monthlyIncome[month] = (monthlyIncome[month] || 0) + amount
      } else {
        monthlyExpenses[month] = (monthlyExpenses[month] || 0) + Math.abs(amount)
      }
      
      monthlySavings[month] = (monthlySavings[month] || 0) + amount
    })

    const months = Object.keys(monthlyIncome)
    const count = Math.max(1, months.length)

    const avgMonthlyIncome = totalIncome / count
    const avgMonthlyExpenses = totalExpenses / count

    const savingsCapacity = Math.max(0, avgMonthlyIncome - avgMonthlyExpenses)
    const savingsRate = avgMonthlyIncome > 0 
      ? (savingsCapacity / avgMonthlyIncome) * 100 
      : 0

    const savingsValues = Object.values(monthlySavings)
    const trend = savingsValues.length >= 2
      ? (savingsValues[savingsValues.length - 1] > savingsValues[0] ? 'improving' : 
         savingsValues[savingsValues.length - 1] < savingsValues[0] ? 'declining' : 'stable')
      : 'stable'

    const deficitMonths = savingsValues.filter((s) => s < 0).length

    // Emergency fund calculations
    // emergencyFundStatus comes from liquidity_reserve (profile)
    // emergencyFundGoal = avgMonthlyExpenses * emergencyFundMonths
    const emergencyFundMonths = investmentData?.profile?.emergencyFundMonths || 6
    const emergencyFundGoal = avgMonthlyExpenses * emergencyFundMonths

    return {
      avgMonthlyIncome,
      avgMonthlyExpenses,
      savingsCapacity,
      savingsRate,
      trend,
      deficitMonths,
      historicalMonths: months.length,
      emergencyFundStatus: investmentData?.profile?.liquidityReserve || 0,
      emergencyFundGoal,
    }
  }, [transactions, investmentData])

  return { 
    metrics, 
    isLoading: isInvestmentLoading || isTxLoading 
  }
}
