'use client'

import { useId, useState } from 'react'
import { Button, Input, Sheet } from '@/components/ui'
import { useAnalyzeProfile } from '@/lib/queries/investment'
import type { ProfileAnswers, ProfileAssessmentResult } from '@/lib/api/investment'
import type { FinancialSummary } from '@/hooks/useFinancialMetrics'
import { validateProfileField } from '@/validators/investment-validators'
import { PROFILE_LABELS } from './RiskProfile'

type Field = Exclude<keyof ProfileAnswers, 'financialMetrics'>

type Step =
  | { field: Field; question: string; hint?: string; type: 'number'; placeholder: string }
  | {
      field: Field
      question: string
      hint?: string
      type: 'choice'
      options: { value: string; label: string }[]
    }

const STEPS: Step[] = [
  { field: 'age', question: '¿Cuántos años tienes?', type: 'number', placeholder: 'Entre 18 y 99' },
  {
    field: 'monthlyIncome',
    question: '¿Cuánto ingresas al mes, en neto?',
    type: 'number',
    placeholder: 'En euros, sin decimales',
  },
  {
    field: 'jobStability',
    question: '¿Cómo de estables son tus ingresos?',
    type: 'choice',
    options: [
      { value: 'high', label: 'Muy estables (funcionario, indefinido)' },
      { value: 'medium', label: 'Bastante estables (contrato largo)' },
      { value: 'low', label: 'Inestables (autónomo, comisiones)' },
    ],
  },
  {
    field: 'hasEmergencyFund',
    question: '¿Tienes un fondo de emergencia?',
    hint: 'Ahorro apartado para imprevistos.',
    type: 'choice',
    options: [
      { value: 'yes', label: 'Sí, de 3 meses de gastos o más' },
      { value: 'partial', label: 'En parte, de 1 a 3 meses' },
      { value: 'no', label: 'No' },
    ],
  },
  {
    field: 'horizonYears',
    question: '¿Cuánto tiempo puedes dejar el dinero invertido sin tocarlo?',
    type: 'choice',
    options: [
      { value: '<3', label: 'Menos de 3 años' },
      { value: '3-10', label: 'Entre 3 y 10 años' },
      { value: '>10', label: 'Más de 10 años' },
    ],
  },
  {
    field: 'reactionToDrop',
    question: 'Si lo invertido cae un 20 % en un mes, ¿qué haces?',
    hint: 'Cómo reaccionas ante una pérdida dice cuánto riesgo toleras de verdad.',
    type: 'choice',
    options: [
      { value: 'sell', label: 'Vendo para no perder más' },
      { value: 'hold', label: 'Espero a que se recupere' },
      { value: 'buy_more', label: 'Compro más, que está barato' },
    ],
  },
  {
    field: 'experienceLevel',
    question: '¿Cuánta experiencia tienes invirtiendo?',
    type: 'choice',
    options: [
      { value: 'none', label: 'Ninguna' },
      { value: 'basic', label: 'Básica: conozco los conceptos' },
      { value: 'intermediate', label: 'Media: he invertido en fondos o ETF' },
      { value: 'advanced', label: 'Avanzada: acciones, cripto…' },
    ],
  },
]

interface ProfileTestProps {
  accountId: string
  metrics: FinancialSummary
  onClose: () => void
}

/** The seven questions of the investor profile, one at a time, and the result. */
export function ProfileTest({ accountId, metrics, onClose }: ProfileTestProps) {
  const legendId = useId()
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Partial<Record<Field, string>>>({})
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [result, setResult] = useState<ProfileAssessmentResult | null>(null)
  const analyze = useAnalyzeProfile()

  const step = STEPS[index]
  const answer = answers[step.field] ?? ''
  const isLast = index === STEPS.length - 1

  const submit = async () => {
    const payload = {
      ...answers,
      age: Number(answers.age),
      monthlyIncome: Number(answers.monthlyIncome),
      financialMetrics: {
        avgMonthlyIncome: metrics.avgMonthlyIncome,
        avgMonthlyExpenses: metrics.avgMonthlyExpenses,
        savingsCapacity: metrics.savingsCapacity,
        savingsRate: metrics.savingsRate,
        historicalMonths: metrics.historicalMonths,
        trend: metrics.trend,
        deficitMonths: metrics.deficitMonths,
      },
    } as ProfileAnswers
    try {
      setResult(await analyze.mutateAsync({ accountId, answers: payload }))
    } catch {
      setFieldError('No se ha podido calcular el perfil. Inténtalo de nuevo.')
    }
  }

  const next = () => {
    if (step.type === 'number') {
      const check = validateProfileField(step.field, answer)
      if (!check.success) {
        setFieldError(check.error)
        return
      }
    }
    setFieldError(null)
    if (isLast) submit()
    else setIndex(index + 1)
  }

  if (result) {
    return (
      <Sheet
        open
        onClose={onClose}
        title="Tu perfil"
        footer={
          <Button className="flex-1" onClick={onClose}>
            Listo
          </Button>
        }
      >
        <div>
          <p className="text-xl font-medium text-text-primary">
            {PROFILE_LABELS[result.recommendedProfile]}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            {result.score} de {result.maxScore} puntos · el perfil{' '}
            {PROFILE_LABELS[result.recommendedProfile].toLowerCase()} va de {result.scoreRange.min}{' '}
            a {result.scoreRange.max}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            {result.investmentPercentage > 0
              ? `Inviertes el ${result.investmentPercentage} % de lo que ahorras.`
              : 'De momento no inviertes: todo tu ahorro va al fondo de emergencia.'}
          </p>
        </div>
        {result.reasoning && <p className="text-sm text-text-primary">{result.reasoning}</p>}
        {result.warnings?.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-sm text-text-secondary">
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}
        <p className="text-xs text-text-secondary">
          Orientativo, calculado con reglas fijas a partir de tus respuestas y tus movimientos: no
          es asesoramiento financiero.
        </p>
      </Sheet>
    )
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Test de perfil"
      footer={
        <>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setFieldError(null)
              setIndex(index - 1)
            }}
            disabled={index === 0 || analyze.isPending}
          >
            Atrás
          </Button>
          <Button
            className="flex-1"
            onClick={next}
            disabled={!answer}
            isLoading={analyze.isPending}
          >
            {isLast ? 'Ver mi perfil' : 'Siguiente'}
          </Button>
        </>
      }
    >
      <div>
        <p className="text-xs text-text-secondary">
          Pregunta {index + 1} de {STEPS.length}
        </p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-layer-3" aria-hidden="true">
          <div
            className="h-full bg-accent"
            style={{ width: `${((index + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <fieldset>
        <legend id={legendId} className="text-base font-medium text-text-primary">
          {step.question}
        </legend>
        {step.hint && <p className="mt-1 text-sm text-text-secondary">{step.hint}</p>}

        <div className="mt-4 space-y-2">
          {step.type === 'number' ? (
            <Input
              aria-labelledby={legendId}
              inputMode="numeric"
              autoFocus
              placeholder={step.placeholder}
              maxLength={step.field === 'age' ? 2 : 6}
              value={answer}
              error={fieldError ?? undefined}
              onChange={(e) => {
                setAnswers({ ...answers, [step.field]: e.target.value.replace(/\D/g, '') })
                setFieldError(null)
              }}
              onKeyDown={(e) => e.key === 'Enter' && answer && next()}
            />
          ) : (
            step.options.map((option) => (
              <label
                key={option.value}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-layer-3 px-3 py-2 text-sm text-text-primary hover:bg-layer-2 has-[:checked]:border-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
              >
                <input
                  type="radio"
                  name={step.field}
                  value={option.value}
                  checked={answer === option.value}
                  onChange={() => setAnswers({ ...answers, [step.field]: option.value })}
                  className="h-4 w-4 accent-accent focus-visible:outline-none"
                />
                {option.label}
              </label>
            ))
          )}
        </div>
        {step.type === 'choice' && fieldError && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {fieldError}
          </p>
        )}
      </fieldset>
    </Sheet>
  )
}
