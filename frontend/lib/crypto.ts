/**
 * Crypto utilities for client-side encryption (Envelope Encryption)
 *
 * - User Key (UK): Derived from password using Argon2id, never leaves client
 * - Account Key (AK): Random 256-bit key per account, encrypted with UK
 * - Data encrypted with AK using AES-256-GCM
 */

import { argon2id } from '@noble/hashes/argon2.js'
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js'
import { generateMnemonic, validateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'

// ============================================
// CONSTANTS
// ============================================

const AES_KEY_LENGTH = 256
const IV_LENGTH = 12 // 96 bits for GCM
const SALT_LENGTH = 32 // 256 bits

// Argon2id parameters (OWASP recommended)
const ARGON2_OPTIONS = {
  t: 3, // iterations
  m: 65536, // 64 MB memory
  p: 4, // parallelism
}

// ============================================
// KEY DERIVATION
// ============================================

/**
 * Generate a random salt for key derivation
 */
export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  return bytesToHex(salt)
}

/**
 * Alias for generateSalt - generates key_salt for password derivation
 */
export const generateKeySalt = generateSalt

/**
 * Derive User Key from password using Argon2id
 * This key is used to encrypt/decrypt Account Keys
 */
export async function deriveUserKey(password: string, saltHex: string): Promise<CryptoKey> {
  const salt = hexToBytes(saltHex)
  const passwordBytes = utf8ToBytes(password)

  // Derive 256-bit key using Argon2id
  const derivedBytes = argon2id(passwordBytes, salt, {
    ...ARGON2_OPTIONS,
    dkLen: 32, // 256 bits
  })

  // Import as CryptoKey for Web Crypto API
  return crypto.subtle.importKey(
    'raw',
    toArrayBuffer(derivedBytes),
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    false, // not extractable - security!
    ['encrypt', 'decrypt']
  )
}

/**
 * Generate a new random Account Key
 */
export async function generateAccountKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    true, // extractable - needed to encrypt with UK
    ['encrypt', 'decrypt']
  )
}

// ============================================
// ACCOUNT KEY ENCRYPTION
// ============================================

/**
 * Encrypt Account Key with User Key
 * Returns base64 string: iv + encryptedKey
 */
export async function encryptAccountKey(
  accountKey: CryptoKey,
  userKey: CryptoKey
): Promise<string> {
  // Export AK to raw bytes
  const akRaw = await crypto.subtle.exportKey('raw', accountKey)

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))

  // Encrypt with UK
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, userKey, akRaw)

  // Combine iv + encrypted
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)

  return bytesToBase64(combined)
}

/**
 * Decrypt Account Key with User Key
 */
export async function decryptAccountKey(
  encryptedAK: string,
  userKey: CryptoKey
): Promise<CryptoKey> {
  const combined = base64ToBytes(encryptedAK)

  // Extract IV and encrypted data
  const iv = combined.slice(0, IV_LENGTH)
  const encrypted = combined.slice(IV_LENGTH)

  // Decrypt
  const akRaw = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, userKey, encrypted)

  // Import as CryptoKey
  return crypto.subtle.importKey(
    'raw',
    akRaw,
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    true, // extractable - needed for re-encryption on password change
    ['encrypt', 'decrypt']
  )
}

// ============================================
// DATA ENCRYPTION
// ============================================

/**
 * Encrypt data with Account Key
 * Returns base64 string: iv + ciphertext + authTag
 */
export async function encrypt(plaintext: string, accountKey: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const data = utf8ToBytes(plaintext)

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    accountKey,
    toArrayBuffer(data)
  )

  // Combine iv + encrypted (GCM includes auth tag)
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)

  return bytesToBase64(combined)
}

/**
 * Decrypt data with Account Key
 */
export async function decrypt(encryptedData: string, accountKey: CryptoKey): Promise<string> {
  const combined = base64ToBytes(encryptedData)

  const iv = combined.slice(0, IV_LENGTH)
  const ciphertext = combined.slice(IV_LENGTH)

  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, accountKey, ciphertext)

  return new TextDecoder().decode(decrypted)
}

// ============================================
// KEYED HASHES (HMAC)
// ============================================

/**
 * What a keyed hash is used for. Each purpose gets its own HMAC key, derived from the Account Key
 * with HKDF-SHA-256, so the AES key is never used as an HMAC key and hashes made for one purpose
 * cannot be matched against another. The server can compare these hashes but not reverse them.
 */
export type HmacPurpose = 'import-hash' | 'bank-category'

const HMAC_INFO_PREFIX = 'home-account/hmac/v1/'

/** Derives the HMAC-SHA-256 key for one purpose from an Account Key. */
export async function deriveHmacKey(
  accountKey: CryptoKey,
  purpose: HmacPurpose
): Promise<CryptoKey> {
  const accountKeyRaw = await crypto.subtle.exportKey('raw', accountKey)
  const base = await crypto.subtle.importKey('raw', accountKeyRaw, 'HKDF', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      // RFC 5869 default: a salt of HashLen zero bytes (the input is already a random key)
      salt: new Uint8Array(32),
      info: toArrayBuffer(utf8ToBytes(HMAC_INFO_PREFIX + purpose)),
    },
    base,
    { name: 'HMAC', hash: 'SHA-256', length: 256 },
    false, // not extractable
    ['sign']
  )
}

/** HMAC-SHA-256 of a UTF-8 message, as lowercase hex. */
export async function hmacHex(hmacKey: CryptoKey, message: string): Promise<string> {
  const signature = await crypto.subtle.sign('HMAC', hmacKey, toArrayBuffer(utf8ToBytes(message)))
  return bytesToHex(new Uint8Array(signature))
}

// ============================================
// VERIFICATION BLOB
// ============================================

const VERIFICATION_PLAINTEXT = 'HOME_ACCOUNT_VERIFIED_2026'

/**
 * Genera un verification blob cifrando un texto conocido con la User Key.
 * Se almacena en BD. Al unlock, se intenta descifrar:
 * - Si da VERIFICATION_PLAINTEXT → PIN correcto
 * - Si AES-GCM falla → PIN incorrecto
 */
export async function generateVerificationBlob(userKey: CryptoKey): Promise<string> {
  return encrypt(VERIFICATION_PLAINTEXT, userKey)
}

/**
 * Verifica si un PIN/password es correcto intentando descifrar el blob.
 * @returns true si el PIN es correcto, false si no
 */
export async function verifyUserKey(
  verificationBlob: string,
  userKey: CryptoKey
): Promise<boolean> {
  try {
    const result = await decrypt(verificationBlob, userKey)
    return result === VERIFICATION_PLAINTEXT
  } catch {
    return false
  }
}

// ============================================
// BIP39 RECOVERY
// ============================================

/**
 * Generate a 24-word BIP39 mnemonic phrase
 * Uses 256 bits of entropy → 24 words
 */
export function generateBIP39Mnemonic(): string {
  return generateMnemonic(wordlist, 256)
}

/**
 * Validate a BIP39 mnemonic phrase
 */
export function validateBIP39Mnemonic(mnemonic: string): boolean {
  return validateMnemonic(mnemonic, wordlist)
}

/**
 * Derive a RecoveryKey from a BIP39 mnemonic using Argon2id.
 * Uses a separate salt (recovery_salt) from the PIN salt (key_salt).
 */
export async function deriveRecoveryKey(
  mnemonic: string,
  recoverySaltHex: string
): Promise<CryptoKey> {
  const salt = hexToBytes(recoverySaltHex)
  const passwordBytes = utf8ToBytes(mnemonic)

  const derivedBytes = argon2id(passwordBytes, salt, {
    ...ARGON2_OPTIONS,
    dkLen: 32,
  })

  return crypto.subtle.importKey(
    'raw',
    toArrayBuffer(derivedBytes),
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Generate recovery_blob: encrypt the raw UserKey bytes with RecoveryKey.
 *
 * IMPORTANT: The UserKey must be extractable for this to work.
 * During recovery setup, we re-derive the UserKey as extractable.
 */
export async function generateRecoveryBlob(
  userKeyRaw: Uint8Array,
  recoveryKey: CryptoKey
): Promise<string> {
  return sealBytes(userKeyRaw, recoveryKey)
}

/**
 * Decrypt recovery_blob to get raw UserKey bytes, then import as CryptoKey.
 */
export async function decryptRecoveryBlob(
  recoveryBlob: string,
  recoveryKey: CryptoKey
): Promise<CryptoKey> {
  const userKeyRaw = await openBytes(recoveryBlob, recoveryKey)
  try {
    return await importUserKey(userKeyRaw)
  } finally {
    userKeyRaw.fill(0)
  }
}

/**
 * Decrypt recovery_blob and return the raw UserKey bytes (PIN v2 needs them to wrap the key with
 * a new PIN). The caller zeroes them with `fill(0)` once used.
 */
export async function decryptRecoveryBlobRaw(
  recoveryBlob: string,
  recoveryKey: CryptoKey
): Promise<Uint8Array> {
  return openBytes(recoveryBlob, recoveryKey)
}

/**
 * Derive UserKey as extractable (needed for generating recovery_blob).
 * Same as deriveUserKey but with extractable = true.
 */
export async function deriveUserKeyExtractable(
  password: string,
  saltHex: string
): Promise<{ key: CryptoKey; raw: Uint8Array }> {
  const salt = hexToBytes(saltHex)
  const passwordBytes = utf8ToBytes(password)

  // The caller owns `raw` and zeroes it; no other copy of the key bytes is left behind
  const raw = argon2id(passwordBytes, salt, {
    ...ARGON2_OPTIONS,
    dkLen: 32,
  })

  const key = await withKeyBuffer(raw, (buffer) =>
    crypto.subtle.importKey(
      'raw',
      buffer,
      { name: 'AES-GCM', length: AES_KEY_LENGTH },
      true, // extractable!
      ['encrypt', 'decrypt']
    )
  )

  return { key, raw }
}

// ============================================
// PIN v2 (ADR-021)
// ============================================
//
// The UserKey is a fixed 256-bit data key. The PIN no longer derives it: it only wraps it.
//   stretched = Argon2id(PIN, key_salt)
//   authKey   = HKDF-SHA256(stretched, salt = empty, info = "hac-pin-auth-v2", 32 bytes) → server
//   kek       = HKDF-SHA256(stretched, salt = empty, info = "hac-pin-kek-v2", 32 bytes)  → AES-GCM
//   wrapped   = iv(12) ‖ AES-256-GCM(kek, UserKey_raw)
// The server stores `wrapped` sealed with its own key and releases it only after checking authKey
// and counting the attempt. These values are fixed: changing any of them invalidates every stored
// verifier and wrapping.

const PIN_AUTH_INFO = 'hac-pin-auth-v2'
const PIN_KEK_INFO = 'hac-pin-kek-v2'
const USER_KEY_LENGTH = 32 // bytes

export interface PinSecrets {
  /** Proof of the PIN for the server, 64 hex characters. Reveals nothing about `kek`. */
  authKeyHex: string
  /** Wraps and unwraps the UserKey. Not extractable. */
  kek: CryptoKey
}

/**
 * The two HKDF subkeys of a stretched PIN. Split from the Argon2id step so it can be checked
 * against a fixed test vector.
 */
export async function secretsFromStretched(stretched: Uint8Array): Promise<PinSecrets> {
  const base = await withKeyBuffer(stretched, (buffer) =>
    crypto.subtle.importKey('raw', buffer, 'HKDF', false, ['deriveBits', 'deriveKey'])
  )
  const hkdfParams = (info: string) => ({
    name: 'HKDF',
    hash: 'SHA-256',
    salt: new Uint8Array(0),
    info: toArrayBuffer(utf8ToBytes(info)),
  })

  const authBytes = new Uint8Array(
    await crypto.subtle.deriveBits(hkdfParams(PIN_AUTH_INFO), base, USER_KEY_LENGTH * 8)
  )
  const authKeyHex = bytesToHex(authBytes)
  authBytes.fill(0)

  const kek = await crypto.subtle.deriveKey(
    hkdfParams(PIN_KEK_INFO),
    base,
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    false, // not extractable
    ['encrypt', 'decrypt']
  )

  return { authKeyHex, kek }
}

/** One Argon2id over the PIN, then both HKDF subkeys. */
export async function derivePinSecrets(pin: string, keySaltHex: string): Promise<PinSecrets> {
  const stretched = argon2id(utf8ToBytes(pin), hexToBytes(keySaltHex), {
    ...ARGON2_OPTIONS,
    dkLen: 32,
  })
  try {
    return await secretsFromStretched(stretched)
  } finally {
    stretched.fill(0)
  }
}

/** Wrap the raw UserKey with the PIN's kek. Same format as the recovery blob. */
export async function wrapUserKey(userKeyRaw: Uint8Array, kek: CryptoKey): Promise<string> {
  return sealBytes(userKeyRaw, kek)
}

/** Unwrap the raw UserKey. Throws if `kek` is not the one that wrapped it (AES-GCM tag). */
export async function unwrapUserKeyRaw(wrapped: string, kek: CryptoKey): Promise<Uint8Array> {
  const raw = await openBytes(wrapped, kek)
  if (raw.length !== USER_KEY_LENGTH) {
    raw.fill(0)
    throw new Error('Wrapped user key has the wrong length')
  }
  return raw
}

/** Import raw UserKey bytes as a non-extractable AES-GCM key. */
export async function importUserKey(raw: Uint8Array): Promise<CryptoKey> {
  return withKeyBuffer(raw, (buffer) =>
    crypto.subtle.importKey(
      'raw',
      buffer,
      { name: 'AES-GCM', length: AES_KEY_LENGTH },
      false, // not extractable
      ['encrypt', 'decrypt']
    )
  )
}

/** A new random 256-bit UserKey, as raw bytes. */
export function generateUserKeyRaw(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(USER_KEY_LENGTH))
}

// ============================================
// INVITATION KEY ENCRYPTION
// ============================================

/**
 * Generate invitation secret (for sharing AK via invite link)
 */
export function generateInvitationSecret(): string {
  const secret = crypto.getRandomValues(new Uint8Array(32))
  return bytesToHex(secret)
}

/**
 * Derive key from invitation secret
 */
export async function deriveInvitationKey(secretHex: string): Promise<CryptoKey> {
  const secretBytes = hexToBytes(secretHex)

  return crypto.subtle.importKey(
    'raw',
    toArrayBuffer(secretBytes),
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt Account Key for invitation
 */
export async function encryptAccountKeyForInvitation(
  accountKey: CryptoKey,
  invitationSecret: string
): Promise<string> {
  const invitationKey = await deriveInvitationKey(invitationSecret)
  return encryptAccountKey(accountKey, invitationKey)
}

/**
 * Decrypt Account Key from invitation
 */
export async function decryptAccountKeyFromInvitation(
  encryptedAK: string,
  invitationSecret: string
): Promise<CryptoKey> {
  const invitationKey = await deriveInvitationKey(invitationSecret)
  return decryptAccountKey(encryptedAK, invitationKey)
}

// ============================================
// UTILITIES
// ============================================

/**
 * Convert Uint8Array to ArrayBuffer (needed for Web Crypto API)
 */
function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  // Create a new ArrayBuffer copy to ensure it's not a SharedArrayBuffer
  const buffer = new ArrayBuffer(data.byteLength)
  new Uint8Array(buffer).set(data)
  return buffer
}

/**
 * Runs `operation` on a one-off ArrayBuffer copy of secret bytes and zeroes that copy afterwards, so
 * converting key bytes for Web Crypto never leaves an extra copy in memory.
 */
async function withKeyBuffer<T>(
  bytes: Uint8Array,
  operation: (buffer: ArrayBuffer) => Promise<T>
): Promise<T> {
  const buffer = toArrayBuffer(bytes)
  try {
    return await operation(buffer)
  } finally {
    new Uint8Array(buffer).fill(0)
  }
}

/** iv(12) ‖ AES-256-GCM(key, bytes), as base64. */
async function sealBytes(bytes: Uint8Array, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const encrypted = await withKeyBuffer(bytes, (buffer) =>
    crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, buffer)
  )
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)
  return bytesToBase64(combined)
}

/** Inverse of sealBytes. Throws if the key is wrong or the data was altered. */
async function openBytes(sealed: string, key: CryptoKey): Promise<Uint8Array> {
  const combined = base64ToBytes(sealed)
  const iv = combined.slice(0, IV_LENGTH)
  const encrypted = combined.slice(IV_LENGTH)
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted))
}

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Get amount sign for filtering (stored in clear)
 */
export function getAmountSign(amount: number): 'positive' | 'negative' | 'zero' {
  if (amount > 0) return 'positive'
  if (amount < 0) return 'negative'
  return 'zero'
}

// ============================================
// BATCH OPERATIONS
// ============================================

export interface EncryptedTransaction {
  id: string
  account_id: string
  subcategory_id: string | null
  date: string
  description_encrypted: string
  amount_encrypted: string
  amount_sign: 'positive' | 'negative' | 'zero'
  bank_category_encrypted: string | null
  bank_subcategory_encrypted: string | null
  created_at: string
  updated_at: string
}

export interface DecryptedTransaction {
  id: string
  account_id: string
  subcategory_id: string | null
  date: string
  description: string
  amount: number
  bank_category: string | null
  bank_subcategory: string | null
  created_at: string
  updated_at: string
}

/**
 * Decrypt a batch of transactions
 */
export async function decryptTransactions(
  encrypted: EncryptedTransaction[],
  accountKey: CryptoKey
): Promise<DecryptedTransaction[]> {
  return Promise.all(
    encrypted.map(async (t) => ({
      id: t.id,
      account_id: t.account_id,
      subcategory_id: t.subcategory_id,
      date: t.date,
      description: await decrypt(t.description_encrypted, accountKey),
      amount: parseFloat(await decrypt(t.amount_encrypted, accountKey)),
      bank_category: t.bank_category_encrypted
        ? await decrypt(t.bank_category_encrypted, accountKey)
        : null,
      bank_subcategory: t.bank_subcategory_encrypted
        ? await decrypt(t.bank_subcategory_encrypted, accountKey)
        : null,
      created_at: t.created_at,
      updated_at: t.updated_at,
    }))
  )
}

export interface EncryptedCategory {
  id: string
  account_id: string
  name_encrypted: string
  color: string
  icon: string | null
}

export interface DecryptedCategory {
  id: string
  account_id: string
  name: string
  color: string
  icon: string | null
}

/**
 * Decrypt a batch of categories
 */
export async function decryptCategories(
  encrypted: EncryptedCategory[],
  accountKey: CryptoKey
): Promise<DecryptedCategory[]> {
  return Promise.all(
    encrypted.map(async (c) => ({
      id: c.id,
      account_id: c.account_id,
      name: await decrypt(c.name_encrypted, accountKey),
      color: c.color,
      icon: c.icon,
    }))
  )
}
