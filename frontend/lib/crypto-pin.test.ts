import { describe, expect, it } from 'vitest'
import {
  generateUserKeyRaw,
  importUserKey,
  secretsFromStretched,
  unwrapUserKeyRaw,
  wrapUserKey,
} from './crypto'

// PIN v2 key schedule, docs/PIN-plan.md §6.2 and §6.9.

describe('secretsFromStretched', () => {
  it('derives authKey as HKDF-SHA256(stretched, empty salt, "hac-pin-auth-v2", 32)', async () => {
    const stretched = new Uint8Array(32).fill(0x01)
    // Expected value computed separately with node:crypto, not with the code under test:
    //   hkdfSync('sha256', Buffer.alloc(32, 0x01), Buffer.alloc(0), 'hac-pin-auth-v2', 32)
    // (Node 24.22.3; the script is not committed).
    const { authKeyHex } = await secretsFromStretched(stretched)
    expect(authKeyHex).toBe('cd171bfbf508bda461c6a3acdc9fbccf71b0e9fbd593d81d707f7d9fbbd031a8')
  })

  it('gives a kek that cannot be exported', async () => {
    const { kek } = await secretsFromStretched(new Uint8Array(32).fill(0x01))
    expect(kek.extractable).toBe(false)
    await expect(crypto.subtle.exportKey('raw', kek)).rejects.toThrow()
  })
})

describe('wrapUserKey and unwrapUserKeyRaw', () => {
  it('give back the same UserKey bytes with the same kek', async () => {
    const { kek } = await secretsFromStretched(new Uint8Array(32).fill(0x01))
    const raw = new Uint8Array(32).fill(0xab)
    const wrapped = await wrapUserKey(raw, kek)
    // iv(12) + key(32) + GCM tag(16) = 60 bytes = 80 base64 characters (what the server accepts)
    expect(wrapped).toHaveLength(80)
    expect(Array.from(await unwrapUserKeyRaw(wrapped, kek))).toEqual(Array(32).fill(0xab))
  })

  it('refuse to unwrap with the kek of another PIN', async () => {
    const { kek } = await secretsFromStretched(new Uint8Array(32).fill(0x01))
    const { kek: otherKek } = await secretsFromStretched(new Uint8Array(32).fill(0x02))
    const wrapped = await wrapUserKey(generateUserKeyRaw(), kek)
    await expect(unwrapUserKeyRaw(wrapped, otherKek)).rejects.toThrow()
  })
})

describe('importUserKey', () => {
  it('imports a key that cannot be exported', async () => {
    const key = await importUserKey(generateUserKeyRaw())
    expect(key.extractable).toBe(false)
    expect(key.usages.sort()).toEqual(['decrypt', 'encrypt'])
  })
})

describe('generateUserKeyRaw', () => {
  it('gives 32 random bytes, different each time', () => {
    const a = generateUserKeyRaw()
    const b = generateUserKeyRaw()
    expect(a).toHaveLength(32)
    expect(Array.from(a)).not.toEqual(Array.from(b))
  })
})
