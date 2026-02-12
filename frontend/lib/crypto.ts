/**
 * Crypto utilities for client-side encryption (Envelope Encryption)
 *
 * - User Key (UK): Derived from password using Argon2id, never leaves client
 * - Account Key (AK): Random 256-bit key per account, encrypted with UK
 * - Data encrypted with AK using AES-256-GCM
 */

import { argon2id } from '@noble/hashes/argon2.js'
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js'

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
