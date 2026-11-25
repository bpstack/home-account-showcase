import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import express from 'express'
import passport from 'passport'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

// The app's address, read when the controller loads
vi.hoisted(() => {
  process.env.FRONTEND_URL = 'https://app.example'
})

vi.mock('../../repositories/auth/user-repository.js', () => ({ UserRepository: {} }))
vi.mock('../../repositories/crypto/account-key-repository.js', () => ({
  AccountKeyRepository: {},
}))
vi.mock('../../repositories/auth/session-repository.js', () => ({ SessionRepository: {} }))
vi.mock('../../config/config.js', () => ({ SECRET_JWT_KEY: 'test-secret' }))

import oauthRoutes from './oauth-routes.js'

/** A provider that turns every sign-in down, as Google or GitHub do when the user cancels. */
class RejectingStrategy extends passport.Strategy {
  constructor(public name: string) {
    super()
  }
  authenticate() {
    this.fail()
  }
}

let server: Server
let base: string

beforeAll(async () => {
  passport.use('google', new RejectingStrategy('google'))
  passport.use('github', new RejectingStrategy('github'))
  const app = express()
  app.use(passport.initialize())
  app.use('/api/auth', oauthRoutes)
  server = app.listen(0)
  await new Promise<void>((resolve) => server.once('listening', () => resolve()))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())))

describe('OAuth callback when the provider turns the sign-in down', () => {
  it.each(['google', 'github'])(
    '%s sends the user back to the app login page with a known message',
    async (provider) => {
      const res = await fetch(`${base}/api/auth/${provider}/callback`, { redirect: 'manual' })
      expect(res.status).toBe(302)
      // The app lives on another domain: a relative path would land on the backend
      expect(res.headers.get('location')).toBe('https://app.example/login?error=oauth_invalid')
    }
  )
})
