// components/investment/ProfileForm.tsx
// Profile assessment wizard component

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAnalyzeProfile, useInvestmentOverview } from '@/lib/queries/investment'
import { cn } from '@/lib/utils'
import {
  User,
  Briefcase,
  Shield,
  Clock,
  TrendingUp,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  RefreshCw
} from 'lucide-react'

interface ProfileFormProps {
  accountId: string
}

const STEPS = [
  {
    id: 'age',
    question: '¿Cuál es tu edad?',
    type: 'number',
    field: 'age',
    min: 18,
    max: 99,
    step: 1
  },
  {
    id: 'income',
    question: '¿Cuáles son tus ingresos mensuales netos?',
    type: 'number',
    field: 'monthlyIncome',
    min: 0,
    step: 100
  },
  {
    id: 'stability',
    question: '¿Cómo es la estabilidad de tus ingresos?',
    type: 'select',
    field: 'jobStability',
    options: [
      { value: 'high', label: 'Muy estable (funcionario, indefinido)' },
      { value: 'medium', label: 'Moderadamente estable (contrato largo)' },
      { value: 'low', label: 'Inestable (freelance, comisiones)' }
    ]
  },
  {
    id: 'emergency',
    question: '¿Tienes fondo de emergencia?',
    description: 'Ahorro reservado para imprevistos (3-6 meses de gastos).',
    type: 'select',
    field: 'hasEmergencyFund',
    options: [
      { value: 'yes', label: 'Sí, completo (3+ meses de gastos)' },
      { value: 'partial', label: 'Parcial (1-3 meses)' },
      { value: 'no', label: 'No tengo' }
    ]
  },
  {
    id: 'horizon',
    question: '¿Cuánto tiempo puedes mantener invertido sin necesitar el dinero?',
    type: 'select',
    field: 'horizonYears',
    options: [
      { value: 'short', label: 'Menos de 3 años' },
      { value: 'medium', label: 'Entre 3 y 10 años' },
      { value: 'long', label: 'Más de 10 años' }
    ]
  },
  {
    id: 'reaction',
    question: 'Si tu inversión cae un 20% en un mes, ¿qué harías?',
    description: 'Tu reacción ante pérdidas revela tu tolerancia real al riesgo.',
    type: 'select',
    field: 'reactionToDrop',
    options: [
      { value: 'sell', label: 'Vendería para evitar más pérdidas' },
      { value: 'hold', label: 'Mantendría esperando a que remonte' },
      { value: 'buy_more', label: 'Compraría más aprovechando el precio bajo' }
    ]
  },
  {
    id: 'experience',
    question: '¿Cuál es tu experiencia previa en inversión?',
    type: 'select',
    field: 'experienceLevel',
    options: [
      { value: 'none', label: 'Ninguna - Soy nuevo en esto' },
      { value: 'basic', label: 'Básica - Conozco los conceptos generales' },
      { value: 'intermediate', label: 'Intermedia - He invertido en fondos/ETF' },
      { value: 'advanced', label: 'Avanzada - Conozco acciones, crypto, etc.' }
    ]
  }
]

export function ProfileForm({ accountId }: ProfileFormProps) {
  const { data: investmentData, isLoading: profileLoading } = useInvestmentOverview(accountId)
  const [showForm, setShowForm] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [result, setResult] = useState<any>(null)

  const analyzeMutation = useAnalyzeProfile()

  const profile = investmentData?.profile

  useEffect(() => {
    if (profile && !showForm) {
      // Load existing profile data into answers for potential update
      const horizonMap: Record<number, string> = {
        1: 'short',
        3: 'medium',
        5: 'medium',
        10: 'long',
        15: 'long',
        20: 'long'
      }
      setAnswers({
        age: 30, // These would come from user's actual data
        monthlyIncome: investmentData?.financialSummary?.avgMonthlyIncome * 1.2 || 1000,
        jobStability: 'medium',
        hasEmergencyFund: profile.hasEmergencyFund ? 'partial' : 'no',
        horizonYears: horizonMap[profile.horizonYears] || 'medium',
        reactionToDrop: 'hold',
        experienceLevel: 'none'
      })
    }
  }, [profile, showForm, investmentData])

  const step = STEPS[currentStep]
  const progress = ((currentStep + 1) / STEPS.length) * 100
  const isLastStep = currentStep === STEPS.length - 1
  const canGoNext = step.type === 'number' 
    ? answers[step.field] !== undefined && answers[step.field] !== ''
    : answers[step.field] !== undefined

  const handleAnswer = (value: any) => {
    setAnswers(prev => ({ ...prev, [step.field]: value }))
  }

  const handleNext = () => {
    if (isLastStep) {
      submitForm()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    setCurrentStep(prev => Math.max(0, prev - 1))
  }

  const submitForm = async () => {
    try {
      const result = await analyzeMutation.mutateAsync({
        accountId,
        answers: {
          age: Number(answers.age),
          monthlyIncome: Number(answers.monthlyIncome),
          jobStability: answers.jobStability,
          hasEmergencyFund: answers.hasEmergencyFund,
          horizonYears: answers.horizonYears,
          reactionToDrop: answers.reactionToDrop,
          experienceLevel: answers.experienceLevel
        }
      })
      setResult(result)
      setShowForm(false)
    } catch (error) {
      console.error('Error analyzing profile:', error)
    }
  }

  const handleUpdateProfile = () => {
    setShowForm(true)
    setResult(null)
    setCurrentStep(0)
  }

  // Show existing profile result
  if (profile && !showForm && !result) {
    return (
      <Card className="bg-gradient-to-br from-purple-50/50 to-violet-50/30 dark:from-purple-950/20 dark:to-violet-950/10 border-purple-200/50 dark:border-purple-800/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
              <User className="h-5 w-5" />
              Evaluación de Perfil de Riesgo
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUpdateProfile}
              className="gap-1 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
            >
              <RefreshCw className="h-3 w-3" />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Profile Badge */}
          <div className="flex items-center gap-3 mb-4">
            <RiskBadge profile={profile.riskProfile} />
            <span className="text-sm text-muted-foreground">
              {profile.horizonYears} años de horizonte
            </span>
          </div>

          {/* Investment settings */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{profile.investmentPercentage}%</div>
              <div className="text-xs text-muted-foreground">Del ahorro a invertir</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(profile.monthlyInvestable || investmentData?.financialSummary?.savingsCapacity * (profile.investmentPercentage / 100) || 0)}
              </div>
              <div className="text-xs text-muted-foreground">Cantidad mensual</div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show form or result
  if (profileLoading) {
    return (
      <Card className="bg-gradient-to-br from-purple-50/50 to-violet-50/30 dark:from-purple-950/20 dark:to-violet-950/10 border-purple-200/50 dark:border-purple-800/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
            <User className="h-5 w-5" />
            Evaluación de Perfil de Riesgo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show result after form submission
  if (result) {
    return <ProfileResult result={result} accountId={accountId} onUpdate={handleUpdateProfile} />
  }

  // Show form
  return (
    <Card className="max-w-2xl mx-auto bg-gradient-to-br from-purple-50/50 to-violet-50/30 dark:from-purple-950/20 dark:to-violet-950/10 border-purple-200/50 dark:border-purple-800/30">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
            <User className="h-5 w-5" />
            Evaluación de Perfil de Riesgo
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            Paso {currentStep + 1} de {STEPS.length}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>

      <CardContent>
        <div className="py-8">
          {/* Question */}
          <h3 className="text-xl font-semibold mb-2">{step.question}</h3>
          {step.description && (
            <p className="text-muted-foreground mb-6">{step.description}
          </p>
          )}

          {/* Answer options */}
          <div className="space-y-3">
            {step.type === 'number' && (
              <input
                type="number"
                min={step.min}
                max={step.max}
                step={step.step}
                value={answers[step.field] || ''}
                onChange={(e) => handleAnswer(e.target.value)}
                className="w-full p-3 text-lg border rounded-lg focus:ring-2 focus:ring-primary"
                placeholder={
                  step.field === 'age' ? 'Tu edad' : 'Ingresos mensuales (€)'
                }
                onKeyDown={(e) => e.key === 'Enter' && canGoNext && handleNext()}
              />
            )}

            {step.type === 'select' && step.options?.map((option) => (
              <button
                key={option.value}
                onClick={() => handleAnswer(option.value)}
                className={cn(
                  'w-full p-4 text-left border rounded-lg transition-all',
                  answers[step.field] === option.value
                    ? 'border-purple-500 bg-purple-100 dark:bg-purple-900/30 ring-2 ring-purple-500'
                    : 'hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                    answers[step.field] === option.value
                      ? 'border-purple-500 bg-purple-500'
                      : 'border-muted-foreground'
                  )}>
                    {answers[step.field] === option.value && (
                      <CheckCircle2 className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <span>{option.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Atrás
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canGoNext || analyzeMutation.isPending}
            className="gap-2 bg-purple-600 hover:bg-purple-700"
          >
            {analyzeMutation.isPending ? (
              <>
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Analizando...
              </>
            ) : (
              <>
                {isLastStep ? 'Finalizar' : 'Siguiente'}
                {!isLastStep && <ArrowRight className="h-4 w-4" />}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ========================
// Subcomponents
// ========================

function ProfileResult({ result, accountId, onUpdate }: { result: any; accountId: string; onUpdate: () => void }) {
  const profileColors: Record<'conservative' | 'balanced' | 'dynamic', string> = {
    conservative: 'bg-blue-500',
    balanced: 'bg-yellow-500',
    dynamic: 'bg-red-500'
  }

  const profileLabels: Record<'conservative' | 'balanced' | 'dynamic', string> = {
    conservative: 'Conservador',
    balanced: 'Equilibrado',
    dynamic: 'Dinámico'
  }

  const recommendedProfile = result.recommendedProfile as keyof typeof profileColors

  return (
    <Card className="max-w-2xl mx-auto bg-gradient-to-br from-purple-50/50 to-violet-50/30 dark:from-purple-950/20 dark:to-violet-950/10 border-purple-200/50 dark:border-purple-800/30">
      <CardHeader className="text-center">
        <div className={cn(
          'w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center',
          profileColors[recommendedProfile]
        )}>
          <span className="text-3xl font-bold text-white">
            {recommendedProfile.charAt(0).toUpperCase()}
          </span>
        </div>
        <CardTitle className="text-2xl text-purple-700 dark:text-purple-300">
          Perfil: {profileLabels[recommendedProfile]}
        </CardTitle>
        <p className="text-muted-foreground">
          Confianza: {Math.round(result.confidence * 100)}%
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Reasoning */}
        <div className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-purple-100">
          <h4 className="font-medium mb-2 flex items-center gap-2 text-purple-700 dark:text-purple-300">
            <User className="h-4 w-4" />
            Análisis personalizado
          </h4>
          <p className="text-sm text-muted-foreground">
            {result.reasoning}
          </p>
        </div>

        {/* Investment percentages */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center border border-green-100">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {result.investmentPercentage}%
            </div>
            <div className="text-sm text-muted-foreground">
              Del ahorro a invertir
            </div>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center border border-blue-100">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {result.monthlyInvestable}€
            </div>
            <div className="text-sm text-muted-foreground">
              Cantidad mensual
            </div>
          </div>
        </div>

        {/* Historical insights */}
        {result.historicalInsights && (
          <div className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg space-y-2 border border-purple-100">
            <h4 className="font-medium flex items-center gap-2 text-purple-700 dark:text-purple-300">
              <Clock className="h-4 w-4" />
              Análisis de tu historial
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Meses analizados: <strong>{result.historicalInsights.monthsAnalyzed}</strong></div>
              <div>Tendencia: <strong>{result.historicalInsights.trend}</strong></div>
              <div>Mejor mes: <strong>{result.historicalInsights.bestMonth}</strong></div>
              <div>Peor mes: <strong>{result.historicalInsights.worstMonth}</strong></div>
            </div>
          </div>
        )}

        {/* Warnings */}
        {result.warnings?.length > 0 && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100">
            <h4 className="font-medium mb-2 flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <Shield className="h-4 w-4" />
              Consideraciones
            </h4>
            <ul className="list-disc list-inside text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
              {result.warnings.map((warning: string, i: number) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Update button */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onUpdate}
            className="flex-1 gap-2 border-purple-300 text-purple-700 hover:bg-purple-100"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar perfil
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

function RiskBadge({ profile }: { profile: string }) {
  const colors: Record<string, string> = {
    conservative: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    balanced: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    dynamic: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  }

  const labels: Record<string, string> = {
    conservative: 'Conservador',
    balanced: 'Equilibrado',
    dynamic: 'Dinámico'
  }

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[profile] || colors.balanced}`}>
      {labels[profile] || labels.balanced}
    </span>
  )
}
