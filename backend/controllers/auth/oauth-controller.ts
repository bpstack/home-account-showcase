import { Request, Response } from 'express'
import { UserRepository } from '../../repositories/auth/user-repository.js'
import { AccountKeyRepository } from '../../repositories/crypto/account-key-repository.js'
import { continueSession, startOAuthSession } from '../../services/auth/sessionService.js'
import { asyncHandler } from '../../utils/async-handler.js'
import { logger } from '../../utils/logger.js'
import type { OAuthProfile } from '../../config/oauth.js'

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

export const oauthCallback = asyncHandler(async (req: Request, res: Response) => {
  const profile = req.user as OAuthProfile

  if (!profile || !profile.email) {
    logger.warn('AUTH', 'oauthCallback', 'OAuth callback without valid profile', { profile })
    res.redirect(`${FRONTEND_URL}/login?error=oauth_invalid`)
    return
  }

  logger.info('AUTH', 'oauthCallback', `OAuth login: ${profile.provider}`, { email: profile.email })

  let user = await UserRepository.getByOAuth(profile.provider, profile.id)
  let isNewUser = false

  if (!user) {
    // Linking or creating an account by email trusts that the email is this person's. Without the
    // provider's verification, anyone could register someone else's address there and get their
    // session here.
    if (!profile.emailVerified) {
      logger.warn('AUTH', 'oauthCallback', 'OAuth email not verified by the provider', {
        provider: profile.provider,
      })
      res.redirect(`${FRONTEND_URL}/login?error=oauth_email_unverified`)
      return
    }

    const existingByEmail = await UserRepository.getByEmailForOAuth(profile.email)

    if (existingByEmail) {
      const hasLocalPassword = await UserRepository.hasLocalPassword(existingByEmail.id)

      if (hasLocalPassword) {
        logger.info('AUTH', 'oauthCallback', 'Linking OAuth to existing account with password', {
          userId: existingByEmail.id,
          email: profile.email,
        })

        await UserRepository.linkOAuth(existingByEmail.id, {
          provider: profile.provider,
          oauthId: profile.id,
          avatar: profile.avatar,
        })

        user = {
          ...existingByEmail,
          oauth_provider: profile.provider,
          oauth_id: profile.id,
          avatar_url: profile.avatar,
        }
      } else {
        logger.info('AUTH', 'oauthCallback', 'Updating OAuth info for existing user', {
          userId: existingByEmail.id,
          email: profile.email,
        })

        await UserRepository.linkOAuth(existingByEmail.id, {
          provider: profile.provider,
          oauthId: profile.id,
          avatar: profile.avatar,
        })

        user = {
          ...existingByEmail,
          oauth_provider: profile.provider,
          oauth_id: profile.id,
          avatar_url: profile.avatar,
        }
      }
    } else {
      logger.info('AUTH', 'oauthCallback', 'Creating new OAuth user', {
        email: profile.email,
        provider: profile.provider,
      })

      user = await UserRepository.createOAuth({
        email: profile.email,
        name: profile.name,
        provider: profile.provider,
        oauthId: profile.id,
        avatar: profile.avatar,
      })
      isNewUser = true
    }
  }

  // A stored session whose first credential is a one-time code. It travels in the fragment, which
  // the browser never sends to a server, and the frontend exchanges it at POST /auth/oauth/exchange.
  const code = await startOAuthSession({ id: user.id, email: user.email })

  logger.info('AUTH', 'oauthCallback', 'OAuth session started', {
    userId: user.id,
    isNewUser,
  })

  res.redirect(`${FRONTEND_URL}/auth-callback#code=${encodeURIComponent(code)}`)
})

/**
 * Exchanges a one-time OAuth code for the session cookies. Called server to server by the Next
 * route handler, which copies the cookies to the browser. A second exchange of the same code ends
 * the session. Says where to go next: unlock if the user has encrypted data, setup-pin if not.
 */
export const exchangeOAuthCode = asyncHandler(async (req: Request, res: Response) => {
  const code = req.body?.code
  if (typeof code !== 'string' || !code) {
    res.status(400).json({ success: false, error: 'Code is required' })
    return
  }

  const result = await continueSession(res, code, 'oauth-code')
  if (!result.ok) {
    res.status(401).json({ success: false, error: 'Código no válido' })
    return
  }

  // The code is already spent and the cookies set: a failure here must not lose the sign-in.
  // Unlock is the safe default (it sends a user without encrypted data on to setup-pin).
  let next: 'unlock' | 'setup-pin' = 'unlock'
  try {
    next = (await AccountKeyRepository.userHasKeys(result.userId)) ? 'unlock' : 'setup-pin'
  } catch (error) {
    logger.warn('AUTH', 'exchangeOAuthCode', 'Could not check encryption keys', {
      error: (error as Error).message,
    })
  }
  res.status(200).json({ success: true, next })
})
