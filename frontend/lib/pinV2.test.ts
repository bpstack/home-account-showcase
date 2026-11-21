import { describe, expect, it, vi } from 'vitest'

const setPin = vi.fn()
vi.mock('./apiClient', () => ({ auth: { setPin, unlockPin: vi.fn() } }))

const { isPinFormat, migrateToPinV2 } = await import('./pinV2')
const { derivePinSecrets, unwrapUserKeyRaw } = await import('./crypto')

// Lazy migration v1 → v2 (ADR-021). The PIN is 6 to 8 digits (setup-pin, pinSchema).

describe('isPinFormat', () => {
  it('accepts 6 to 8 digits', () => {
    expect(isPinFormat('123456')).toBe(true)
    expect(isPinFormat('12345678')).toBe(true)
  })

  it('rejects anything that is not 6 to 8 digits, such as a login password', () => {
    expect(isPinFormat('12345')).toBe(false)
    expect(isPinFormat('123456789')).toBe(false)
    expect(isPinFormat('12345a')).toBe(false)
    expect(isPinFormat('pass1!')).toBe(false)
    expect(isPinFormat(' 123456')).toBe(false)
  })
})

describe('migrateToPinV2', () => {
  it('wraps the same UserKey under the same PIN with a new salt, and only sets the PIN', async () => {
    setPin.mockResolvedValue({ success: true })
    const callsBefore = setPin.mock.calls.length
    const raw = new Uint8Array(32).fill(0x5a)

    expect(await migrateToPinV2('482916', raw)).toBe(true)

    expect(setPin.mock.calls.length - callsBefore).toBe(1)
    const body = setPin.mock.calls[callsBefore][0]
    // The UserKey does not change: no new verification blob
    expect(body.verificationBlob).toBeUndefined()
    expect(body.newKeySalt).toMatch(/^[0-9a-f]{64}$/)
    expect(body.authKey).toMatch(/^[0-9a-f]{64}$/)

    // The next unlock, with the same PIN and the new salt, gets back the same UserKey bytes
    const { kek } = await derivePinSecrets('482916', body.newKeySalt)
    expect(Array.from(await unwrapUserKeyRaw(body.wrappedUserKey, kek))).toEqual(
      Array(32).fill(0x5a)
    )
  }, 30_000)

  it('sends a verification blob only when given one, for a legacy user without it', async () => {
    setPin.mockResolvedValue({ success: true })
    const callsBefore = setPin.mock.calls.length

    expect(await migrateToPinV2('482916', new Uint8Array(32), 'new-verification')).toBe(true)

    expect(setPin.mock.calls[callsBefore][0].verificationBlob).toBe('new-verification')
  }, 30_000)

  it('returns false without throwing when the server refuses, so the user stays on v1', async () => {
    setPin.mockRejectedValueOnce(new Error('429'))
    await expect(migrateToPinV2('482916', new Uint8Array(32))).resolves.toBe(false)
  }, 30_000)
})
