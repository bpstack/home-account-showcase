import { createHash } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  sessions: {
    create: vi.fn(),
    rotate: vi.fn(),
    revoke: vi.fn(),
    revokeAllForUser: vi.fn(),
  },
}))

vi.mock('../../config/config.js', () => ({
  SALT_ROUNDS: 4,
  SECRET_JWT_KEY: 'test-secret',
  PIN_SERVER_KEY: Buffer.alloc(32, 1),
}))
vi.mock('../../config/db.js', () => ({ default: { query: vi.fn(), getConnection: vi.fn() } }))
vi.mock('../../repositories/auth/session-repository.js', () => ({
  SessionRepository: mocks.sessions,
}))
vi.mock('../../services/email/email-service.js', () => ({ sendPasswordResetEmail: vi.fn() }))
vi.mock('./email-verification-controller.js', () => ({ sendVerificationTokenEmail: vi.fn() }))

import { generateAccessToken, generateRefreshToken } from '../../services/auth/tokenService.js'
import { logout, refresh } from './auth-controller.js'

const USER = { id: 'user-a', email: 'a@example.com' }
const SID = 'sid-1'
const sha256 = (value: string) => createHash('sha256').update(value).digest()

type Outcome = {
  status: number
  body: any
  cookies: Record<string, string>
  cleared: string[]
}

function run(handler: (req: Request, res: Response, next: NextFunction) => void, cookies = {}) {
  return new Promise<Outcome>((resolve, reject) => {
    const out: Outcome = { status: 200, body: undefined, cookies: {}, cleared: [] }
    const res = {
      locals: {},
      status(code: number) {
        out.status = code
        return this
      },
      json(body: unknown) {
        out.body = body
        resolve(out)
        return this
      },
      cookie(name: string, value: string) {
        out.cookies[name] = value
        return this
      },
      clearCookie(name: string) {
        out.cleared.push(name)
        return this
      },
    }
    handler({ cookies, body: {} } as unknown as Request, res as unknown as Response, reject)
  })
}

const in8h = () => new Date(Date.now() + 8 * 60 * 60 * 1000)

beforeEach(() => vi.clearAllMocks())

// Requirements (docs/session-plan.md): the refresh token rotates on every use; a replaced one
// presented within 60 s gets an access token but no new refresh token; outside that window it
// ends the session; logout ends the session of the refresh token, even an expired one.
describe('refresh', () => {
  it('rotates: a new refresh token, different from the presented one, for the same session', async () => {
    const presented = await generateRefreshToken(USER, SID, 'jti-old', in8h())
    mocks.sessions.rotate.mockResolvedValue({
      status: 'rotated',
      userId: USER.id,
      expiresAt: in8h(),
    })

    const out = await run(refresh, { refreshToken: presented })

    expect(out.status).toBe(200)
    expect(out.cookies.accessToken).toBeTruthy()
    expect(out.cookies.refreshToken).toBeTruthy()
    expect(out.cookies.refreshToken).not.toBe(presented)
    expect(mocks.sessions.rotate).toHaveBeenCalledWith(
      SID,
      sha256('jti-old'),
      expect.any(Buffer),
      60
    )
  })

  it('within the grace window: an access token, no new refresh token, nothing revoked', async () => {
    const presented = await generateRefreshToken(USER, SID, 'jti-old', in8h())
    mocks.sessions.rotate.mockResolvedValue({ status: 'grace', userId: USER.id, expiresAt: in8h() })

    const out = await run(refresh, { refreshToken: presented })

    expect(out.status).toBe(200)
    expect(out.cookies.accessToken).toBeTruthy()
    expect(out.cookies).not.toHaveProperty('refreshToken')
    expect(mocks.sessions.revoke).not.toHaveBeenCalled()
  })

  it('a reused or invalid refresh token gets 401 and the cookies cleared', async () => {
    const presented = await generateRefreshToken(USER, SID, 'jti-old', in8h())
    for (const outcome of [{ status: 'reuse', userId: USER.id }, { status: 'invalid' }]) {
      mocks.sessions.rotate.mockResolvedValue(outcome)
      const out = await run(refresh, { refreshToken: presented })
      expect(out.status).toBe(401)
      expect(out.cookies).not.toHaveProperty('accessToken')
      expect(out.cleared).toEqual(expect.arrayContaining(['accessToken', 'refreshToken']))
    }
  })

  it('an access token cannot be used to refresh', async () => {
    const access = await generateAccessToken(USER, SID)
    const out = await run(refresh, { refreshToken: access })
    expect(out.status).toBe(401)
    expect(mocks.sessions.rotate).not.toHaveBeenCalled()
  })
})

describe('logout', () => {
  it('ends the session of the refresh token, without needing an access token', async () => {
    const token = await generateRefreshToken(USER, SID, 'jti-1', in8h())
    const out = await run(logout, { refreshToken: token })
    expect(out.status).toBe(200)
    expect(mocks.sessions.revoke).toHaveBeenCalledWith(SID)
    expect(out.cleared).toEqual(
      expect.arrayContaining(['accessToken', 'refreshToken', 'csrfToken'])
    )
  })

  it('ends the session of an expired refresh token too', async () => {
    const token = await generateRefreshToken(USER, SID, 'jti-1', new Date(Date.now() - 1000))
    await run(logout, { refreshToken: token })
    expect(mocks.sessions.revoke).toHaveBeenCalledWith(SID)
  })

  it('always succeeds and clears the cookies, revoking nothing without a valid refresh token', async () => {
    for (const cookies of [{}, { refreshToken: 'not-a-token' }]) {
      const out = await run(logout, cookies)
      expect(out.status).toBe(200)
      expect(out.cleared).toEqual(expect.arrayContaining(['accessToken', 'refreshToken']))
    }
    expect(mocks.sessions.revoke).not.toHaveBeenCalled()
  })
})
