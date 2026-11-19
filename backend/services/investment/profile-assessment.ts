// services/investment/profile-assessment.ts
// The investor profile from the seven test answers, by fixed rules: the same answers always give
// the same profile, and nothing leaves the server. The rules are the table the AI prompt used to
// apply (conservative / balanced / dynamic by savings, horizon and reaction to a drop).

export type RiskProfile = 'conservative' | 'balanced' | 'dynamic'

export interface ProfileTestAnswers {
  age: number
  monthlyIncome: number
  jobStability: 'high' | 'medium' | 'low'
  hasEmergencyFund: 'yes' | 'partial' | 'no'
  horizonYears: '<3' | '3-10' | '>10'
  reactionToDrop: 'sell' | 'hold' | 'buy_more'
  experienceLevel: 'none' | 'basic' | 'intermediate' | 'advanced'
}

/** What the account's own movements say, computed in the browser from the decrypted data. */
export interface ProfileTestMetrics {
  avgMonthlyIncome: number
  avgMonthlyExpenses: number
  savingsCapacity: number
  savingsRate: number
  historicalMonths: number
  trend: 'improving' | 'stable' | 'declining'
  deficitMonths: number
}

export interface ProfileAssessment {
  recommendedProfile: RiskProfile
  /** Risk tolerance points, 0 to MAX_SCORE, before the caps */
  score: number
  maxScore: number
  /** Points range of the profile given (it can come from a cap, not from the points) */
  scoreRange: { min: number; max: number }
  confidence: number
  reasoning: string
  investmentPercentage: number
  monthlyInvestable: number
  liquidityReserve: number
  historicalInsights: {
    monthsAnalyzed: number
    trend: string
    bestMonth: string
    worstMonth: string
    savingsConsistency: string
  }
  warnings: string[]
  marketContext: string
}

const ORDER: RiskProfile[] = ['conservative', 'balanced', 'dynamic']
const LABEL: Record<RiskProfile, string> = {
  conservative: 'conservador',
  balanced: 'equilibrado',
  dynamic: 'dinámico',
}

/** Points range of each profile: 0–5 conservative, 6–10 balanced, 11–15 dynamic. */
export const MAX_SCORE = 15
export const SCORE_RANGE: Record<RiskProfile, { min: number; max: number }> = {
  conservative: { min: 0, max: 5 },
  balanced: { min: 6, max: 10 },
  dynamic: { min: 11, max: MAX_SCORE },
}

/** Share of the monthly savings that goes to investing, [low, usual, high], by profile. */
const PERCENTAGE: Record<RiskProfile, [number, number, number]> = {
  conservative: [5, 10, 10],
  balanced: [15, 25, 30],
  dynamic: [30, 40, 45],
}

const MIN_RELIABLE_MONTHS = 3

const euros = (n: number) =>
  new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n)

const lower = (a: RiskProfile, b: RiskProfile) =>
  ORDER[Math.min(ORDER.indexOf(a), ORDER.indexOf(b))]

/**
 * Risk tolerance score, 0 to MAX_SCORE: horizon (0/2/4), reaction to a 20 % drop (0/2/4), experience
 * (0–3), age (2 under 35, 1 up to 54, 0 from 55) and income stability (0–2).
 */
export function riskScore(a: ProfileTestAnswers): number {
  const horizon = { '<3': 0, '3-10': 2, '>10': 4 }[a.horizonYears]
  const reaction = { sell: 0, hold: 2, buy_more: 4 }[a.reactionToDrop]
  const experience = { none: 0, basic: 1, intermediate: 2, advanced: 3 }[a.experienceLevel]
  const age = a.age < 35 ? 2 : a.age < 55 ? 1 : 0
  const stability = { high: 2, medium: 1, low: 0 }[a.jobStability]
  return horizon + reaction + experience + age + stability
}

export function assessProfile(
  answers: ProfileTestAnswers,
  metrics?: ProfileTestMetrics,
  liquidityReserve = 0
): ProfileAssessment {
  const score = riskScore(answers)
  const byScore: RiskProfile =
    score <= SCORE_RANGE.conservative.max
      ? 'conservative'
      : score <= SCORE_RANGE.balanced.max
        ? 'balanced'
        : 'dynamic'

  const reasons: string[] = []
  const warnings: string[] = []
  let profile = byScore

  const hasHistory = !!metrics && metrics.historicalMonths > 0
  const noSavings = hasHistory && metrics.savingsCapacity <= 0

  // Caps: what the answers can afford, whatever the score says.
  if (answers.horizonYears === '<3' && profile !== 'conservative') {
    profile = 'conservative'
    reasons.push(
      'Con menos de 3 años no hay tiempo de recuperarse de una caída, así que el perfil es conservador.'
    )
  }
  if (answers.reactionToDrop === 'sell' && profile !== 'conservative') {
    profile = 'conservative'
    reasons.push(
      'Venderías tras una caída del 20 %, y quien vende en las caídas convierte la bajada en pérdida: perfil conservador.'
    )
  }
  if (answers.hasEmergencyFund === 'no' && profile === 'dynamic') {
    profile = 'balanced'
    reasons.push('Sin fondo de emergencia, el perfil se limita a equilibrado.')
  }
  if (noSavings && profile !== 'conservative') {
    profile = lower(profile, 'conservative')
    reasons.push(
      'En los meses registrados no te queda ahorro, así que el perfil es conservador hasta que lo haya.'
    )
  }

  if (reasons.length === 0) {
    reasons.unshift(
      `Por tu horizonte, cómo reaccionas ante una caída, tu experiencia, tu edad y la estabilidad de tus ingresos, tu perfil es ${LABEL[profile]}.`
    )
  } else {
    reasons.unshift(`Por tus respuestas tu perfil sería ${LABEL[byScore]}.`)
  }

  // How much of the savings goes to investing. Without an emergency fund, nothing: the savings
  // build the fund first, as an adviser would say.
  const [low, usual, high] = PERCENTAGE[profile]
  let percentage = usual
  if (answers.hasEmergencyFund === 'no') {
    percentage = 0
  } else if (answers.hasEmergencyFund === 'partial') {
    percentage = low
  } else if (metrics && metrics.savingsRate >= 25) {
    percentage = high
  }

  if (answers.hasEmergencyFund === 'no') {
    warnings.push(
      'Antes de invertir, reúne un fondo de emergencia de al menos 3 meses de gastos: hasta entonces, todo tu ahorro va al fondo.'
    )
  } else if (answers.hasEmergencyFund === 'partial') {
    warnings.push(
      'Completa el fondo de emergencia hasta 3 meses de gastos; mientras, se invierte la parte baja del rango.'
    )
  }

  if (hasHistory) {
    if (noSavings) {
      warnings.push(
        'En los meses registrados gastas lo mismo o más de lo que ingresas: ahora no hay ahorro que invertir.'
      )
    }
    if (metrics.deficitMonths > 0 && !noSavings) {
      warnings.push(
        `En ${metrics.deficitMonths} de ${metrics.historicalMonths} meses gastaste más de lo que ingresaste.`
      )
    }
    if (metrics.historicalMonths < MIN_RELIABLE_MONTHS) {
      warnings.push(
        `Con ${metrics.historicalMonths === 1 ? '1 mes' : `${metrics.historicalMonths} meses`} de movimientos, el ahorro mensual es una estimación poco fiable.`
      )
    } else if (
      metrics.avgMonthlyIncome > 0 &&
      Math.abs(answers.monthlyIncome - metrics.avgMonthlyIncome) / metrics.avgMonthlyIncome > 0.25
    ) {
      warnings.push(
        `Dices ingresar ${euros(answers.monthlyIncome)} al mes y tus movimientos dan ${euros(metrics.avgMonthlyIncome)}: el plan usa lo registrado.`
      )
    }
  } else {
    warnings.push(
      'Aún no hay movimientos registrados: el plan no puede calcular cuánto ahorras al mes.'
    )
  }

  const monthlyInvestable =
    hasHistory && metrics.savingsCapacity > 0
      ? Math.round((metrics.savingsCapacity * percentage) / 100)
      : 0

  const deficitShare = hasHistory ? metrics.deficitMonths / metrics.historicalMonths : 0

  return {
    recommendedProfile: profile,
    score,
    maxScore: MAX_SCORE,
    scoreRange: SCORE_RANGE[profile],
    confidence: 1,
    reasoning: reasons.join(' '),
    investmentPercentage: percentage,
    monthlyInvestable,
    liquidityReserve,
    historicalInsights: {
      monthsAnalyzed: metrics?.historicalMonths ?? 0,
      trend: metrics?.trend ?? 'stable',
      bestMonth: '',
      worstMonth: '',
      savingsConsistency: !hasHistory
        ? ''
        : deficitShare <= 0.1
          ? 'alta'
          : deficitShare <= 0.3
            ? 'media'
            : 'baja',
    },
    warnings,
    marketContext: '',
  }
}
