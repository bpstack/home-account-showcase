import { describe, expect, it } from 'vitest'
import { isAllowedOrigin } from './auth-origins'

describe('isAllowedOrigin', () => {
  it("lets in the app's own addresses", () => {
    expect(isAllowedOrigin('https://home-account-showcase-etn9.vercel.app')).toBe(true)
    expect(isAllowedOrigin('https://home-account.stackbp.es')).toBe(true)
    expect(isAllowedOrigin('http://localhost:3000')).toBe(true)
  })

  it('lets in a same-origin request, which carries no Origin', () => {
    expect(isAllowedOrigin(null)).toBe(true)
  })

  it("turns away home-account.vercel.app, someone else's site", () => {
    expect(isAllowedOrigin('https://home-account.vercel.app')).toBe(false)
  })

  it('turns away a *.vercel.app name anyone can claim, even if it looks like ours', () => {
    expect(isAllowedOrigin('https://home-account-showcase-evil.vercel.app')).toBe(false)
    expect(isAllowedOrigin('https://home-account-showcase-etn9.vercel.app.evil.com')).toBe(false)
  })
})
