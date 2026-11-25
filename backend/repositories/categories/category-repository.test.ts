import { beforeEach, describe, expect, it, vi } from 'vitest'

// The database is replaced by a fake that answers by the kind of statement. FOOD is the category
// being deleted, in account MINE. HOME_LIGHT is a subcategory of another category of MINE,
// FOOD_MARKET one of FOOD itself, and FOREIGN_SUB belongs to another account.
const MINE = 'account-mine'
const FOOD = 'cat-food'
const HOME = 'cat-home'
const HOME_LIGHT = 'sub-home-light'
const FOOD_MARKET = 'sub-food-market'
const FOREIGN_SUB = 'sub-foreign'

const mocks = vi.hoisted(() => ({
  db: { query: vi.fn() },
}))
vi.mock('../../config/db.js', () => ({ default: mocks.db }))
vi.mock('../accounts/account-repository.js', () => ({ AccountRepository: {} }))

import { CategoryRepository } from './category-repository.js'

const calls = () => mocks.db.query.mock.calls.map(([sql, params]) => ({ sql: String(sql), params }))
const updates = () => calls().filter(({ sql }) => /^\s*UPDATE/i.test(sql))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.db.query.mockImplementation(async (sql: string, params: unknown[] = []) => {
    // getById: the user is a member of FOOD's account only
    if (/FROM categories c\s+INNER JOIN account_users/i.test(sql)) {
      const [categoryId, userId] = params
      return [categoryId === FOOD && userId === 'user-1' ? [{ id: FOOD, account_id: MINE }] : []]
    }
    if (/FROM subcategories s/i.test(sql)) {
      const [subcategoryId, accountId] = params
      const own: Record<string, string> = { [HOME_LIGHT]: HOME, [FOOD_MARKET]: FOOD }
      const category = accountId === MINE ? own[String(subcategoryId)] : undefined
      return [category ? [{ category_id: category }] : []]
    }
    if (/COUNT\(\*\)/i.test(sql)) return [[{ count: 12 }]]
    if (/^\s*UPDATE/i.test(sql)) return [{ affectedRows: 12 }]
    return [[]]
  })
})

describe('counting the transactions of a category about to be deleted', () => {
  it('counts those whose subcategory belongs to it, within its own account', async () => {
    await expect(CategoryRepository.getOrphanedTransactionsCount(FOOD, 'user-1')).resolves.toBe(12)

    const count = calls().find(({ sql }) => /COUNT\(\*\)/i.test(sql))!
    // A transaction points at a subcategory, so the category is reached through subcategories
    expect(count.sql).toMatch(/subcategories/i)
    expect(count.params).toEqual([FOOD, MINE])
  })

  it('is 0 for a category the user cannot see, without counting anything', async () => {
    await expect(CategoryRepository.getOrphanedTransactionsCount(FOOD, 'user-2')).resolves.toBe(0)
    expect(calls().some(({ sql }) => /COUNT\(\*\)/i.test(sql))).toBe(false)
  })
})

describe('moving those transactions before deleting the category', () => {
  it('moves them to a subcategory of another category of the same account', async () => {
    await expect(CategoryRepository.reassignTransactions(FOOD, HOME_LIGHT, 'user-1')).resolves.toBe(
      12
    )
    expect(updates()).toHaveLength(1)
    expect(updates()[0].params).toEqual([HOME_LIGHT, FOOD, MINE])
  })

  it('refuses a subcategory of another account, and moves nothing', async () => {
    await expect(
      CategoryRepository.reassignTransactions(FOOD, FOREIGN_SUB, 'user-1')
    ).rejects.toMatchObject({ statusCode: 404 })
    expect(updates()).toHaveLength(0)
  })

  it('refuses a subcategory of the category being deleted, and moves nothing', async () => {
    await expect(
      CategoryRepository.reassignTransactions(FOOD, FOOD_MARKET, 'user-1')
    ).rejects.toMatchObject({ statusCode: 400 })
    expect(updates()).toHaveLength(0)
  })

  it('refuses a category the user cannot see, and moves nothing', async () => {
    await expect(
      CategoryRepository.reassignTransactions(FOOD, HOME_LIGHT, 'user-2')
    ).rejects.toMatchObject({ statusCode: 404 })
    expect(updates()).toHaveLength(0)
  })
})
