// components/investment/Simulator.tsx
// Investment simulator component

'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Slider } from '@/components/ui/Slider'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { Calculator, TrendingUp, TrendingDown, Info, AlertTriangle } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'

interface SimulatorProps {
  accountId: string
  initialAmount?: number
  suggestedMonthly?: number
}

interface SimulationResult {
  conservative: number
  expected: number
  optimistic: number
}

export function Simulator({
  accountId,
  initialAmount = 5000,
  suggestedMonthly = 200
}: SimulatorProps) {
  const [params, setParams] = useState({
    initialAmount,
    monthlyContribution: suggestedMonthly,
    profile: 'balanced' as 'conservative' | 'balanced' | 'dynamic',
    years: 10
  })

  const result = useSimulation(params)

  const profiles = [
    { value: 'conservative', label: 'Conservador', desc: '5-7% anual', color: '#3b82f6' },
    { value: 'balanced', label: 'Equilibrado', desc: '7-10% anual', color: '#22c55e' },
    { value: 'dynamic', label: 'Dinámico', desc: '10-15% anual', color: '#f59e0b' }
  ]

  const returns = {
    conservative: { min: 5, max: 7 },
    balanced: { min: 7, max: 10 },
    dynamic: { min: 10, max: 15 }
  }

  return (
    <Card className="h-full border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0 pb-4">
        <CardTitle className="text-lg font-bold tracking-tight">
          Simulador
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0 space-y-6">
        {/* Profile selector - Compact */}
        <div className="p-1 bg-muted/30 rounded-lg flex gap-1">
          {profiles.map((profile) => (
            <button
              key={profile.value}
              onClick={() => setParams(prev => ({ ...prev, profile: profile.value as any }))}
              className={cn(
                'flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all duration-200',
                params.profile === profile.value
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {profile.label}
              <span className="block text-[10px] opacity-70 mt-0.5">{profile.desc}</span>
            </button>
          ))}
        </div>

        {/* Inputs */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Capital inicial: {formatCurrency(params.initialAmount)}
            </label>
            <Input
              type="number"
              value={params.initialAmount}
              onChange={(e) => setParams(prev => ({ ...prev, initialAmount: Number(e.target.value) }))}
              min={0}
              step={100}
              className="mb-2"
            />
            <Slider
              value={[params.initialAmount]}
              onValueChange={([v]) => setParams(prev => ({ ...prev, initialAmount: v }))}
              min={0}
              max={50000}
              step={500}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0€</span>
              <span>50.000€</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Aportación mensual: {formatCurrency(params.monthlyContribution)}
            </label>
            <Input
              type="number"
              value={params.monthlyContribution}
              onChange={(e) => setParams(prev => ({ ...prev, monthlyContribution: Number(e.target.value) }))}
              min={0}
              step={50}
              className="mb-2"
            />
            <Slider
              value={[params.monthlyContribution]}
              onValueChange={([v]) => setParams(prev => ({ ...prev, monthlyContribution: v }))}
              min={0}
              max={2000}
              step={50}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2 font-medium">
              <span>0€</span>
              <span>2.000€</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Plazo: {params.years} años
            </label>
            <Slider
              value={[params.years]}
              onValueChange={([v]) => setParams(prev => ({ ...prev, years: v }))}
              min={1}
              max={30}
              step={1}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>1 año</span>
              <span>30 años</span>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex flex-wrap gap-2 justify-between">
          <ResultCard
            label="Pesimista"
            value={result.conservative}
            color="#ef4444"
            className="flex-1 min-w-[80px]"
          />
          <ResultCard
            label="Esperado"
            value={result.expected}
            color="#22c55e"
            className="flex-1 min-w-[80px]"
          />
          <ResultCard
            label="Optimista"
            value={result.optimistic}
            color="#3b82f6"
            className="flex-1 min-w-[80px]"
          />
        </div>

        {/* Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={result.chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="year"
                className="text-xs"
                tick={{ fill: 'var(--muted-foreground)' }}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: 'var(--muted-foreground)' }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px'
                }}
                formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="conservative"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                name="Pesimista"
              />
              <Line
                type="monotone"
                dataKey="expected"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                name="Esperado"
              />
              <Line
                type="monotone"
                dataKey="optimistic"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="Optimista"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Info */}
        <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              Estas proyecciones usan rendimientos históricos como referencia.
              Los resultados reales pueden variar significativamente.
              La inversión conlleva riesgos de pérdida.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ========================
// Simulation Logic
// ========================

function useSimulation(params: {
  initialAmount: number
  monthlyContribution: number
  profile: 'conservative' | 'balanced' | 'dynamic'
  years: number
}) {
  return useMemo(() => {
    const returns = {
      conservative: { min: 0.05, max: 0.07 },
      balanced: { min: 0.07, max: 0.10 },
      dynamic: { min: 0.10, max: 0.15 }
    }

    const { min, max } = returns[params.profile]
    const conservativeRate = min
    const expectedRate = (min + max) / 2
    const optimisticRate = max

    const chartData = []
    let conservativeValue = params.initialAmount
    let expectedValue = params.initialAmount
    let optimisticValue = params.initialAmount

    for (let year = 0; year <= params.years; year++) {
      chartData.push({
        year,
        conservative: Math.round(conservativeValue),
        expected: Math.round(expectedValue),
        optimistic: Math.round(optimisticValue),
        contributions: params.initialAmount + (params.monthlyContribution * 12 * year)
      })

      if (year < params.years) {
        conservativeValue = conservativeValue * (1 + conservativeRate) + (params.monthlyContribution * 12)
        expectedValue = expectedValue * (1 + expectedRate) + (params.monthlyContribution * 12)
        optimisticValue = optimisticValue * (1 + optimisticRate) + (params.monthlyContribution * 12)
      }
    }

    return {
      conservative: conservativeValue,
      expected: expectedValue,
      optimistic: optimisticValue,
      chartData
    }
  }, [params])
}

function ResultCard({
  label,
  value,
  color,
  className
}: {
  label: string
  value: number
  color: string
  className?: string
}) {
  return (
    <div className={cn("p-2 rounded-lg text-center border bg-card/50 dark:bg-zinc-900 border-border/40 dark:border-white/5", className)}>
      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="text-sm font-bold tracking-tight" style={{ color }}>
        {formatCurrency(value)}
      </div>
    </div>
  )
}
