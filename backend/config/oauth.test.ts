import { describe, expect, it } from 'vitest'
import { githubEmail, googleEmail } from './oauth.js'

// Requirement: an OAuth email is trusted only if the provider says it is verified.
describe('googleEmail', () => {
  it('trusts the email only when Google marks it verified', () => {
    expect(googleEmail({ emails: [{ value: 'a@x.com', verified: true }] })).toEqual({
      email: 'a@x.com',
      emailVerified: true,
    })
    expect(googleEmail({ emails: [{ value: 'a@x.com', verified: 'true' }] }).emailVerified).toBe(
      true
    )
    expect(googleEmail({ emails: [{ value: 'a@x.com', verified: false }] }).emailVerified).toBe(
      false
    )
    expect(googleEmail({ emails: [{ value: 'a@x.com' }] }).emailVerified).toBe(false)
  })
})

describe('githubEmail', () => {
  it('uses the primary address when it is verified', () => {
    const profile = {
      emails: [
        { value: 'other@x.com', primary: false, verified: true },
        { value: 'main@x.com', primary: true, verified: true },
      ],
    }
    expect(githubEmail(profile)).toEqual({ email: 'main@x.com', emailVerified: true })
  })

  it('falls back to another verified address when the primary one is not verified', () => {
    const profile = {
      emails: [
        { value: 'victim@x.com', primary: true, verified: false },
        { value: 'mine@x.com', primary: false, verified: true },
      ],
    }
    expect(githubEmail(profile)).toEqual({ email: 'mine@x.com', emailVerified: true })
  })

  it('does not trust any address when none is verified', () => {
    const profile = {
      username: 'u',
      emails: [{ value: 'victim@x.com', primary: true, verified: false }],
    }
    expect(githubEmail(profile).emailVerified).toBe(false)
    expect(githubEmail({ username: 'u' })).toEqual({
      email: 'u@github.local',
      emailVerified: false,
    })
  })
})
