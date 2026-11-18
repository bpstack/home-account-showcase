// validators/import-validators.ts

import { z } from 'zod'

// ADR-008: an import carries only ciphertexts and keyed hashes. Strict objects, so a plaintext
// field (description, amount, bank_category…) is rejected instead of silently stored or ignored.

const MAX_TRANSACTIONS = 10000
const MAX_MAPPINGS = 1000
// AES-GCM of a 500-character description is ~2.7k in base64
const MAX_CIPHERTEXT = 4096

const ciphertext = z.base64().min(1).max(MAX_CIPHERTEXT)
// HMAC-SHA-256 as lowercase hex, as the browser sends it
const keyedHash = z.string().regex(/^[0-9a-f]{64}$/, 'Huella no válida')

const encryptedImportTransaction = z.strictObject({
  date: z.iso.date('La fecha debe ser válida (YYYY-MM-DD)'),
  description_encrypted: ciphertext,
  amount_encrypted: ciphertext,
  amount_sign: z.enum(['positive', 'negative', 'zero']),
  bank_category_encrypted: ciphertext.nullable(),
  bank_subcategory_encrypted: ciphertext.nullable(),
  import_hash: keyedHash,
  subcategory_id: z.uuid().nullable(),
})

const hashedCategoryMapping = z.strictObject({
  bank_category_hmac: keyedHash,
  bank_subcategory_hmac: keyedHash,
  subcategory_id: z.uuid(),
})

export const importConfirmSchema = z.strictObject({
  account_id: z.uuid('account_id debe ser un UUID válido'),
  transactions: z
    .array(encryptedImportTransaction)
    .min(1, 'No hay transacciones para importar')
    .max(MAX_TRANSACTIONS, `Como máximo ${MAX_TRANSACTIONS} movimientos por importación`),
  category_mappings: z.array(hashedCategoryMapping).max(MAX_MAPPINGS),
})

export const importHashesQuerySchema = z.object({
  account_id: z.uuid('account_id debe ser un UUID válido'),
})

export type ImportConfirmInput = z.infer<typeof importConfirmSchema>
