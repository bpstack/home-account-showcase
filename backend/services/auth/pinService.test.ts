import { describe, expect, it, vi } from 'vitest'

vi.mock('../../config/config.js', () => ({
  PIN_SERVER_KEY: Buffer.alloc(32, 0x42),
}))

import { computeVerifier, openWrappedKey, sealWrappedKey, verifiersMatch } from './pinService.js'

const WRAPPED = Buffer.alloc(60, 0x5a).toString('base64')

describe('computeVerifier', () => {
  it('matches the independently calculated HMAC vector from the PIN v2 scheme', () => {
    // Calculated with Node 24, separately from this module: serverKey = 0x42 * 32,
    // K_mac = HKDF-SHA256(serverKey, empty salt, "hac-pin-mac-v2", 32), and
    // HMAC-SHA256(K_mac, UTF8("user-a") || (0x11 * 32)).
    expect(computeVerifier('user-a', Buffer.alloc(32, 0x11)).toString('hex')).toBe(
      '1be8ece446aba7278d0dace0fd510caed7c9fd637e267caffe266e8d8c949018'
    )
  })
})

describe('verifiersMatch', () => {
  it('accepts two identical buffers', () => {
    expect(verifiersMatch(Buffer.alloc(32, 1), Buffer.alloc(32, 1))).toBe(true)
  })

  it('rejects a one-byte difference', () => {
    const a = Buffer.alloc(32, 1)
    const b = Buffer.from(a)
    b[31] = 2
    expect(verifiersMatch(a, b)).toBe(false)
  })

  it('rejects different lengths without throwing', () => {
    expect(() => verifiersMatch(Buffer.alloc(32), Buffer.alloc(31))).not.toThrow()
    expect(verifiersMatch(Buffer.alloc(32), Buffer.alloc(31))).toBe(false)
  })
})

describe('server wrapping', () => {
  it('opens a wrapped key for the same user', () => {
    const sealed = sealWrappedKey('user-a', WRAPPED)
    expect(openWrappedKey('user-a', sealed)).toBe(WRAPPED)
  })

  it('refuses to open the wrapping with another user as AAD', () => {
    const sealed = sealWrappedKey('user-a', WRAPPED)
    expect(() => openWrappedKey('user-b', sealed)).toThrow()
  })

  it('refuses a tampered wrapping', () => {
    const bytes = Buffer.from(sealWrappedKey('user-a', WRAPPED), 'base64')
    bytes[bytes.length - 1] ^= 1
    expect(() => openWrappedKey('user-a', bytes.toString('base64'))).toThrow()
  })
})
