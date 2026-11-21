import { SignJWT } from 'jose'
import type { Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../config/config.js', () => ({ SECRET_JWT_KEY: 'test-secret' }))

import { generateAccessToken, generateRefreshToken } from '../services/auth/tokenService.js'
import { readRefreshSession } from './readRefreshSession.js'

function run(cookies: { refreshToken?: string }) {
  return new Promise<{ status: number; sid?: string; passed: boolean }>((resolve) => {
    const res = {
      locals: {} as Record<string, unknown>,
      status(code: number) {
        resolve({ status: code, passed: false })
        return { json: () => undefined }
      },
    }
    readRefreshSession(
      { cookies, body: {} } as unknown as Request,
      res as unknown as Response,
      () => resolve({ status: 200, sid: res.locals.refreshSid as string, passed: true })
    )
  })
}

// Requirement: only a valid refresh token of a stored session reaches the limiter and the
// rotation; its session id is what the limiter counts.
describe('readRefreshSession', () => {
  it('passes a refresh token on, with its session id', async () => {
    const token = await generateRefreshToken(
      { id: 'u', email: 'u@x.com' },
      'sid-1',
      'jti-1',
      new Date(Date.now() + 60_000)
    )
    await expect(run({ refreshToken: token })).resolves.toEqual({
      status: 200,
      sid: 'sid-1',
      passed: true,
    })
  })

  it('refuses no token, an access token and a refresh token without session or jti', async () => {
    const access = await generateAccessToken({ id: 'u', email: 'u@x.com' }, 'sid-1')
    const noSession = await new SignJWT({ id: 'u', email: 'u@x.com' })
      .setProtectedHeader({ alg: 'HS256', typ: 'refresh' })
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode('test-secret'))

    for (const cookies of [{}, { refreshToken: access }, { refreshToken: noSession }]) {
      const out = await run(cookies)
      expect(out.status).toBe(401)
      expect(out.passed).toBe(false)
    }
  })
})
