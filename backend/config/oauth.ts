import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Strategy as GitHubStrategy } from 'passport-github2'
import { logger } from '../utils/logger.js'

export interface OAuthProfile {
  provider: 'google' | 'github'
  id: string
  email: string
  /** Whether the provider says the user proved they own `email`. Only then is it trusted. */
  emailVerified: boolean
  name: string
  avatar?: string
}

/** Google's userinfo (OpenID) profile carries `email_verified` as `verified` on the first email. */
export function googleEmail(profile: any): { email: string; emailVerified: boolean } {
  const first = profile?.emails?.[0]
  const verified = first?.verified
  return { email: first?.value || '', emailVerified: verified === true || verified === 'true' }
}

/**
 * GitHub with `allRawEmails`: every address of the account with its `primary` and `verified`
 * flags. The primary one if verified, otherwise any verified one; none means not trusted.
 */
export function githubEmail(profile: any): { email: string; emailVerified: boolean } {
  const emails: Array<{ value?: string; primary?: boolean; verified?: boolean }> =
    profile?.emails || []
  const chosen =
    emails.find((e) => e.primary && e.verified === true && e.value) ||
    emails.find((e) => e.verified === true && e.value)
  if (chosen?.value) return { email: chosen.value, emailVerified: true }
  // Never trusted; a placeholder keeps an already linked account able to sign in by its GitHub id
  const fallback = emails.find((e) => e.primary)?.value || `${profile?.username}@github.local`
  return { email: fallback, emailVerified: false }
}

export function configureOAuth(): void {
  // Leer variables DENTRO de la función para que dotenv ya las haya cargado
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID
  const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET
  const CALLBACK_BASE = process.env.OAUTH_CALLBACK_URL || 'http://localhost:3001'

  // A provider without its credentials is left out, and the start log says so. It used to start
  // with made-up ones, which hid the missing configuration until someone tried to sign in.
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    logger.warn('OAUTH', 'configureOAuth', 'Google sign-in disabled: credentials missing')
  } else
    passport.use(
      new GoogleStrategy(
        {
          clientID: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
          callbackURL: `${CALLBACK_BASE}/api/auth/google/callback`,
          scope: ['profile', 'email'],
        },
        (
          _accessToken: string,
          _refreshToken: string,
          profile: any,
          done: (error: null, profile?: OAuthProfile) => void
        ) => {
          const oauthProfile: OAuthProfile = {
            provider: 'google',
            id: profile.id,
            ...googleEmail(profile),
            name: profile.displayName,
            avatar: profile.photos?.[0]?.value,
          }
          done(null, oauthProfile)
        }
      )
    )

  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    logger.warn('OAUTH', 'configureOAuth', 'GitHub sign-in disabled: credentials missing')
  } else
    passport.use(
      new GitHubStrategy(
        {
          clientID: GITHUB_CLIENT_ID,
          clientSecret: GITHUB_CLIENT_SECRET,
          callbackURL: `${CALLBACK_BASE}/api/auth/github/callback`,
          scope: ['user:email'],
          // Every address with its `verified` flag; by default only the primary one, unflagged
          allRawEmails: true,
        },
        (
          _accessToken: string,
          _refreshToken: string,
          profile: any,
          done: (error: null, profile?: OAuthProfile) => void
        ) => {
          const oauthProfile: OAuthProfile = {
            provider: 'github',
            id: profile.id,
            ...githubEmail(profile),
            name: profile.displayName || profile.username,
            avatar: profile.photos?.[0]?.value,
          }
          done(null, oauthProfile)
        }
      )
    )

  passport.serializeUser((user: any, done) => {
    done(null, user)
  })

  passport.deserializeUser((user: any, done) => {
    done(null, user)
  })
}

export default passport
