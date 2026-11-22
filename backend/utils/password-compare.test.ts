import * as bcrypt from 'bcrypt'
import type { Request, Response } from 'express'
import { describe, expect, it } from 'vitest'
import { sanitizeBody } from '../middlewares/sanitizeMiddleware.js'
import { comparePassword } from './password-compare.js'

const hash = (password: string) => bcrypt.hash(password, 4)

function sanitized(body: Record<string, unknown>) {
  const req = { body } as Request
  sanitizeBody(req, {} as Response, () => undefined)
  return req.body
}

// Requirement (ASVS 6.2.8, review finding 12): a password is checked exactly as typed, with no
// trimming or rewriting, so two different passwords are never the same one.
describe('sanitizeBody and passwords', () => {
  it('leaves every password field as typed, and still sanitizes the other fields', () => {
    const body = sanitized({
      password: ' abc<def123 ',
      currentPassword: 'a&b>c',
      newPassword: 'x<script>y',
      name: '<img src=x onerror=alert(1)>Ana',
    })
    expect(body.password).toBe(' abc<def123 ')
    expect(body.currentPassword).toBe('a&b>c')
    expect(body.newPassword).toBe('x<script>y')
    expect(body.name).not.toContain('onerror')
    expect(body.name).toContain('Ana')
  })
})

describe('comparePassword', () => {
  it('accepts the password as typed, and only it, for a hash made from it', async () => {
    const stored = await hash('abc<def123')
    expect(await comparePassword('abc<def123', stored)).toBe(true)
    // What the sanitizer used to turn it into is a different password now
    expect(await comparePassword('abc', stored)).toBe(false)
  })

  // Requirement: nobody who signed up while passwords were rewritten is locked out
  it('accepts the typed password for a hash stored from its old rewritten form', async () => {
    const storedBefore = await hash('abc') // 'abc<def123' as the sanitizer stored it
    expect(await comparePassword('abc<def123', storedBefore)).toBe(true)
    const trimmedBefore = await hash('pass word')
    expect(await comparePassword(' pass word ', trimmedBefore)).toBe(true)
  })

  it('turns away a wrong password', async () => {
    expect(await comparePassword('wrong-password', await hash('right-password'))).toBe(false)
  })
})
