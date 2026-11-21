import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'
import { PIN_SERVER_KEY } from '../../config/config.js'

const KEY_LENGTH = 32
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const MIN_SEALED_LENGTH = IV_LENGTH + AUTH_TAG_LENGTH

function deriveServerKey(info: string): Buffer {
  return Buffer.from(hkdfSync('sha256', PIN_SERVER_KEY, Buffer.alloc(0), info, KEY_LENGTH))
}

const K_MAC = deriveServerKey('hac-pin-mac-v2')
const K_ENC = deriveServerKey('hac-pin-enc-v2')

export function computeVerifier(userId: string, authKey: Buffer): Buffer {
  return createHmac('sha256', K_MAC).update(userId, 'utf8').update(authKey).digest()
}

export function verifiersMatch(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export function sealWrappedKey(userId: string, wrapped: string): string {
  const plaintext = Buffer.from(wrapped, 'base64')
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv('aes-256-gcm', K_ENC, iv)
  cipher.setAAD(Buffer.from(userId, 'utf8'))

  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()

  return Buffer.concat([iv, encrypted, tag]).toString('base64')
}

export function openWrappedKey(userId: string, sealed: string): string {
  const bytes = Buffer.from(sealed, 'base64')
  if (bytes.length < MIN_SEALED_LENGTH) {
    throw new Error('Invalid sealed wrapped key')
  }

  const iv = bytes.subarray(0, IV_LENGTH)
  const tag = bytes.subarray(bytes.length - AUTH_TAG_LENGTH)
  const encrypted = bytes.subarray(IV_LENGTH, bytes.length - AUTH_TAG_LENGTH)
  const decipher = createDecipheriv('aes-256-gcm', K_ENC, iv)
  decipher.setAAD(Buffer.from(userId, 'utf8'))
  decipher.setAuthTag(tag)

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('base64')
}
