import { describe, expect, it } from 'vitest'
import { registerSchema } from './auth-validators.js'

// Requirement: a new login password has at least 8 characters.
describe('registerSchema password', () => {
  const base = { email: 'a@example.com', name: 'Ana' }

  it('rejects 7 characters even with a number and a symbol', () => {
    expect(registerSchema.safeParse({ ...base, password: 'abcd12!' }).success).toBe(false)
  })

  it('accepts 8 characters with a number and a symbol', () => {
    expect(registerSchema.safeParse({ ...base, password: 'abcd123!' }).success).toBe(true)
  })
})
