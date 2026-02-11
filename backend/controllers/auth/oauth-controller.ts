import { Request, Response } from 'express'
import { UserRepository } from '../../repositories/auth/user-repository.js'
import { AccountKeyRepository } from '../../repositories/crypto/account-key-repository.js'
import { generateAccessToken, generateRefreshToken } from '../../services/auth/tokenService.js'
import { generateCSRFToken } from '../../services/auth/csrfService.js'
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

        user = { ...existingByEmail, oauth_provider: profile.provider, oauth_id: profile.id, avatar_url: profile.avatar }
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

        user = { ...existingByEmail, oauth_provider: profile.provider, oauth_id: profile.id, avatar_url: profile.avatar }
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

  const accessToken = await generateAccessToken({ id: user.id, email: user.email })
  const refreshToken = await generateRefreshToken({ id: user.id, email: user.email })
  const csrfToken = generateCSRFToken()

  logger.info('AUTH', 'oauthCallback', 'OAuth session established', {
    userId: user.id,
    isNewUser,
    hasKeySalt: !!user.key_salt,
  })

  // Build token params for cross-domain transfer via auth-callback page
  const tokenParams = new URLSearchParams({
    accessToken,
    refreshToken,
    csrfToken,
  })

  let finalRedirect: string
  if (isNewUser) {
    finalRedirect = `/setup-pin?csrf=${csrfToken}`
  } else {
    const hasEncryption = await AccountKeyRepository.userHasKeys(user.id)
    if (hasEncryption) {
      finalRedirect = `/unlock?csrf=${csrfToken}`
    } else {
      finalRedirect = `/setup-pin?csrf=${csrfToken}`
    }
  }

  tokenParams.set('redirect', finalRedirect)
  res.redirect(`${FRONTEND_URL}/auth-callback?${tokenParams.toString()}`)
})
