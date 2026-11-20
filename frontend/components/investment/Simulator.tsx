'use client'

import { useId, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Money } from '@/components/ui'
import { Slider } from '@/components/ui/Slider'
import { ChartTooltip, chartColors } from '@/components/charts/ChartTooltip'
import { formatMoney, formatMoneyCompact } from '@/lib/money'

type Profile = 'conservative' | 'balanced' | 'dynamic'

// Yearly return range of each profile: the low end is the pessimistic case, the high end the optimistic
const RETURNS: Record<Profile, { min: number; max: number }> = {
  conservative: { min: 0.05, max: 0.07 },
  balanced: { min: 0.07, max: 0.1 },
  dynamic: { min: 0.1, max: 0.15 },
}

const PROFILES: { value: Profile; label: string }[] = [
  { value: 'conservative', label: 'Conservador' },
  { value: 'balanced', label: 'Equilibrado' },
  { value: 'dynamic', label: 'Dinámico' },
]

interface SimulatorProps {
  riskProfile?: Profile
}

/** What a starting sum plus a monthly contribution could become, under three return rates. */
export function Simulator({ riskProfile = 'balanced' }: SimulatorProps) {
  const [profile, setProfile] = useState<Profile>(riskProfile)
  const [initial, setInitial] = useState(5000)
  const [monthly, setMonthly] = useState(200)
  const [years, setYears] = useState(10)
  const result = useSimulation({ profile, initial, monthly, years })
  const { min, max } = RETURNS[profile]

  const outcomes = [
    { label: 'Pesimista', value: result.pessimistic, strong: false },
    { label: 'Esperado', value: result.expected, strong: true },
    { label: 'Optimista', value: result.optimistic, strong: false },
  ]

  return (
    <section aria-labelledby="simulator">
      <h2 id="simulator" className="mb-3 text-sm font-medium text-text-primary">
        Simulador
      </h2>

      <div
        role="radiogroup"
        aria-label="Perfil de la simulación"
        className="flex rounded-lg bg-layer-2 p-0.5 text-sm"
      >
        {PROFILES.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={profile === option.value}
            onClick={() => setProfile(option.value)}
            className={`flex-1 rounded-md px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              profile === option.value
                ? 'bg-layer-1 font-medium text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-text-secondary">
        Entre un {Math.round(min * 100)} % y un {Math.round(max * 100)} % al año.
      </p>

      <div className="mt-4 space-y-4">
        <Range
          label="Capital inicial"
          value={initial}
          display={formatMoney(initial)}
          onChange={setInitial}
          max={50000}
          step={500}
        />
        <Range
          label="Aportación al mes"
          value={monthly}
          display={formatMoney(monthly)}
          onChange={setMonthly}
          max={2000}
          step={50}
        />
        <Range
          label="Plazo"
          value={years}
          display={years === 1 ? '1 año' : `${years} años`}
          onChange={setYears}
          min={1}
          max={30}
          step={1}
        />
      </div>

      <dl className="mt-6 grid grid-cols-3 gap-3">
        {outcomes.map((outcome) => (
          <div key={outcome.label} className="min-w-0">
            <dt className="text-xs text-text-secondary sm:text-sm">{outcome.label}</dt>
            <dd className="mt-1 truncate text-sm sm:text-base">
              <Money
                value={outcome.value}
                tone="neutral"
                className={outcome.strong ? 'font-bold' : 'font-medium'}
              />
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 h-60 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={result.chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={chartColors.grid} />
            <XAxis
              dataKey="year"
              tickLine={false}
              axisLine={false}
              tick={{ fill: chartColors.axis, fontSize: 12 }}
              tickFormatter={(year: number) =>
                year === 0 ? 'Hoy' : year === 1 ? '1 año' : `${year} años`
              }
              minTickGap={16}
            />
            <YAxis
              tickFormatter={formatMoneyCompact}
              tickLine={false}
              axisLine={false}
              tick={{ fill: chartColors.axis, fontSize: 12 }}
              width={72}
            />
            <Tooltip
              content={<ChartTooltip />}
              labelFormatter={(year) => (Number(year) === 0 ? 'Hoy' : `Año ${year}`)}
            />
            <Line
              type="monotone"
              dataKey="optimistic"
              name="Optimista"
              stroke={chartColors.axis}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="expected"
              name="Esperado"
              stroke={chartColors.line}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="pessimistic"
              name="Pesimista"
              stroke={chartColors.axis}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-text-secondary">
        Rentabilidades fijas de ejemplo, sin comisiones ni impuestos. Lo real puede ser distinto.
      </p>
    </section>
  )
}

function Range({
  label,
  value,
  display,
  onChange,
  min = 0,
  max,
  step,
}: {
  label: string
  value: number
  display: string
  onChange: (_value: number) => void
  min?: number
  max: number
  step: number
}) {
  const id = useId()
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <label htmlFor={id} className="text-text-secondary">
          {label}
        </label>
        <span className="font-medium tabular-nums text-text-primary">{display}</span>
      </div>
      <Slider
        id={id}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        aria-valuetext={display}
      />
    </div>
  )
}

function useSimulation({
  profile,
  initial,
  monthly,
  years,
}: {
  profile: Profile
  initial: number
  monthly: number
  years: number
}) {
  return useMemo(() => {
    const { min, max } = RETURNS[profile]
    const rates = { pessimistic: min, expected: (min + max) / 2, optimistic: max }
    const value = { pessimistic: initial, expected: initial, optimistic: initial }
    const chartData = []

    for (let year = 0; year <= years; year++) {
      chartData.push({
        year,
        pessimistic: Math.round(value.pessimistic),
        expected: Math.round(value.expected),
        optimistic: Math.round(value.optimistic),
      })
      if (year < years) {
        for (const key of ['pessimistic', 'expected', 'optimistic'] as const) {
          value[key] = value[key] * (1 + rates[key]) + monthly * 12
        }
      }
    }

    return { ...value, chartData }
  }, [profile, initial, monthly, years])
}
