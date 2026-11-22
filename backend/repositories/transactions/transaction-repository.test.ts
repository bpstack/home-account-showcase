import { beforeEach, describe, expect, it, vi } from 'vitest'

// The database is replaced by a fake that answers by the kind of statement. MINE is the account
// of the transaction; the subcategory check only finds a row for the pair (OWN_SUB, MINE).
const MINE = 'account-mine'
const OWN_SUB = 'sub-own'
const FOREIGN_SUB = 'sub-foreign'

const mocks = vi.hoisted(() => ({
  db: { query: vi.fn() },
  account: { hasAccess: vi.fn(async () => true) },
}))
vi.mock('../../config/db.js', () => ({ default: mocks.db }))
vi.mock('../accounts/account-repository.js', () => ({ AccountRepository: mocks.account }))

import { TransactionRepository } from './transaction-repository.js'

const writes = () =>
  mocks.db.query.mock.calls
    .map(([sql]) => String(sql))
    .filter((sql) => /^\s*(INSERT|UPDATE)/i.test(sql))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.account.hasAccess.mockResolvedValue(true)
  mocks.db.query.mockImplementation(async (sql: string, params: unknown[] = []) => {
    if (/FROM subcategories/i.test(sql)) {
      const [subcategoryId, accountId] = params
      return [subcategoryId === OWN_SUB && accountId === MINE ? [{ 1: 1 }] : []]
    }
    if (/FROM transactions t/i.test(sql)) return [[{ id: 't1', account_id: MINE }]]
    if (/^\s*UPDATE/i.test(sql)) return [{ affectedRows: 3 }]
    return [[]]
  })
})

const encrypted = (subcategory_id?: string | null) => ({
  account_id: MINE,
  date: '2026-01-15',
  description_encrypted: 'cipher',
  amount_encrypted: 'cipher',
  amount_sign: 'negative' as const,
  subcategory_id,
})

describe('a subcategory of another account', () => {
  it('is refused when creating a transaction, and nothing is stored', async () => {
    await expect(
      TransactionRepository.createEncrypted('user-1', encrypted(FOREIGN_SUB))
    ).rejects.toMatchObject({ statusCode: 404 })
    expect(writes()).toHaveLength(0)
  })

  it('is refused when editing a transaction', async () => {
    await expect(
      TransactionRepository.update('t1', 'user-1', { subcategory_id: FOREIGN_SUB })
    ).rejects.toMatchObject({ statusCode: 404 })
    expect(writes()).toHaveLength(0)
  })

  it('is refused when editing an encrypted transaction', async () => {
    await expect(
      TransactionRepository.updateEncrypted('t1', 'user-1', {
        subcategory_id: FOREIGN_SUB,
        amount_encrypted: 'cipher',
        amount_sign: 'negative',
      })
    ).rejects.toMatchObject({ statusCode: 404 })
    expect(writes()).toHaveLength(0)
  })

  it('is refused in a bulk update by ids', async () => {
    await expect(
      TransactionRepository.bulkUpdateByIds(MINE, 'user-1', ['t1', 't2'], FOREIGN_SUB)
    ).rejects.toMatchObject({ statusCode: 404 })
    expect(writes()).toHaveLength(0)
  })

  it('is refused in a bulk update by description', async () => {
    await expect(
      TransactionRepository.bulkUpdateCategory(MINE, 'user-1', 'netflix', FOREIGN_SUB)
    ).rejects.toMatchObject({ statusCode: 404 })
    expect(writes()).toHaveLength(0)
  })
})

describe('a subcategory of the same account', () => {
  it('is accepted when creating a transaction', async () => {
    await expect(
      TransactionRepository.createEncrypted('user-1', encrypted(OWN_SUB))
    ).resolves.toMatchObject({ subcategory_id: OWN_SUB })
    expect(writes()).toHaveLength(1)
  })

  it('is accepted in a bulk update by ids', async () => {
    await expect(
      TransactionRepository.bulkUpdateByIds(MINE, 'user-1', ['t1', 't2'], OWN_SUB)
    ).resolves.toBe(3)
  })
})

describe('clearing the category', () => {
  it('is allowed with null and does not look the subcategory up', async () => {
    await TransactionRepository.bulkUpdateByIds(MINE, 'user-1', ['t1'], null)
    const lookups = mocks.db.query.mock.calls.filter(([sql]) => /FROM subcategories/i.test(sql))
    expect(lookups).toHaveLength(0)
    expect(writes()).toHaveLength(1)
  })

  it('is allowed when creating a transaction with no subcategory', async () => {
    await expect(
      TransactionRepository.createEncrypted('user-1', encrypted(null))
    ).resolves.toMatchObject({ subcategory_id: null })
  })
})
