import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createEncryptedTransactionSchema,
  updateTransactionSchema,
} from './transaction-validators.js'

// The server runs in UTC; the user in Spain is one or two hours ahead. Their "today" has to be
// accepted at any hour, and a date that is not yet today anywhere has to be refused.

const create = (date: string) => ({
  account_id: '11111111-1111-4111-8111-111111111111',
  date,
  description_encrypted: 'cipher',
  amount_encrypted: 'cipher',
  amount_sign: 'negative' as const,
})

afterEach(() => {
  vi.useRealTimers()
})

describe('the date of a transaction, checked on the server', () => {
  it("accepts a Spanish user's today just after midnight, while it is still yesterday in UTC", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-25T23:30:00Z')) // 00:30 on 26 November in Madrid

    expect(createEncryptedTransactionSchema.safeParse(create('2026-11-26')).success).toBe(true)
    expect(updateTransactionSchema.safeParse({ date: '2026-11-26' }).success).toBe(true)
  })

  it('also in summer, when Spain is two hours ahead', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-14T22:30:00Z')) // 00:30 on 15 July in Madrid

    expect(createEncryptedTransactionSchema.safeParse(create('2026-07-15')).success).toBe(true)
  })

  it('refuses a date that is not today anywhere yet', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-25T23:30:00Z'))

    const created = createEncryptedTransactionSchema.safeParse(create('2026-11-27'))
    expect(created.success).toBe(false)
    expect(updateTransactionSchema.safeParse({ date: '2026-11-27' }).success).toBe(false)
  })
})
