import type { NextFunction, Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The repository is replaced so no database is touched; `create` stands for any way of storing
// a transaction in the clear.
const repo = vi.hoisted(() => ({
  create: vi.fn(async () => ({ id: 'plain' })),
  createEncrypted: vi.fn(async () => ({ id: 'enc' })),
  update: vi.fn(async () => ({ id: 't1' })),
  updateEncrypted: vi.fn(async () => ({ id: 't1' })),
}))
vi.mock('../../repositories/transactions/transaction-repository.js', () => ({
  TransactionRepository: repo,
}))

import { createTransaction, updateTransaction } from './transaction-controller.js'

type Outcome = { status?: number; error?: { statusCode?: number; message: string } }
type Handler = (req: Request, res: Response, next: NextFunction) => void

function run(handler: Handler, body: object, params: object = {}): Promise<Outcome> {
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
    const req = { body, params, user: { id: 'user-1' } }
    handler(req as unknown as Request, res as unknown as Response, (error?: unknown) =>
      resolve({ error: error as Outcome['error'] })
    )
  })
}

const ACCOUNT = '11111111-1111-4111-8111-111111111111'
const SUBCATEGORY = '22222222-2222-4222-8222-222222222222'
const encrypted = {
  account_id: ACCOUNT,
  date: '2026-01-15',
  description_encrypted: 'cipher-description',
  amount_encrypted: 'cipher-amount',
  amount_sign: 'negative',
}

beforeEach(() => vi.clearAllMocks())

describe('createTransaction', () => {
  it('refuses a transaction sent in the clear and stores nothing', async () => {
    const out = await run(createTransaction, {
      account_id: ACCOUNT,
      date: '2026-01-15',
      description: 'Supermarket',
      amount: 42.5,
    })
    expect(out.error?.statusCode).toBe(400)
    expect(out.error?.message).toMatch(/cifrados/)
    expect(repo.create).not.toHaveBeenCalled()
    expect(repo.createEncrypted).not.toHaveBeenCalled()
  })

  it('refuses an encrypted transaction that also carries a field in the clear', async () => {
    const out = await run(createTransaction, { ...encrypted, description: 'Supermarket' })
    expect(out.error?.statusCode).toBe(400)
    expect(repo.createEncrypted).not.toHaveBeenCalled()
  })

  it('stores an encrypted transaction', async () => {
    const out = await run(createTransaction, encrypted)
    expect(out.status).toBe(201)
    expect(repo.createEncrypted).toHaveBeenCalledOnce()
  })
})

describe('updateTransaction', () => {
  it('refuses a description or an amount sent in the clear', async () => {
    const out = await run(
      updateTransaction,
      { description: 'Supermarket', amount: 42.5, date: '2026-01-15' },
      { id: 't1' }
    )
    expect(out.error?.statusCode).toBe(400)
    expect(repo.update).not.toHaveBeenCalled()
    expect(repo.updateEncrypted).not.toHaveBeenCalled()
  })

  it('still lets the date and the category change without encryption', async () => {
    const out = await run(
      updateTransaction,
      { date: '2026-01-16', subcategory_id: SUBCATEGORY },
      { id: 't1' }
    )
    expect(out.status).toBe(200)
    expect(repo.update).toHaveBeenCalledWith('t1', 'user-1', {
      date: '2026-01-16',
      subcategory_id: SUBCATEGORY,
    })
  })

  it('updates an encrypted transaction', async () => {
    const out = await run(
      updateTransaction,
      { description_encrypted: 'cipher', amount_encrypted: 'cipher', amount_sign: 'positive' },
      { id: 't1' }
    )
    expect(out.status).toBe(200)
    expect(repo.updateEncrypted).toHaveBeenCalledOnce()
  })
})
