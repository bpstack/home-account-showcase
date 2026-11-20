import { hkdf } from '@noble/hashes/hkdf.js'
import { hmac } from '@noble/hashes/hmac.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js'
import { describe, expect, it } from 'vitest'
import { decrypt, deriveHmacKey, encrypt, generateAccountKey, hmacHex } from './crypto'

// Independent reference: RFC 5869 HKDF and RFC 2104 HMAC from @noble/hashes, not WebCrypto
async function referenceHmac(accountKey: CryptoKey, purpose: string, message: string) {
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', accountKey))
  const key = hkdf(sha256, raw, undefined, utf8ToBytes(`home-account/hmac/v1/${purpose}`), 32)
  return bytesToHex(hmac(sha256, key, utf8ToBytes(message)))
}

describe('deriveHmacKey and hmacHex', () => {
  it('match HKDF-SHA-256 + HMAC-SHA-256 as specified by the RFCs', async () => {
    const accountKey = await generateAccountKey()
    const key = await deriveHmacKey(accountKey, 'import-hash')
    const message = '2026-11-18|compra en tienda|-25.40'
    expect(await hmacHex(key, message)).toBe(
      await referenceHmac(accountKey, 'import-hash', message)
    )
  })

  it('give the same hash for the same key and message', async () => {
    const accountKey = await generateAccountKey()
    const a = await hmacHex(await deriveHmacKey(accountKey, 'bank-category'), 'Compras|Super')
    const b = await hmacHex(await deriveHmacKey(accountKey, 'bank-category'), 'Compras|Super')
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
  })

  it('give different hashes for different purposes and different accounts', async () => {
    const accountA = await generateAccountKey()
    const accountB = await generateAccountKey()
    const message = 'Compras|Super'
    const forImport = await hmacHex(await deriveHmacKey(accountA, 'import-hash'), message)
    const forCategory = await hmacHex(await deriveHmacKey(accountA, 'bank-category'), message)
    const otherAccount = await hmacHex(await deriveHmacKey(accountB, 'bank-category'), message)
    expect(forImport).not.toBe(forCategory)
    expect(forCategory).not.toBe(otherAccount)
  })

  it('do not stop the Account Key from encrypting and decrypting', async () => {
    const accountKey = await generateAccountKey()
    await deriveHmacKey(accountKey, 'import-hash')
    expect(await decrypt(await encrypt('Nómina', accountKey), accountKey)).toBe('Nómina')
  })
})
