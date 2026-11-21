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
}))

vi.mock('../../repositories/auth/user-repository.js', () => ({ UserRepository: mocks.repo }))
vi.mock('../../repositories/crypto/account-key-repository.js', () => ({
  AccountKeyRepository: mocks.keys,
}))
vi.mock('../../services/auth/tokenService.js', () => ({
  generateAccessToken: vi.fn(async () => 'access'),
  generateRefreshToken: vi.fn(async () => 'refresh'),
}))
vi.mock('../../services/auth/csrfService.js', () => ({ generateCSRFToken: () => 'csrf' }))

import { oauthCallback } from './oauth-controller.js'

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
    expect(url).toContain('/auth-callback?')
  })

  it('still signs in an account already linked to this provider id', async () => {
    mocks.repo.getByOAuth.mockResolvedValue(existingUser)

    const url = await run(profile(false))

    expect(url).toContain('/auth-callback?')
    expect(mocks.repo.linkOAuth).not.toHaveBeenCalled()
  })
})
