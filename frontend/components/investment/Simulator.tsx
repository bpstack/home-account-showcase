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
    <Card className="bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10 border-amber-200/50 dark:border-amber-800/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
          <Calculator className="h-5 w-5" />
          Simulador de Inversión
        </CardTitle>
        <CardDescription>
          Calcula cómo podría crecer tu inversión con el tiempo
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Profile selector */}
        <div className="grid grid-cols-3 gap-2">
          {profiles.map((profile) => (
            <button
              key={profile.value}
              onClick={() => setParams(prev => ({ ...prev, profile: profile.value as any }))}
              className={cn(
                'p-3 rounded-lg border text-center transition-all',
                params.profile === profile.value
                  ? `border-[${profile.color}] bg-[${profile.color}]/10`
                  : 'hover:border-primary/50'
              )}
              style={{
                borderColor: params.profile === profile.value ? profile.color : undefined,
                backgroundColor: params.profile === profile.value ? `${profile.color}15` : undefined
              }}
            >
              <div
                className="font-semibold"
                style={{ color: params.profile === profile.value ? profile.color : undefined }}
              >
                {profile.label}
              </div>
              <div className="text-xs text-muted-foreground">
                {profile.desc}
              </div>
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
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
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
        <div className="grid grid-cols-3 gap-4">
          <ResultCard
            label="Escenario pesimista"
            value={result.conservative}
            color="#ef4444"
            icon={<TrendingDown className="h-4 w-4" />}
          />
          <ResultCard
            label="Esperado"
            value={result.expected}
            color="#22c55e"
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <ResultCard
            label="Optimista"
            value={result.optimistic}
            color="#3b82f6"
            icon={<TrendingUp className="h-4 w-4" />}
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
  icon
}: {
  label: string
  value: number
  color: string
  icon: React.ReactNode
}) {
  return (
    <div className="p-3 rounded-lg text-center" style={{ backgroundColor: `${color}10` }}>
      <div className="flex items-center justify-center gap-1 mb-1" style={{ color }}>
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-xl font-bold" style={{ color }}>
        {formatCurrency(value)}
      </div>
    </div>
  )
}
