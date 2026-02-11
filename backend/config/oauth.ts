import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Strategy as GitHubStrategy } from 'passport-github2'

export interface OAuthProfile {
  provider: 'google' | 'github'
  id: string
  email: string
  name: string
  avatar?: string
}

export function configureOAuth(): void {
  // Leer variables DENTRO de la función para que dotenv ya las haya cargado
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'mock_google_client_id'
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'mock_google_client_secret'
  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'mock_github_client_id'
  const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || 'mock_github_client_secret'
  const CALLBACK_BASE = process.env.OAUTH_CALLBACK_URL || 'http://localhost:3001'

  console.log('🔐 OAuth configured with Client ID:', GOOGLE_CLIENT_ID.substring(0, 20) + '...')

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
          email: profile.emails?.[0]?.value || '',
          name: profile.displayName,
          avatar: profile.photos?.[0]?.value,
        }
        done(null, oauthProfile)
      }
    )
  )

  passport.use(
    new GitHubStrategy(
      {
        clientID: GITHUB_CLIENT_ID,
        clientSecret: GITHUB_CLIENT_SECRET,
        callbackURL: `${CALLBACK_BASE}/api/auth/github/callback`,
        scope: ['user:email'],
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
          email: profile.emails?.[0]?.value || `${profile.username}@github.local`,
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
