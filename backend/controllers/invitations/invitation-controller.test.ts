import type { NextFunction, Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  invitation: { getByAccountId: vi.fn() },
  account: { getUserRole: vi.fn(), hasAccess: vi.fn() },
}))
vi.mock('../../repositories/invitations/invitation-repository.js', () => ({
  InvitationRepository: mocks.invitation,
}))
vi.mock('../../repositories/accounts/account-repository.js', () => ({
  AccountRepository: mocks.account,
}))

import { InvitationController } from './invitation-controller.js'

const row = {
  id: 'i1',
  account_id: 'a1',
  email: 'guest@example.com',
  status: 'pending',
  token: 'secret-token',
  encrypted_key: 'secret-key',
  expires_at: '2026-12-31',
  created_at: '2026-11-01',
}

function list(): Promise<{ status: number; body: any }> {
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
    const req = { params: { id: 'a1' }, user: { id: 'user-1' } }
    InvitationController.list(
      req as unknown as Request,
      res as unknown as Response,
      ((error: unknown) => resolve({ status: 500, body: error })) as NextFunction
    )
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.invitation.getByAccountId.mockResolvedValue([row])
})

describe('InvitationController.list', () => {
  it('refuses a user who is not in the account', async () => {
    mocks.account.getUserRole.mockResolvedValue(null)
    const out = await list()
    expect(out.status).toBe(403)
    expect(mocks.invitation.getByAccountId).not.toHaveBeenCalled()
  })

  it('gives the owner the token and the key, which the settings panel needs', async () => {
    mocks.account.getUserRole.mockResolvedValue('owner')
    const out = await list()
    expect(out.status).toBe(200)
    expect(out.body.invitations[0].token).toBe('secret-token')
    expect(out.body.invitations[0].encrypted_key).toBe('secret-key')
  })

  it('hides the token and the key from a member, but keeps the rest', async () => {
    mocks.account.getUserRole.mockResolvedValue('member')
    const out = await list()
    expect(out.status).toBe(200)
    const [item] = out.body.invitations
    expect(item).not.toHaveProperty('token')
    expect(item).not.toHaveProperty('encrypted_key')
    expect(item).toMatchObject({ id: 'i1', email: 'guest@example.com', status: 'pending' })
    expect(JSON.stringify(out.body)).not.toMatch(/secret-token|secret-key/)
  })
})
