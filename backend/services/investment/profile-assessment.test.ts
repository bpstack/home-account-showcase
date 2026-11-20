// Real-life personas and the rules table. The expected profiles were written from what a typical
// adviser would accept for each person, before running the rules; where two are reasonable, both
// are accepted. Ranges come from the rules table, not from the code. The emergency fund is not an
// input any more (ADR-016): the profile describes the person, the fund only decides how much of
// the savings is invested, in the plan.
import { describe, expect, it } from 'vitest'
import {
  assessProfile,
  type ProfileTestAnswers,
  type ProfileTestMetrics,
  type RiskProfile,
} from './profile-assessment.js'

const saving = (income: number, rate: number, months = 12): ProfileTestMetrics => ({
  avgMonthlyIncome: income,
  avgMonthlyExpenses: Math.round(income * (1 - rate / 100)),
  savingsCapacity: Math.round((income * rate) / 100),
  savingsRate: rate,
  historicalMonths: months,
  trend: 'stable',
  deficitMonths: rate < 0 ? Math.round(months * 0.7) : 0,
})

const answers = (over: Partial<ProfileTestAnswers>): ProfileTestAnswers => ({
  age: 35,
  monthlyIncome: 2000,
  jobStability: 'medium',
  horizonYears: '3-10',
  reactionToDrop: 'hold',
  experienceLevel: 'basic',
  ...over,
})

const C: RiskProfile = 'conservative'
const B: RiskProfile = 'balanced'
const D: RiskProfile = 'dynamic'

const PERSONAS: Array<[string, Partial<ProfileTestAnswers>, ProfileTestMetrics, RiskProfile[]]> = [
  [
    'student, unstable, long horizon',
    {
      age: 22,
      monthlyIncome: 900,
      jobStability: 'low',
      horizonYears: '>10',
      experienceLevel: 'none',
    },
    saving(900, 10),
    [C, B],
  ],
  [
    'young professional, stable, buys more',
    {
      age: 29,
      monthlyIncome: 2400,
      jobStability: 'high',
      horizonYears: '>10',
      reactionToDrop: 'buy_more',
      experienceLevel: 'intermediate',
    },
    saving(2400, 25),
    [D],
  ],
  [
    'young, no experience, long horizon',
    { age: 27, monthlyIncome: 1800, horizonYears: '>10', experienceLevel: 'none' },
    saving(1800, 15),
    [B],
  ],
  ['family, medium horizon', { age: 41, monthlyIncome: 3200 }, saving(3200, 12), [B]],
  [
    'self-employed, unstable, long horizon',
    {
      age: 45,
      monthlyIncome: 2800,
      jobStability: 'low',
      horizonYears: '>10',
      experienceLevel: 'intermediate',
    },
    saving(2800, 18),
    [B],
  ],
  [
    'near retirement, medium horizon',
    { age: 60, monthlyIncome: 3000, jobStability: 'high', experienceLevel: 'intermediate' },
    saving(3000, 20),
    [C, B],
  ],
  [
    'retired, short horizon, sells',
    {
      age: 68,
      monthlyIncome: 1500,
      jobStability: 'high',
      horizonYears: '<3',
      reactionToDrop: 'sell',
    },
    saving(1500, 8),
    [C],
  ],
  [
    'nervous saver, long horizon, sells',
    { jobStability: 'high', horizonYears: '>10', reactionToDrop: 'sell' },
    saving(2500, 20),
    [C],
  ],
  [
    'expert, buys more',
    {
      age: 50,
      monthlyIncome: 5000,
      jobStability: 'high',
      horizonYears: '>10',
      reactionToDrop: 'buy_more',
      experienceLevel: 'advanced',
    },
    saving(5000, 30),
    [D],
  ],
  [
    'saving for a flat deposit in 2 years',
    { age: 32, monthlyIncome: 2600, horizonYears: '<3', experienceLevel: 'intermediate' },
    saving(2600, 30),
    [C],
  ],
  [
    '62 with a long horizon, expert',
    {
      age: 62,
      monthlyIncome: 4000,
      jobStability: 'high',
      horizonYears: '>10',
      reactionToDrop: 'buy_more',
      experienceLevel: 'advanced',
    },
    saving(4000, 30),
    [B, D],
  ],
  [
    'young risk taker, unstable income',
    {
      age: 24,
      monthlyIncome: 1500,
      jobStability: 'low',
      horizonYears: '>10',
      reactionToDrop: 'buy_more',
      experienceLevel: 'advanced',
    },
    saving(1500, 10),
    [B, D],
  ],
  [
    'spends more than earns',
    { horizonYears: '>10', experienceLevel: 'intermediate' },
    saving(2000, -5),
    [C],
  ],
  [
    'civil servant, no experience',
    {
      age: 38,
      monthlyIncome: 2300,
      jobStability: 'high',
      horizonYears: '>10',
      experienceLevel: 'none',
    },
    saving(2300, 20),
    [B],
  ],
  [
    'commission sales, buys more',
    {
      age: 33,
      monthlyIncome: 3000,
      jobStability: 'low',
      horizonYears: '>10',
      reactionToDrop: 'buy_more',
      experienceLevel: 'intermediate',
    },
    saving(3000, 25),
    [B, D],
  ],
]

describe('real-life personas get a reasonable profile', () => {
  it.each(PERSONAS)('%s', (_who, over, metrics, accepted) => {
    expect(accepted).toContain(assessProfile(answers(over), metrics).recommendedProfile)
  })
})

describe('rules table', () => {
  it('under 3 years of horizon is conservative, whatever else', () => {
    const a = answers({
      age: 25,
      jobStability: 'high',
      horizonYears: '<3',
      reactionToDrop: 'buy_more',
      experienceLevel: 'advanced',
    })
    expect(assessProfile(a, saving(3000, 30)).recommendedProfile).toBe(C)
  })

  it('selling after a 20 % drop is conservative', () => {
    const a = answers({
      age: 25,
      jobStability: 'high',
      horizonYears: '>10',
      reactionToDrop: 'sell',
      experienceLevel: 'advanced',
    })
    expect(assessProfile(a, saving(3000, 30)).recommendedProfile).toBe(C)
  })

  it('with no savings in the recorded months, conservative and it says why', () => {
    const r = assessProfile(answers({ horizonYears: '>10' }), saving(2000, -5))
    expect(r.recommendedProfile).toBe(C)
    expect(r.warnings.join(' ')).toMatch(/no hay ahorro/)
  })

  it('without movements, it says the savings cannot be worked out', () => {
    const r = assessProfile(answers({}))
    expect(r.warnings.join(' ')).toMatch(/no hay movimientos/i)
  })

  it('same answers, same result', () => {
    const a = answers({ horizonYears: '>10' })
    expect(assessProfile(a, saving(2000, 20))).toEqual(assessProfile(a, saving(2000, 20)))
  })
})

describe('every combination of answers', () => {
  // conservative 0–5 points, balanced 6–10, dynamic 11–15
  const RANGES: Record<RiskProfile, [number, number]> = {
    conservative: [0, 5],
    balanced: [6, 10],
    dynamic: [11, 15],
  }
  const all: ProfileTestAnswers[] = []
  for (const age of [22, 45, 68])
    for (const jobStability of ['high', 'medium', 'low'] as const)
      for (const horizonYears of ['<3', '3-10', '>10'] as const)
        for (const reactionToDrop of ['sell', 'hold', 'buy_more'] as const)
          for (const experienceLevel of ['none', 'basic', 'intermediate', 'advanced'] as const)
            all.push(answers({ age, jobStability, horizonYears, reactionToDrop, experienceLevel }))

  it.each([-5, 10, 30])('stay within the profile ranges, saving %i per cent', (rate) => {
    for (const a of all) {
      const r = assessProfile(a, saving(2000, rate))
      const range = RANGES[r.recommendedProfile]
      expect(r.score).toBeGreaterThanOrEqual(0)
      expect(r.score).toBeLessThanOrEqual(15)
      expect(r.scoreRange).toEqual({ min: range[0], max: range[1] })
      expect(r.reasoning.length).toBeGreaterThan(0)
    }
  })

  it('a cap only ever lowers the profile, never raises it', () => {
    const order = [C, B, D]
    for (const a of all) {
      const r = assessProfile(a, saving(2000, 20))
      const byPoints = r.score <= 5 ? C : r.score <= 10 ? B : D
      expect(order.indexOf(r.recommendedProfile)).toBeLessThanOrEqual(order.indexOf(byPoints))
    }
  })
})
