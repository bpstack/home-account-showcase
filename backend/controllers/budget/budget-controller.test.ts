import type { NextFunction, Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Repositories are replaced so no database is touched. The user owns MINE and nothing else:
// hasAccess answers true only for that pair, whatever the client claims in the request.
const MINE = '11111111-1111-4111-8111-111111111111'
const THEIRS = '22222222-2222-4222-8222-222222222222'
const MY_CATEGORY = '33333333-3333-4333-8333-333333333333'
const THEIR_CATEGORY = '44444444-4444-4444-8444-444444444444'

const mocks = vi.hoisted(() => ({
  budget: {
    getByAccountId: vi.fn(async () => [{ id: 'b-list' }]),
    getById: vi.fn(),
    create: vi.fn(async () => ({ id: 'b-new' })),
    update: vi.fn(async () => ({ id: 'b1' })),
    delete: vi.fn(async () => undefined),
  },
  account: { hasAccess: vi.fn() },
  category: { getById: vi.fn() },
}))
vi.mock('../../repositories/budget/budget-repository.js', () => ({
  BudgetRepository: mocks.budget,
}))
vi.mock('../../repositories/accounts/account-repository.js', () => ({
  AccountRepository: mocks.account,
}))
vi.mock('../../repositories/categories/category-repository.js', () => ({
  CategoryRepository: mocks.category,
}))

import {
  createBudget,
  deleteBudget,
  getBudget,
  getBudgets,
  updateBudget,
} from './budget-controller.js'

type Outcome = { status?: number; error?: { statusCode?: number; message: string } }
type Handler = (req: Request, res: Response, next: NextFunction) => void

function run(
  handler: Handler,
  parts: { body?: object; params?: object; query?: object } = {}
): Promise<Outcome> {
  return new Promise((resolve) => {
    let code: number | undefined
    const res = {
      status(c: number) {
        code = c
        return this
      },
      json() {
        resolve({ status: code })
        return this
      },
    }
    const req = { body: {}, params: {}, query: {}, ...parts, user: { id: 'user-1' } }
    handler(req as unknown as Request, res as unknown as Response, (error?: unknown) =>
      resolve({ error: error as Outcome['error'] })
    )
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.account.hasAccess.mockImplementation(
    async (accountId: string, userId: string) => accountId === MINE && userId === 'user-1'
  )
  mocks.category.getById.mockImplementation(async (categoryId: string) => {
    if (categoryId === MY_CATEGORY) return { id: categoryId, account_id: MINE }
    if (categoryId === THEIR_CATEGORY) return { id: categoryId, account_id: THEIRS }
    return null
  })
  mocks.budget.getById.mockImplementation(async (id: string) =>
    id === 'mine' ? { id, account_id: MINE } : id === 'theirs' ? { id, account_id: THEIRS } : null
  )
})

describe('getBudgets', () => {
  it('refuses the budgets of an account the user does not belong to', async () => {
    const out = await run(getBudgets, { query: { account_id: THEIRS } })
    expect(out.error?.statusCode).toBe(403)
    expect(mocks.budget.getByAccountId).not.toHaveBeenCalled()
  })

  it('lists the budgets of the own account', async () => {
    const out = await run(getBudgets, { query: { account_id: MINE } })
    expect(out.status).toBe(200)
    expect(mocks.budget.getByAccountId).toHaveBeenCalledWith(MINE)
  })
})

describe('getBudget', () => {
  it('answers not found for a budget of another account, even if the client names its own', async () => {
    const out = await run(getBudget, { params: { id: 'theirs' }, query: { account_id: MINE } })
    expect(out.error?.statusCode).toBe(404)
  })

  it('answers not found when the client names the account of the budget itself', async () => {
    const out = await run(getBudget, { params: { id: 'theirs' }, query: { account_id: THEIRS } })
    expect(out.error?.statusCode).toBe(404)
  })

  it('answers the same for a budget that does not exist, so ids reveal nothing', async () => {
    const out = await run(getBudget, { params: { id: 'missing' } })
    expect(out.error?.statusCode).toBe(404)
  })

  it('returns an own budget', async () => {
    const out = await run(getBudget, { params: { id: 'mine' } })
    expect(out.status).toBe(200)
  })
})

describe('createBudget', () => {
  const body = (account_id: string, category_id: string) => ({
    account_id,
    category_id,
    amount: 100,
    period: 'monthly',
  })

  it('refuses to create in an account the user does not belong to', async () => {
    const out = await run(createBudget, { body: body(THEIRS, THEIR_CATEGORY) })
    expect(out.error?.statusCode).toBe(403)
    expect(mocks.budget.create).not.toHaveBeenCalled()
  })

  it('refuses a category that belongs to another account', async () => {
    const out = await run(createBudget, { body: body(MINE, THEIR_CATEGORY) })
    expect(out.error?.statusCode).toBe(404)
    expect(mocks.budget.create).not.toHaveBeenCalled()
  })

  it('creates a budget for an own category', async () => {
    const out = await run(createBudget, { body: body(MINE, MY_CATEGORY) })
    expect(out.status).toBe(201)
    expect(mocks.budget.create).toHaveBeenCalledOnce()
  })
})

describe('updateBudget', () => {
  it('does not change a budget of another account, even if the body names the own one', async () => {
    const out = await run(updateBudget, {
      params: { id: 'theirs' },
      body: { account_id: MINE, amount: 1 },
    })
    expect(out.error?.statusCode).toBe(404)
    expect(mocks.budget.update).not.toHaveBeenCalled()
  })

  it('does not change a budget of another account when the body names that account', async () => {
    const out = await run(updateBudget, {
      params: { id: 'theirs' },
      body: { account_id: THEIRS, amount: 1 },
    })
    expect(out.error?.statusCode).toBe(404)
    expect(mocks.budget.update).not.toHaveBeenCalled()
  })

  it('changes an own budget', async () => {
    const out = await run(updateBudget, {
      params: { id: 'mine' },
      body: { account_id: MINE, amount: 50 },
    })
    expect(out.status).toBe(200)
    expect(mocks.budget.update).toHaveBeenCalledWith('mine', {
      amount: 50,
      period: undefined,
      alert_threshold: undefined,
    })
  })
})

describe('deleteBudget', () => {
  it('does not delete a budget of another account, even if the body names the own one', async () => {
    const out = await run(deleteBudget, { params: { id: 'theirs' }, body: { account_id: MINE } })
    expect(out.error?.statusCode).toBe(404)
    expect(mocks.budget.delete).not.toHaveBeenCalled()
  })

  it('does not delete a budget of another account when the body names that account', async () => {
    const out = await run(deleteBudget, { params: { id: 'theirs' }, body: { account_id: THEIRS } })
    expect(out.error?.statusCode).toBe(404)
    expect(mocks.budget.delete).not.toHaveBeenCalled()
  })

  it('deletes an own budget', async () => {
    const out = await run(deleteBudget, { params: { id: 'mine' }, body: { account_id: MINE } })
    expect(out.status).toBe(200)
    expect(mocks.budget.delete).toHaveBeenCalledWith('mine')
  })
})
