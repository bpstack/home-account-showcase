import type { NextFunction, Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { OAuthProfile } from '../../config/oauth.js'

const mocks = vi.hoisted(() => ({
  repo: {
    getByOAuth: vi.fn(),
    getByEmailForOAuth: vi.fn(),
    hasLocalPassword: vi.fn(),
    linkOAuth: vi.fn(),
    createOAuth: vi.fn(),
  },
  keys: { userHasKeys: vi.fn() },
  sessions: { create: vi.fn(), rotate: vi.fn(), revoke: vi.fn(), revokeAllForUser: vi.fn() },
}))

vi.mock('../../repositories/auth/user-repository.js', () => ({ UserRepository: mocks.repo }))
vi.mock('../../repositories/crypto/account-key-repository.js', () => ({
  AccountKeyRepository: mocks.keys,
}))
vi.mock('../../config/config.js', () => ({ SECRET_JWT_KEY: 'test-secret' }))
vi.mock('../../repositories/auth/session-repository.js', () => ({
  SessionRepository: mocks.sessions,
}))

import { exchangeOAuthCode, oauthCallback } from './oauth-controller.js'
import { generateOAuthCode, generateRefreshToken } from '../../services/auth/tokenService.js'

function run(profile: OAuthProfile): Promise<string> {
  return new Promise((resolve, reject) => {
    const res = { redirect: (url: string) => resolve(url) }
    const next: NextFunction = (error?: unknown) => reject(error)
    oauthCallback({ user: profile } as unknown as Request, res as unknown as Response, next)
  })
}

const profile = (emailVerified: boolean): OAuthProfile => ({
  provider: 'github',
  id: 'gh-1',
  email: 'victim@example.com',
  emailVerified,
  name: 'Someone',
})

const existingUser = { id: 'user-victim', email: 'victim@example.com', key_salt: 'salt' }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.repo.getByOAuth.mockResolvedValue(null)
  mocks.repo.getByEmailForOAuth.mockResolvedValue(existingUser)
  mocks.repo.hasLocalPassword.mockResolvedValue(true)
  mocks.keys.userHasKeys.mockResolvedValue(true)
  mocks.sessions.create.mockResolvedValue('sid-1')
})

// Requirement: an unverified OAuth email never links to, nor creates, an account.
describe('oauthCallback', () => {
  it('does not link an unverified email to the account that has it', async () => {
    const url = await run(profile(false))

    expect(url).toContain('/login?error=oauth_email_unverified')
    expect(url).not.toContain('accessToken')
    expect(mocks.repo.linkOAuth).not.toHaveBeenCalled()
    expect(mocks.repo.createOAuth).not.toHaveBeenCalled()
  })

  it('does not create an account for an unverified email either', async () => {
    mocks.repo.getByEmailForOAuth.mockResolvedValue(null)

    const url = await run(profile(false))

    expect(url).toContain('/login?error=oauth_email_unverified')
    expect(mocks.repo.createOAuth).not.toHaveBeenCalled()
  })

  it('links a verified email to the existing account', async () => {
    const url = await run(profile(true))

    expect(mocks.repo.linkOAuth).toHaveBeenCalledWith('user-victim', expect.anything())
    expect(url).toContain('/auth-callback#code=')
  })

  it('still signs in an account already linked to this provider id', async () => {
    mocks.repo.getByOAuth.mockResolvedValue(existingUser)

    const url = await run(profile(false))

    expect(url).toContain('/auth-callback#code=')
    expect(mocks.repo.linkOAuth).not.toHaveBeenCalled()
  })
})

// Requirement: the OAuth sign-in never puts tokens in the URL; it hands over a one-time code in the
// fragment, which the frontend exchanges once for the session cookies.
describe('one-time OAuth code', () => {
  it('the redirect carries only a code in the fragment, no token and no CSRF', async () => {
    const url = await run(profile(true))

    expect(url).toMatch(/\/auth-callback#code=[^&?]+$/)
    expect(url).not.toMatch(/accessToken|refreshToken|csrfToken|csrf=/)
    expect(mocks.sessions.create).toHaveBeenCalledWith(
      'user-victim',
      expect.any(Buffer),
      expect.any(Date)
    )
  })

  type Exchange = { status: number; body: any; cookies: string[] }
  function exchange(code: unknown): Promise<Exchange> {
    return new Promise((resolve, reject) => {
      const out: Exchange = { status: 200, body: undefined, cookies: [] }
      const res = {
        status(c: number) {
          out.status = c
          return this
        },
        json(body: unknown) {
          out.body = body
          resolve(out)
          return this
        },
        cookie(name: string) {
          out.cookies.push(name)
          return this
        },
      }
      exchangeOAuthCode(
        { body: { code } } as unknown as Request,
        res as unknown as Response,
        reject
      )
    })
  }
  const in8h = () => new Date(Date.now() + 8 * 60 * 60 * 1000)

  it('exchanging the code sets the three cookies and says where to go', async () => {
    const code = await generateOAuthCode({ id: 'user-victim', email: 'v@x.com' }, 'sid-1', 'jti-1')
    mocks.sessions.rotate.mockResolvedValue({
      status: 'rotated',
      userId: 'user-victim',
      expiresAt: in8h(),
    })

    mocks.keys.userHasKeys.mockResolvedValue(true)
    const withKeys = await exchange(code)
    expect(withKeys.status).toBe(200)
    expect(withKeys.body.next).toBe('unlock')
    expect(withKeys.cookies).toEqual(
      expect.arrayContaining(['accessToken', 'refreshToken', 'csrfToken'])
    )
    // No grace for a one-time code
    expect(mocks.sessions.rotate).toHaveBeenCalledWith(
      'sid-1',
      expect.any(Buffer),
      expect.any(Buffer),
      0
    )

    mocks.keys.userHasKeys.mockResolvedValue(false)
    expect((await exchange(code)).body.next).toBe('setup-pin')
  })

  it('a second exchange of the same code is refused', async () => {
    const code = await generateOAuthCode({ id: 'user-victim', email: 'v@x.com' }, 'sid-1', 'jti-1')
    mocks.sessions.rotate.mockResolvedValue({ status: 'reuse', userId: 'user-victim' })

    const out = await exchange(code)

    expect(out.status).toBe(401)
    expect(out.cookies).toEqual([])
  })

  it('a refresh token is not accepted as a code', async () => {
    const refresh = await generateRefreshToken(
      { id: 'u', email: 'u@x.com' },
      'sid-1',
      'jti-1',
      in8h()
    )
    const out = await exchange(refresh)
    expect(out.status).toBe(401)
    expect(mocks.sessions.rotate).not.toHaveBeenCalled()
  })
})
