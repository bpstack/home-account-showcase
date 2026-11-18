// What POST /import/confirm receives (ADR-008): dates, ciphertexts, the sign of the amount, keyed
// hashes and the subcategory the user chose. Never a plaintext description, amount or bank
// category: the server can store and compare these values, not read them.

import { deriveHmacKey, encrypt, getAmountSign, hmacHex } from '../crypto'

/** A movement read from the statement, before encryption. */
export interface ImportMovement {
  /** YYYY-MM-DD */
  date: string
  description: string
  amount: number
  category: string | null
  subcategory: string | null
}

/** The app subcategory the user chose for one bank category pair (null: not assigned). */
export interface CategoryChoice {
  category: string | null
  subcategory: string | null
  subcategory_id: string | null
}

export interface EncryptedImportTransaction {
  date: string
  description_encrypted: string
  amount_encrypted: string
  amount_sign: 'positive' | 'negative' | 'zero'
  bank_category_encrypted: string | null
  bank_subcategory_encrypted: string | null
  /** HMAC-SHA-256, lowercase hex: finds a movement already imported without revealing it. */
  import_hash: string
  subcategory_id: string | null
}

/** A remembered category choice, looked up by keyed hash instead of by the bank's text. */
export interface HashedCategoryMapping {
  bank_category_hmac: string
  bank_subcategory_hmac: string
  subcategory_id: string
}

export interface ImportConfirmPayload {
  account_id: string
  transactions: EncryptedImportTransaction[]
  category_mappings: HashedCategoryMapping[]
}

/** Case, spacing and Unicode form do not change what a bank text means. */
function normalizeText(text: string | null): string {
  return (text ?? '').normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase()
}

function choiceKey(category: string | null, subcategory: string | null): string {
  return JSON.stringify([category ?? '', subcategory ?? ''])
}

/**
 * The movement's identity for duplicate detection. `occurrence` counts identical movements
 * (same day, description and amount) within one statement, so two equal purchases on the same
 * day are two movements, and importing the same statement again gives the same hashes.
 */
function importHashMessage(movement: ImportMovement, occurrence: number): string {
  const cents = Math.round(movement.amount * 100)
  return JSON.stringify([movement.date, normalizeText(movement.description), cents, occurrence])
}

async function bankCategoryHmacs(
  key: CryptoKey,
  category: string | null,
  subcategory: string | null
): Promise<{ bank_category_hmac: string; bank_subcategory_hmac: string }> {
  const normalizedCategory = normalizeText(category)
  return {
    bank_category_hmac: await hmacHex(key, JSON.stringify([normalizedCategory])),
    // The subcategory is hashed with its category: the same name under two categories differs.
    bank_subcategory_hmac: await hmacHex(
      key,
      JSON.stringify([normalizedCategory, normalizeText(subcategory)])
    ),
  }
}

async function encryptOptional(text: string | null, accountKey: CryptoKey) {
  return text ? encrypt(text, accountKey) : null
}

/** Encrypts and hashes a statement for POST /import/confirm. */
export async function buildImportPayload(
  accountId: string,
  accountKey: CryptoKey,
  movements: ImportMovement[],
  choices: CategoryChoice[]
): Promise<ImportConfirmPayload> {
  const importHashKey = await deriveHmacKey(accountKey, 'import-hash')
  const categoryKey = await deriveHmacKey(accountKey, 'bank-category')

  const chosen = new Map(choices.map((c) => [choiceKey(c.category, c.subcategory), c]))
  const seen = new Map<string, number>()

  const transactions: EncryptedImportTransaction[] = []
  for (const movement of movements) {
    const identity = importHashMessage(movement, 0)
    const occurrence = seen.get(identity) ?? 0
    seen.set(identity, occurrence + 1)

    transactions.push({
      date: movement.date,
      description_encrypted: await encrypt(movement.description, accountKey),
      amount_encrypted: await encrypt(movement.amount.toString(), accountKey),
      amount_sign: getAmountSign(movement.amount),
      bank_category_encrypted: await encryptOptional(movement.category, accountKey),
      bank_subcategory_encrypted: await encryptOptional(movement.subcategory, accountKey),
      import_hash: await hmacHex(importHashKey, importHashMessage(movement, occurrence)),
      subcategory_id:
        chosen.get(choiceKey(movement.category, movement.subcategory))?.subcategory_id ?? null,
    })
  }

  const category_mappings: HashedCategoryMapping[] = []
  for (const choice of choices) {
    if (!choice.subcategory_id) continue
    category_mappings.push({
      ...(await bankCategoryHmacs(categoryKey, choice.category, choice.subcategory)),
      subcategory_id: choice.subcategory_id,
    })
  }

  return { account_id: accountId, transactions, category_mappings }
}

/**
 * For each bank category pair of a new statement, the subcategory remembered from an earlier
 * import, or null. Same order as `pairs`.
 */
export async function matchSavedMappings(
  accountKey: CryptoKey,
  pairs: { category: string | null; subcategory: string | null }[],
  saved: HashedCategoryMapping[]
): Promise<(string | null)[]> {
  const categoryKey = await deriveHmacKey(accountKey, 'bank-category')
  const remembered = new Map(
    saved.map((m) => [`${m.bank_category_hmac}:${m.bank_subcategory_hmac}`, m.subcategory_id])
  )
  return Promise.all(
    pairs.map(async (pair) => {
      const h = await bankCategoryHmacs(categoryKey, pair.category, pair.subcategory)
      return remembered.get(`${h.bank_category_hmac}:${h.bank_subcategory_hmac}`) ?? null
    })
  )
}
