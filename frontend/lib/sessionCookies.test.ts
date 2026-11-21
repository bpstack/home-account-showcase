import { describe, expect, it } from 'vitest'
import { backendCookieHeader, parseSessionCookies } from './sessionCookies'

// Requirement: every session cookie the backend sets reaches the browser (including a rotated
// refresh token), and a cookie the backend clears is cleared in the browser too.
describe('parseSessionCookies', () => {
  const NOW = Date.parse('2026-11-21T20:00:00Z')

  it('reads the three session cookies even when Expires contains a comma', () => {
    const session = parseSessionCookies(
      [
        'accessToken=aaa.bbb.ccc; Path=/; Expires=Fri, 21 Nov 2026 20:15:00 GMT; HttpOnly',
        'refreshToken=ddd.eee.fff; Path=/; Expires=Sat, 22 Nov 2026 04:00:00 GMT; HttpOnly',
        'csrfToken=0123abcd; Path=/; Max-Age=28800',
      ],
      NOW
    )
    expect(session).toEqual({
      accessToken: 'aaa.bbb.ccc',
      refreshToken: 'ddd.eee.fff',
      csrfToken: '0123abcd',
    })
  })

  it('turns a cookie the backend cleared into a deletion', () => {
    const session = parseSessionCookies(
      [
        'accessToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'refreshToken=stale; Path=/; Max-Age=0',
        'csrfToken=old; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
      ],
      NOW
    )
    expect(session).toEqual({ accessToken: null, refreshToken: null, csrfToken: null })
  })

  it('ignores cookies that are not part of the session and leaves missing ones out', () => {
    const session = parseSessionCookies(['selectedAccountId=x; Path=/', 'csrfToken=c'], NOW)
    expect(session).toEqual({ csrfToken: 'c' })
  })

  it('keeps an equals sign inside the value', () => {
    expect(parseSessionCookies(['accessToken=abc==; Path=/'], NOW)).toEqual({
      accessToken: 'abc==',
    })
  })
})

// Requirement: after a refresh, the backend receives the new access and refresh tokens, but the
// browser's CSRF cookie, which must match the X-CSRF-Token header of that same request.
describe('backendCookieHeader', () => {
  const current = { accessToken: 'old-a', refreshToken: 'old-r', csrfToken: 'old-c' }

  it('sends the browser session as it is when nothing was refreshed', () => {
    expect(backendCookieHeader(current)).toBe(
      'accessToken=old-a; refreshToken=old-r; csrfToken=old-c'
    )
  })

  it('takes the fresh access and refresh tokens but keeps the browser CSRF cookie', () => {
    const fresh = { accessToken: 'new-a', refreshToken: 'new-r', csrfToken: 'new-c' }
    expect(backendCookieHeader(current, fresh)).toBe(
      'accessToken=new-a; refreshToken=new-r; csrfToken=old-c'
    )
  })

  it('keeps the current refresh token when the backend did not rotate it', () => {
    expect(backendCookieHeader(current, { accessToken: 'new-a' })).toBe(
      'accessToken=new-a; refreshToken=old-r; csrfToken=old-c'
    )
  })

  it('leaves out cookies the browser does not have', () => {
    expect(backendCookieHeader({ refreshToken: 'r' })).toBe('refreshToken=r')
  })
})
