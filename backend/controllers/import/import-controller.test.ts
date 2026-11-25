import type { NextFunction, Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  hasAccess: vi.fn(),
  logError: vi.fn(),
}))
vi.mock('../../config/db.js', () => ({ default: { query: mocks.query } }))
vi.mock('../../repositories/accounts/account-repository.js', () => ({
  AccountRepository: { hasAccess: mocks.hasAccess },
}))
vi.mock('../../repositories/categories/category-repository.js', () => ({
  CategoryRepository: {},
}))
vi.mock('../../utils/logger.js', () => ({
  logger: { error: mocks.logError, info: vi.fn(), warn: vi.fn() },
}))

import { confirmImport } from './import-controller.js'

const DB_MESSAGE = "Unknown column 'secret_col' in 'field list' of table `transactions`"

function movement(n: number) {
  return {
    date: '2026-11-01',
    description_encrypted: 'ZGVzYw==',
    amount_encrypted: 'YW1vdW50',
    amount_sign: 'negative',
    bank_category_encrypted: null,
    bank_subcategory_encrypted: null,
    import_hash: n.toString(16).padStart(64, '0'),
    subcategory_id: null,
  }
}

function confirm(count: number): Promise<{ status: number; body: any }> {
  return new Promise((resolve) => {
    let code = 200
    const res = {
      status(c: number) {
        code = c
        return this
      },
      json(body: unknown) {
        resolve({ status: code, body })
        return this
      },
    }
    const req = {
      user: { id: 'user-1' },
      body: {
        account_id: '11111111-1111-4111-8111-111111111111',
        transactions: Array.from({ length: count }, (_, i) => movement(i + 1)),
        category_mappings: [],
      },
    }
    confirmImport(
      req as unknown as Request,
      res as unknown as Response,
      ((error: unknown) => resolve({ status: 500, body: error })) as NextFunction
    )
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.hasAccess.mockResolvedValue(true)
})

describe('confirmImport when a batch fails to save', () => {
  it('keeps the database message out of the answer and in the log', async () => {
    mocks.query
      .mockResolvedValueOnce([[]]) // hashes already imported: none
      .mockRejectedValueOnce(new Error(DB_MESSAGE)) // the INSERT
    const out = await confirm(3)

    expect(out.status).toBe(200)
    expect(JSON.stringify(out.body)).not.toContain('secret_col')
    expect(out.body.data.errors).toHaveLength(1)
    expect(out.body.data.errors[0]).toContain('3')
    expect(mocks.logError).toHaveBeenCalledTimes(1)
    expect(String(mocks.logError.mock.calls[0][3])).toContain('secret_col')
  })

  it('does not count the rows that failed as already imported', async () => {
    mocks.query.mockResolvedValueOnce([[]]).mockRejectedValueOnce(new Error(DB_MESSAGE))
    const out = await confirm(3)

    expect(out.body.data).toMatchObject({ total: 3, inserted: 0, skipped: 0 })
  })

  it('still counts as skipped the rows that were there before', async () => {
    mocks.query
      .mockResolvedValueOnce([[{ import_hash: movement(1).import_hash }]])
      .mockResolvedValueOnce([{ affectedRows: 2 }])
    const out = await confirm(3)

    expect(out.body.data).toMatchObject({ total: 3, inserted: 2, skipped: 1, errors: [] })
  })
})
