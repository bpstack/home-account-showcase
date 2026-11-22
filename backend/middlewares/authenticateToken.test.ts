import type { NextFunction, Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../config/config.js', () => ({ SECRET_JWT_KEY: 'test-secret' }))

const isLive = vi.fn<(sid: string, userId: string) => Promise<boolean>>()
vi.mock('../repositories/auth/session-repository.js', () => ({
  SessionRepository: { isLive: (sid: string, userId: string) => isLive(sid, userId) },
}))

import { generateAccessToken } from '../services/auth/tokenService.js'
import { authenticateToken } from './authenticateToken.js'

type Outcome = { status: number } | { passed: true; userId?: string } | { error: unknown }

async function run(accessToken?: string): Promise<Outcome> {
  let outcome: Outcome | undefined
  const req = { headers: {}, cookies: { accessToken } } as unknown as Request
  const res = {
    status(code: number) {
      outcome = { status: code }
      return { json: () => undefined }
    },
  } as unknown as Response
  const next: NextFunction = (error?: unknown) => {
    outcome = error ? { error } : { passed: true, userId: req.user?.id }
  }
  await authenticateToken(req, res, next)
  return outcome!
}

const user = { id: 'user-1', email: 'u@example.com' }

// Requirement: an access token only works while its session is live. After a logout, a password
// change or a detected reuse, the session's access tokens stop working at once, not 15 min later.
describe('authenticateToken', () => {
  it('lets a valid token of a live session through, as its user', async () => {
    isLive.mockResolvedValueOnce(true)
    const token = await generateAccessToken(user, 'sid-1')
    await expect(run(token)).resolves.toEqual({ passed: true, userId: 'user-1' })
    expect(isLive).toHaveBeenLastCalledWith('sid-1', 'user-1')
  })

  it('turns away a valid, unexpired token whose session has ended', async () => {
    isLive.mockResolvedValueOnce(false)
    const token = await generateAccessToken(user, 'sid-1')
    await expect(run(token)).resolves.toEqual({ status: 401 })
  })

  it('does not answer 401 when the session cannot be checked: a database failure signs no one out', async () => {
    isLive.mockRejectedValueOnce(new Error('connection lost'))
    const token = await generateAccessToken(user, 'sid-1')
    const out = await run(token)
    expect(out).toHaveProperty('error')
    expect(out).not.toEqual({ status: 401 })
  })

  it('turns away a request without a token, and a forged one, without asking the database', async () => {
    isLive.mockClear()
    await expect(run(undefined)).resolves.toEqual({ status: 401 })
    await expect(run('not-a-jwt')).resolves.toEqual({ status: 401 })
    expect(isLive).not.toHaveBeenCalled()
  })
})
