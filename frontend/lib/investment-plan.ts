// The monthly plan by fixed rules: each profile splits the amount like a model portfolio, into a
// fixed list of UCITS ETFs. Computed in the browser, so the amount never leaves it. ISINs checked
// on justETF on 2026-11-19; whether a broker offers them in Spain is for the user to check.

export type RiskProfile = 'conservative' | 'balanced' | 'dynamic'
export type AssetClass = 'stocks' | 'bonds' | 'cash'

export interface PlanItem {
  id: string
  name: string
  /** ISIN, or null for cash */
  isin: string | null
  assetClass: AssetClass
  risk: 'low' | 'medium' | 'high'
  reason: string
  percentage: number
  amount: number
}

export interface MonthlyPlan {
  total: number
  allocation: Record<AssetClass, number>
  items: PlanItem[]
}

type Product = Omit<PlanItem, 'percentage' | 'amount'>

const WORLD: Product = {
  id: 'world',
  name: 'iShares Core MSCI World UCITS ETF (Acc)',
  isin: 'IE00B4L5Y983',
  assetClass: 'stocks',
  risk: 'medium',
  reason: 'Acciones de unas 1.400 empresas de 23 países desarrollados; reinvierte los dividendos',
}
const EMERGING: Product = {
  id: 'emerging',
  name: 'iShares Core MSCI Emerging Markets IMI UCITS ETF (Acc)',
  isin: 'IE00BKM4GZ66',
  assetClass: 'stocks',
  risk: 'high',
  reason: 'Acciones de países emergentes: más crecimiento esperado y más oscilaciones',
}
const BONDS: Product = {
  id: 'bonds',
  name: 'iShares Core Global Aggregate Bond UCITS ETF EUR Hedged (Acc)',
  isin: 'IE00BDBRDM35',
  assetClass: 'bonds',
  risk: 'low',
  reason:
    'Bonos de gobiernos y empresas de todo el mundo, cubiertos a euros: amortiguan las caídas',
}
const CASH: Product = {
  id: 'cash',
  name: 'Cuenta remunerada o fondo monetario',
  isin: null,
  assetClass: 'cash',
  risk: 'low',
  reason: 'Dinero disponible para aprovechar caídas o cubrir un imprevisto',
}

/** Percent of the monthly amount in each product, by profile. Each row adds up to 100. */
const MODEL: Record<RiskProfile, Array<[Product, number]>> = {
  conservative: [
    [WORLD, 25],
    [BONDS, 65],
    [CASH, 10],
  ],
  balanced: [
    [WORLD, 55],
    [BONDS, 40],
    [CASH, 5],
  ],
  dynamic: [
    [WORLD, 70],
    [EMERGING, 15],
    [BONDS, 15],
  ],
}

const cents = (n: number) => Math.round(n * 100) / 100

export function buildMonthlyPlan(profile: RiskProfile, monthlyAmount: number): MonthlyPlan {
  const total = cents(Math.max(0, monthlyAmount))
  const items: PlanItem[] = MODEL[profile].map(([product, percentage]) => ({
    ...product,
    percentage,
    amount: cents((total * percentage) / 100),
  }))
  // Rounding to cents can leave a cent over or under: the largest item absorbs it.
  const gap = cents(total - items.reduce((sum, item) => sum + item.amount, 0))
  if (gap !== 0) {
    const largest = items.reduce((a, b) => (b.percentage > a.percentage ? b : a))
    largest.amount = cents(largest.amount + gap)
  }

  const allocation: Record<AssetClass, number> = { stocks: 0, bonds: 0, cash: 0 }
  for (const item of items) allocation[item.assetClass] += item.percentage

  return { total, allocation, items }
}

/** Share of the monthly savings to invest, [while the fund is being completed, once complete]. */
const SHARE: Record<RiskProfile, [number, number]> = {
  conservative: [5, 10],
  balanced: [15, 25],
  dynamic: [30, 40],
}

/** Months of expenses the emergency fund must hold before anything is invested */
export const MIN_FUND_MONTHS = 3

export interface FundStatus {
  /** What the user has put aside */
  saved: number
  /** Months of expenses the user wants covered */
  goalMonths: number
  /** Average monthly expenses */
  monthlyExpenses: number
}

/**
 * How much of the monthly savings to invest, in per cent, from the emergency fund as it stands
 * (ADR-016): nothing below 3 months of expenses (or the goal, if smaller), the low share until the
 * goal is met, the profile's usual share after. Without expenses on record the fund cannot be
 * measured, and there are no savings to split either: the usual share.
 */
export function investmentShare(profile: RiskProfile, fund: FundStatus): number {
  const [low, usual] = SHARE[profile]
  if (fund.monthlyExpenses <= 0) return usual
  const monthsCovered = fund.saved / fund.monthlyExpenses
  if (monthsCovered < Math.min(MIN_FUND_MONTHS, fund.goalMonths)) return 0
  if (monthsCovered < fund.goalMonths) return low
  return usual
}
