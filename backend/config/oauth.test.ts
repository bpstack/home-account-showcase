import passport from 'passport'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { configureOAuth, githubEmail, googleEmail } from './oauth.js'

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

type WithStrategies = { _strategy(name: string): { _oauth2?: { _clientId: string } } | undefined }
const strategy = (name: string) => (passport as unknown as WithStrategies)._strategy(name)

// Requirement (review finding 20): a provider without credentials is not offered with made-up
// ones; with its credentials, it is offered with exactly those.
describe('configureOAuth', () => {
  afterEach(() => {
    passport.unuse('google')
    passport.unuse('github')
    vi.unstubAllEnvs()
  })

  it('leaves out a provider whose credentials are missing', () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', '')
    vi.stubEnv('GOOGLE_CLIENT_SECRET', '')
    vi.stubEnv('GITHUB_CLIENT_ID', 'gh-id')
    vi.stubEnv('GITHUB_CLIENT_SECRET', '')
    configureOAuth()
    expect(strategy('google')).toBeUndefined()
    expect(strategy('github')).toBeUndefined()
  })

  it('offers a provider with its own credentials', () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'google-id')
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'google-secret')
    vi.stubEnv('GITHUB_CLIENT_ID', 'gh-id')
    vi.stubEnv('GITHUB_CLIENT_SECRET', 'gh-secret')
    configureOAuth()
    expect(strategy('google')?._oauth2?._clientId).toBe('google-id')
    expect(strategy('github')?._oauth2?._clientId).toBe('gh-id')
  })
})
