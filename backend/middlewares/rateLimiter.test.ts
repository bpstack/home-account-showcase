import type { Request } from 'express'
import { describe, expect, it } from 'vitest'
import { pinRateLimitKey } from './rateLimiter.js'

// Requirement: one user's failed PIN attempts never throttle another user, even though every
// request arrives from the same address (the Next proxy).
describe('pinRateLimitKey', () => {
  const PROXY_IP = '10.0.0.1'
  const request = (userId?: string) =>
    ({ ip: PROXY_IP, user: userId ? { id: userId } : undefined }) as unknown as Request

  it('gives two users behind the same address different keys', () => {
    expect(pinRateLimitKey(request('user-a'))).not.toBe(pinRateLimitKey(request('user-b')))
  })

  it('gives the same user the same key', () => {
    expect(pinRateLimitKey(request('user-a'))).toBe(pinRateLimitKey(request('user-a')))
  })
})
