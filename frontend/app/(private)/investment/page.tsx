'use client'

import { useCallback, useState } from 'react'
import { Loader2, MessageCircle } from 'lucide-react'
import { Button, Figures, Sheet } from '@/components/ui'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  AIChat,
  EmergencyFund,
  MarketSummary,
  ProfileTest,
  Recommendations,
  RiskProfile,
  Simulator,
} from '@/components/investment'
import { useAccount } from '@/lib/queries/accounts'
import { useInvestmentOverview } from '@/lib/queries/investment'
import { useFinancialMetrics } from '@/hooks/useFinancialMetrics'

const percent = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 })

export default function InvestmentPage() {
  const { data: accounts, isLoading: accountsLoading } = useAccount()
  const accountId = accounts?.defaultAccount?.id ?? ''
  const { data: overview } = useInvestmentOverview(accountId, { refetchOnMount: false })
  const { metrics } = useFinancialMetrics(accountId)
  const [chatOpen, setChatOpen] = useState(false)
  const [testOpen, setTestOpen] = useState(false)
  const [chatSessionId, setChatSessionId] = useState<string | null>(null)
  // Stable handlers: the Sheet re-runs its focus effect whenever onClose changes
  const closeChat = useCallback(() => setChatOpen(false), [])
  const closeTest = useCallback(() => setTestOpen(false), [])

  if (accountsLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-text-secondary" aria-label="Cargando" />
      </div>
    )
  }

  if (!accountId) {
    return (
      <EmptyState
        title="Sin cuenta"
        description="Elige una cuenta en el menú de arriba para ver su inversión."
      />
    )
  }

  const profile = overview?.profile
  const months = metrics.historicalMonths
  const basis = [
    months === 1 ? 'Media de 1 mes' : `Media de ${months} meses`,
    metrics.avgMonthlyIncome > 0 && `ahorras el ${percent.format(metrics.savingsRate)} %`,
    metrics.deficitMonths > 0 &&
      (metrics.deficitMonths === 1
        ? '1 mes con más gastos que ingresos'
        : `${metrics.deficitMonths} meses con más gastos que ingresos`),
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="mx-auto max-w-[1600px] space-y-8">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <p className="pt-2 text-sm text-text-secondary">
            {months > 0 ? basis : 'Sin movimientos aún'}
          </p>
          <Button onClick={() => setChatOpen(true)} className="shrink-0">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Asesor IA
          </Button>
        </div>
        <Figures
          income={metrics.avgMonthlyIncome}
          expenses={metrics.avgMonthlyExpenses}
          labels={['Ingresos al mes', 'Gastos al mes', 'Ahorro al mes']}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-8">
          <Recommendations
            accountId={accountId}
            monthlySavings={metrics.savingsCapacity}
            monthlyExpenses={metrics.avgMonthlyExpenses}
            onTakeTest={() => setTestOpen(true)}
          />
          <Simulator key={profile?.riskProfile} riskProfile={profile?.riskProfile} />
        </div>
        <div className="space-y-8">
          <RiskProfile profile={profile} onTakeTest={() => setTestOpen(true)} />
          <EmergencyFund
            accountId={accountId}
            saved={overview?.emergencyFund.saved ?? 0}
            months={overview?.emergencyFund.months ?? 6}
            monthlyExpenses={metrics.avgMonthlyExpenses}
          />
          <MarketSummary accountId={accountId} />
        </div>
      </div>

      <Sheet open={chatOpen} onClose={closeChat} title="Asesor IA" flush>
        <AIChat
          accountId={accountId}
          sessionId={chatSessionId}
          onSessionChange={setChatSessionId}
        />
      </Sheet>
      {testOpen && <ProfileTest accountId={accountId} metrics={metrics} onClose={closeTest} />}
    </div>
  )
}
