// components/investment/Simulator.tsx
// Investment simulator component

'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Slider } from '@/components/ui/Slider'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Info } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { InfoTooltip } from '@/components/ui/Tooltip'

interface SimulatorProps {
  accountId: string
  initialAmount?: number
  suggestedMonthly?: number
  riskProfile?: 'conservative' | 'balanced' | 'dynamic'
}

export function Simulator({
  accountId: _accountId,
  initialAmount = 5000,
  suggestedMonthly = 200,
  riskProfile = 'balanced',
}: SimulatorProps) {
  const [params, setParams] = useState({
    initialAmount,
    monthlyContribution: suggestedMonthly,
    profile: riskProfile,
    years: 10,
  })

  const result = useSimulation(params)

  const profiles = [
    { value: 'conservative', label: 'Conservador', desc: '5-7% anual', color: '#3b82f6' },
    { value: 'balanced', label: 'Equilibrado', desc: '7-10% anual', color: '#22c55e' },
    { value: 'dynamic', label: 'Dinámico', desc: '10-15% anual', color: '#f59e0b' },
  ]

  return (
    <Card className="h-full border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0 pb-2 sm:pb-4">
        <CardTitle className="text-base sm:text-lg font-bold tracking-tight">Simulador</CardTitle>
      </CardHeader>

      <CardContent className="p-0 space-y-3 sm:space-y-6">
        {/* Profile selector - Compact */}
        <div className="p-0.5 sm:p-1 bg-muted/30 rounded-lg flex gap-0.5 sm:gap-1">
          {profiles.map((profile) => (
            <button
              key={profile.value}
              onClick={() => setParams((prev) => ({ ...prev, profile: profile.value as any }))}
              className={cn(
                'flex-1 py-1 sm:py-1.5 px-1.5 sm:px-2 rounded-md text-[10px] sm:text-xs font-medium transition-all duration-200',
                params.profile === profile.value
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {profile.label}
              <span className="hidden sm:block text-[9px] sm:text-[10px] opacity-70 mt-0.5">
                {profile.desc}
              </span>
            </button>
          ))}
        </div>

        {/* Inputs - More compact on mobile */}
        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 flex items-center gap-1">
              Capital inicial: {formatCurrency(params.initialAmount)}
              <InfoTooltip content="Cantidad de dinero con la que empezarías a invertir. Puede ser ahorro actual disponible." />
            </label>
            <Slider
              value={[params.initialAmount]}
              onValueChange={([v]) => setParams((prev) => ({ ...prev, initialAmount: v }))}
              min={0}
              max={50000}
              step={500}
            />
            <div className="flex justify-between text-[9px] sm:text-xs text-muted-foreground mt-1">
              <span>0€</span>
              <span>50.000€</span>
            </div>
          </div>

          <div>
            <label className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 flex items-center gap-1">
              Aportación mensual: {formatCurrency(params.monthlyContribution)}
              <InfoTooltip content="Cantidad que invertirías cada mes. Basado en tu capacidad de ahorro y el porcentaje de inversión de tu perfil." />
            </label>
            <Slider
              value={[params.monthlyContribution]}
              onValueChange={([v]) => setParams((prev) => ({ ...prev, monthlyContribution: v }))}
              min={0}
              max={2000}
              step={50}
            />
            <div className="flex justify-between text-[9px] sm:text-xs text-muted-foreground mt-1">
              <span>0€</span>
              <span>2.000€</span>
            </div>
          </div>

          <div>
            <label className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 flex items-center gap-1">
              Plazo: {params.years} años
              <InfoTooltip content="Horizonte temporal de inversión. A mayor plazo, mayor beneficio del interés compuesto." />
            </label>
            <Slider
              value={[params.years]}
              onValueChange={([v]) => setParams((prev) => ({ ...prev, years: v }))}
              min={1}
              max={30}
              step={1}
            />
            <div className="flex justify-between text-[9px] sm:text-xs text-muted-foreground mt-1">
              <span>1 año</span>
              <span>30 años</span>
            </div>
          </div>
        </div>

        {/* Results - More compact */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          <ResultCard
            label="Pesimista"
            value={result.conservative}
            color="#ef4444"
            tooltip="Resultado con el rendimiento mínimo del perfil seleccionado"
          />
          <ResultCard
            label="Esperado"
            value={result.expected}
            color="#22c55e"
            tooltip="Resultado con el rendimiento medio esperado del perfil"
          />
          <ResultCard
            label="Optimista"
            value={result.optimistic}
            color="#3b82f6"
            tooltip="Resultado con el rendimiento máximo del perfil seleccionado"
          />
        </div>

        {/* Chart */}
        <div className="w-full">
          <div className="h-60 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={result.chartData}
                margin={{ top: 20, right: 15, left: 5, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="year"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  tickLine={{ stroke: 'hsl(var(--border))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  interval={
                    params.years <= 10 ? 0 : params.years <= 20 ? 1 : Math.floor(params.years / 10)
                  }
                  label={{
                    value: 'Años',
                    position: 'bottom',
                    offset: 20,
                    style: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 },
                  }}
                />
                <YAxis
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  tickLine={{ stroke: 'hsl(var(--border))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}`}
                  width={40}
                  label={{
                    value: 'Miles €',
                    position: 'top',
                    offset: 10,
                    style: {
                      fill: 'hsl(var(--muted-foreground))',
                      fontSize: 10,
                      textAnchor: 'start',
                    },
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'hsl(var(--foreground))',
                  }}
                  formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
                  labelFormatter={(label) => `Año ${label}`}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
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
        </div>

        {/* Info - Compact */}
        <div className="p-2 sm:p-3 bg-muted rounded-lg text-[10px] sm:text-sm text-muted-foreground">
          <div className="flex items-start gap-1.5 sm:gap-2">
            <Info className="h-3 w-3 sm:h-4 sm:w-4 mt-0.5 flex-shrink-0" />
            <p>
              Proyecciones basadas en rendimientos históricos. Los resultados reales pueden variar.
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
      balanced: { min: 0.07, max: 0.1 },
      dynamic: { min: 0.1, max: 0.15 },
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
        contributions: params.initialAmount + params.monthlyContribution * 12 * year,
      })

      if (year < params.years) {
        conservativeValue =
          conservativeValue * (1 + conservativeRate) + params.monthlyContribution * 12
        expectedValue = expectedValue * (1 + expectedRate) + params.monthlyContribution * 12
        optimisticValue = optimisticValue * (1 + optimisticRate) + params.monthlyContribution * 12
      }
    }

    return {
      conservative: conservativeValue,
      expected: expectedValue,
      optimistic: optimisticValue,
      chartData,
    }
  }, [params])
}

function ResultCard({
  label,
  value,
  color,
  tooltip,
  className,
}: {
  label: string
  value: number
  color: string
  tooltip?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'p-1.5 sm:p-2 rounded-lg text-center border bg-card/50 dark:bg-zinc-900 border-border/40 dark:border-white/5',
        className
      )}
    >
      <div className="text-[8px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5 flex items-center justify-center gap-0.5">
        {label}
        {tooltip && <InfoTooltip content={tooltip} className="w-3 h-3" />}
      </div>
      <div className="text-xs sm:text-sm font-bold tracking-tight" style={{ color }}>
        {formatCurrency(value)}
      </div>
    </div>
  )
}
