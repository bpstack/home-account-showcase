import { afterEach, describe, expect, it, vi } from 'vitest'

// The transaction form proposes today's date on the user's clock (Spain, set in vitest.config.ts)
// and must accept it at any hour. The validator lives in validators/, which vitest does not
// collect, so it is tested from here.

const valid = (date: string) => ({
  type: 'expense' as const,
  date,
  description: 'Prueba',
  amount: '1',
  category_id: 'cat-1',
  subcategory_id: '',
})

async function loadValidator() {
  vi.resetModules()
  return import('@/validators/transaction-validators')
}

afterEach(() => {
  vi.useRealTimers()
})

describe('the date of a new transaction', () => {
  it('accepts today just after midnight in Spain, while it is still yesterday in UTC', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-25T23:30:00Z')) // 00:30 on 26 November in Madrid
    const { validateTransaction } = await loadValidator()

    expect(validateTransaction(valid('2026-11-26')).success).toBe(true)
  })

  it('accepts the new day when the page was opened the day before', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-25T10:00:00Z'))
    const { validateTransaction } = await loadValidator()

    vi.setSystemTime(new Date('2026-11-26T10:00:00Z'))
    expect(validateTransaction(valid('2026-11-26')).success).toBe(true)
  })

  it('still refuses a date after today', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-25T23:30:00Z'))
    const { validateTransaction } = await loadValidator()

    const result = validateTransaction(valid('2026-11-27'))
    expect(result.success).toBe(false)
    expect(result.success ? undefined : result.errors.date).toBe('La fecha no puede ser futura')
  })
})
