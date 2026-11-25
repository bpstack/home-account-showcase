import type { NextFunction, Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  invitation: { getByAccountId: vi.fn(), getByToken: vi.fn() },
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

// GET /invitations/:token is public: whoever holds the link gets this answer
function byToken(): Promise<{ status: number; body: any }> {
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
    InvitationController.getByToken(
      { params: { token: 'secret-token' } } as unknown as Request,
      res as unknown as Response,
      ((error: unknown) => resolve({ status: 500, body: error })) as NextFunction
    )
  })
}

const HOUR = 60 * 60 * 1000
const inFuture = () => new Date(Date.now() + HOUR).toISOString()
const inPast = () => new Date(Date.now() - HOUR).toISOString()

function invitation(overrides: Record<string, unknown>) {
  return {
    ...row,
    account_name: 'Casa',
    invited_by_name: 'Owner',
    invited_by_email: 'owner@example.com',
    invited_user_id: null,
    invitee_is_member: 0,
    invitee_has_key: 0,
    expires_at: inFuture(),
    ...overrides,
  }
}

describe('InvitationController.getByToken and the ledger key', () => {
  it('gives the key while the invitation is pending and in time', async () => {
    mocks.invitation.getByToken.mockResolvedValue(invitation({ status: 'pending' }))
    const out = await byToken()
    expect(out.body.invitation.encrypted_key).toBe('secret-key')
  })

  it('keeps it once the invitation is past its date, even if still marked pending', async () => {
    mocks.invitation.getByToken.mockResolvedValue(
      invitation({ status: 'pending', expires_at: inPast() })
    )
    const out = await byToken()
    expect(out.body.isExpired).toBe(true)
    expect(out.body.invitation.encrypted_key).toBeNull()
  })

  it('keeps it once the invitation is marked expired', async () => {
    mocks.invitation.getByToken.mockResolvedValue(invitation({ status: 'expired' }))
    const out = await byToken()
    expect(out.body.invitation.encrypted_key).toBeNull()
  })

  it('keeps it once the owner revoked the invitation', async () => {
    mocks.invitation.getByToken.mockResolvedValue(invitation({ status: 'revoked' }))
    const out = await byToken()
    expect(out.body.invitation.encrypted_key).toBeNull()
  })

  it('keeps it once the new member saved their own copy', async () => {
    mocks.invitation.getByToken.mockResolvedValue(
      invitation({
        status: 'accepted',
        invited_user_id: 'guest-1',
        invitee_is_member: 1,
        invitee_has_key: 1,
      })
    )
    const out = await byToken()
    expect(out.body.invitation.encrypted_key).toBeNull()
  })

  it('gives it to finish an acceptance whose copy was never saved', async () => {
    mocks.invitation.getByToken.mockResolvedValue(
      invitation({
        status: 'accepted',
        invited_user_id: 'guest-1',
        invitee_is_member: 1,
        invitee_has_key: 0,
      })
    )
    const out = await byToken()
    expect(out.body.invitation.encrypted_key).toBe('secret-key')
  })

  it('keeps it once the member was removed or left', async () => {
    mocks.invitation.getByToken.mockResolvedValue(
      invitation({
        status: 'accepted',
        invited_user_id: 'guest-1',
        invitee_is_member: 0,
        invitee_has_key: 0,
      })
    )
    const out = await byToken()
    expect(out.body.invitation.encrypted_key).toBeNull()
  })

  it('never puts the membership flags in the public answer', async () => {
    mocks.invitation.getByToken.mockResolvedValue(invitation({ status: 'pending' }))
    const out = await byToken()
    expect(out.body.invitation).not.toHaveProperty('invitee_is_member')
    expect(out.body.invitation).not.toHaveProperty('invitee_has_key')
  })
})
