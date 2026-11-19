// Expected splits are the model portfolios agreed with the owner (2026-11-19): conservative
// 25 / 65 / 10, balanced 55 / 40 / 5, dynamic 85 / 15 / 0 (stocks / bonds / cash), no crypto.
import { describe, expect, it } from 'vitest'
import { buildMonthlyPlan, type RiskProfile } from './investment-plan'

const PROFILES: RiskProfile[] = ['conservative', 'balanced', 'dynamic']

describe('buildMonthlyPlan', () => {
  it.each([
    ['conservative', { stocks: 25, bonds: 65, cash: 10 }],
    ['balanced', { stocks: 55, bonds: 40, cash: 5 }],
    ['dynamic', { stocks: 85, bonds: 15, cash: 0 }],
  ] as const)('%s splits like its model portfolio', (profile, allocation) => {
    expect(buildMonthlyPlan(profile, 100).allocation).toEqual(allocation)
  })

  it('a balanced 200 € month goes 110 / 80 / 10 €', () => {
    const plan = buildMonthlyPlan('balanced', 200)
    expect(plan.items.map((i) => [i.assetClass, i.amount])).toEqual([
      ['stocks', 110],
      ['bonds', 80],
      ['cash', 10],
    ])
  })

  it.each(PROFILES)('%s: amounts add up to the total, to the cent, for awkward totals', (p) => {
    for (const total of [0.01, 18.73, 33.33, 99.99, 1234.57]) {
      const plan = buildMonthlyPlan(p, total)
      const sum = plan.items.reduce((s, i) => s + Math.round(i.amount * 100), 0)
      expect(sum).toBe(Math.round(total * 100))
      expect(plan.items.reduce((s, i) => s + i.percentage, 0)).toBe(100)
    }
  })

  it('no crypto in any profile, and every fund has an ISIN', () => {
    for (const p of PROFILES) {
      for (const item of buildMonthlyPlan(p, 100).items) {
        expect(item.name.toLowerCase()).not.toMatch(/bitcoin|crypto|cripto/)
        if (item.assetClass !== 'cash') expect(item.isin).toMatch(/^IE[0-9A-Z]{10}$/)
      }
    }
  })

  it('more risk, more stocks', () => {
    const stocks = PROFILES.map((p) => buildMonthlyPlan(p, 100).allocation.stocks)
    expect(stocks[0]).toBeLessThan(stocks[1])
    expect(stocks[1]).toBeLessThan(stocks[2])
  })

  it('a negative or zero amount gives a plan of zeros, not negative amounts', () => {
    const plan = buildMonthlyPlan('dynamic', -50)
    expect(plan.total).toBe(0)
    expect(plan.items.every((i) => i.amount === 0)).toBe(true)
  })
})
