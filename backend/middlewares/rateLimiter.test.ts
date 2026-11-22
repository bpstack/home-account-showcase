import type { Request } from 'express'
import { describe, expect, it } from 'vitest'
import { emailRateLimitKey, refreshRateLimitKey, userRateLimitKey } from './rateLimiter.js'

// Every request arrives from the same address: the Next proxy's
const PROXY_IP = '10.0.0.1'

// Requirement: one user's requests never throttle another user (PIN, email change, market data,
// account keys, invitations).
describe('userRateLimitKey', () => {
  const request = (userId?: string) =>
    ({ ip: PROXY_IP, user: userId ? { id: userId } : undefined }) as unknown as Request

  it('gives two users behind the same address different keys', () => {
    expect(userRateLimitKey(request('user-a'))).not.toBe(userRateLimitKey(request('user-b')))
  })

  it('gives the same user the same key', () => {
    expect(userRateLimitKey(request('user-a'))).toBe(userRateLimitKey(request('user-a')))
  })
})

// Requirement: failed logins, registrations, password resets and verification resends for one
// email never block another email; and the same address written differently is still one counter.
describe('emailRateLimitKey', () => {
  const post = (email: unknown) => ({ ip: PROXY_IP, body: { email }, query: {} }) as Request
  const get = (email: string) => ({ ip: PROXY_IP, body: undefined, query: { email } }) as never

  it('gives two emails behind the same address different keys', () => {
    expect(emailRateLimitKey(post('ana@example.com'))).not.toBe(
      emailRateLimitKey(post('luis@example.com'))
    )
  })

  it('counts the same email the same whatever its case or padding', () => {
    expect(emailRateLimitKey(post('  Ana@Example.COM '))).toBe(
      emailRateLimitKey(post('ana@example.com'))
    )
  })

  it('reads the email from the query on GET, with the same key as from the body', () => {
    expect(emailRateLimitKey(get('ana@example.com'))).toBe(
      emailRateLimitKey(post('ana@example.com'))
    )
  })

  it('never shares a key between an email and a request without one', () => {
    expect(emailRateLimitKey(post(undefined))).not.toBe(emailRateLimitKey(post('ana@example.com')))
  })
})

// Requirement: refreshes are limited per session, not per address.
describe('refreshRateLimitKey', () => {
  const key = (sid: string) =>
    refreshRateLimitKey({ ip: PROXY_IP } as Request, { locals: { refreshSid: sid } } as never)

  it('gives two sessions behind the same address different keys, and one session the same key', () => {
    expect(key('sid-a')).not.toBe(key('sid-b'))
    expect(key('sid-a')).toBe(key('sid-a'))
  })
})
