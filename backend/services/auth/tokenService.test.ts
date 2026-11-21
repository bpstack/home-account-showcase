import { SignJWT } from 'jose'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../config/config.js', () => ({ SECRET_JWT_KEY: 'test-secret' }))

import {
  generateAccessToken,
  generateOAuthCode,
  generateRefreshToken,
  verifyToken,
  verifyTokenAllowingExpiry,
} from './tokenService.js'

const USER = { id: 'user-a', email: 'a@example.com' }
const in8h = () => new Date(Date.now() + 8 * 60 * 60 * 1000)

afterEach(() => vi.useRealTimers())

// Requirement: each token is good only for its own purpose, and a token without a type (the
// format before stored sessions) is refused.
describe('token types', () => {
  it('an access token is not accepted as a refresh token, nor the other way round', async () => {
    const access = await generateAccessToken(USER, 'sid-1')
    const refresh = await generateRefreshToken(USER, 'sid-1', 'jti-1', in8h())

    await expect(verifyToken(access, 'refresh')).rejects.toThrow('Token inválido')
    await expect(verifyToken(refresh, 'access')).rejects.toThrow('Token inválido')
    await expect(verifyToken(access, 'access')).resolves.toMatchObject({
      id: 'user-a',
      sid: 'sid-1',
    })
    await expect(verifyToken(refresh, 'refresh')).resolves.toMatchObject({ jti: 'jti-1' })
  })

  it('an OAuth code is accepted only as an OAuth code', async () => {
    const code = await generateOAuthCode(USER, 'sid-1', 'jti-1')
    await expect(verifyToken(code, 'refresh')).rejects.toThrow('Token inválido')
    await expect(verifyToken(code, 'access')).rejects.toThrow('Token inválido')
    await expect(verifyToken(code, 'oauth-code')).resolves.toMatchObject({ sid: 'sid-1' })
  })

  it('refuses a token without a type, as issued before stored sessions', async () => {
    const legacy = await new SignJWT({ id: USER.id, email: USER.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(new TextEncoder().encode('test-secret'))
    await expect(verifyToken(legacy, 'access')).rejects.toThrow('Token inválido')
    await expect(verifyToken(legacy, 'refresh')).rejects.toThrow('Token inválido')
  })

  it('an OAuth code expires after 60 seconds', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const code = await generateOAuthCode(USER, 'sid-1', 'jti-1')
    vi.setSystemTime(Date.now() + 61 * 1000)
    await expect(verifyToken(code, 'oauth-code')).rejects.toThrow('Token expirado')
  })

  it('a refresh token expires when its session does', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const refresh = await generateRefreshToken(USER, 'sid-1', 'jti-1', in8h())
    vi.setSystemTime(Date.now() + 8 * 60 * 60 * 1000 + 1000)
    await expect(verifyToken(refresh, 'refresh')).rejects.toThrow('Token expirado')
  })
})

describe('verifyTokenAllowingExpiry', () => {
  it('still returns an expired refresh token (logout must end its session)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const refresh = await generateRefreshToken(USER, 'sid-1', 'jti-1', in8h())
    vi.setSystemTime(Date.now() + 9 * 60 * 60 * 1000)
    await expect(verifyTokenAllowingExpiry(refresh, 'refresh')).resolves.toMatchObject({
      sid: 'sid-1',
    })
  })

  it('returns nothing for a token of another type or a forged one', async () => {
    const access = await generateAccessToken(USER, 'sid-1')
    await expect(verifyTokenAllowingExpiry(access, 'refresh')).resolves.toBeNull()
    await expect(
      verifyTokenAllowingExpiry(access.slice(0, -2) + 'xx', 'access')
    ).resolves.toBeNull()
  })
})
