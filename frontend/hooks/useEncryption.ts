/**
 * useEncryption - Hook for transparent data encryption/decryption
 *
 * Follows architecture principles:
 * - React Query manages remote data
 * - Encryption happens at the boundary (before send, after receive)
 * - Crypto keys live in memory only (cryptoStore)
 */

import { useCryptoStore } from '@/stores/cryptoStore'
import {
  encrypt,
  decrypt,
  decryptTransactions,
  decryptCategories,
  getAmountSign,
  type EncryptedTransaction,
  type DecryptedTransaction,
  type EncryptedCategory,
  type DecryptedCategory,
} from '@/lib/crypto'

// ============================================
// TYPES
// ============================================

export interface EncryptedTransactionInput {
  account_id: string
  date: string
  description_encrypted: string
  amount_encrypted: string
  amount_sign: 'positive' | 'negative' | 'zero'
  subcategory_id?: string | null
  bank_category_encrypted?: string | null
  bank_subcategory_encrypted?: string | null
}

export interface PlainTransactionInput {
  account_id: string
  date: string
  description: string
  amount: number
  subcategory_id?: string | null
  bank_category?: string | null
  bank_subcategory?: string | null
}

// ============================================
// HOOK
// ============================================

export function useEncryption() {
  const getAccountKey = useCryptoStore((s) => s.getAccountKey)
  const isUnlocked = useCryptoStore((s) => s.isUnlocked)
  const isAccountUnlocked = useCryptoStore((s) => s.isAccountUnlocked)

  /**
   * Encrypt a transaction for sending to backend
   */
  const encryptTransaction = async (
    data: PlainTransactionInput
  ): Promise<EncryptedTransactionInput> => {
    const accountKey = getAccountKey(data.account_id)
    if (!accountKey) {
      throw new Error(`Account ${data.account_id} not unlocked`)
    }

    return {
      account_id: data.account_id,
      date: data.date,
      description_encrypted: await encrypt(data.description, accountKey),
      amount_encrypted: await encrypt(data.amount.toString(), accountKey),
      amount_sign: getAmountSign(data.amount),
      subcategory_id: data.subcategory_id,
      bank_category_encrypted: data.bank_category
        ? await encrypt(data.bank_category, accountKey)
        : null,
      bank_subcategory_encrypted: data.bank_subcategory
        ? await encrypt(data.bank_subcategory, accountKey)
        : null,
    }
  }

  /**
   * Decrypt transactions from backend
   */
  const decryptTransactionsBatch = async (
    accountId: string,
    transactions: EncryptedTransaction[]
  ): Promise<DecryptedTransaction[]> => {
    const accountKey = getAccountKey(accountId)
    if (!accountKey) {
      throw new Error(`Account ${accountId} not unlocked`)
    }

    return decryptTransactions(transactions, accountKey)
  }

  /**
   * Encrypt a single field
   */
  const encryptField = async (accountId: string, value: string): Promise<string> => {
    const accountKey = getAccountKey(accountId)
    if (!accountKey) {
      throw new Error(`Account ${accountId} not unlocked`)
    }
    return encrypt(value, accountKey)
  }

  /**
   * Decrypt a single field
   */
  const decryptField = async (accountId: string, encrypted: string): Promise<string> => {
    const accountKey = getAccountKey(accountId)
    if (!accountKey) {
      throw new Error(`Account ${accountId} not unlocked`)
    }
    return decrypt(encrypted, accountKey)
  }

  /**
   * Encrypt a category name
   */
  const encryptCategoryName = async (accountId: string, name: string): Promise<string> => {
    return encryptField(accountId, name)
  }

  /**
   * Decrypt categories from backend
   */
  const decryptCategoriesBatch = async (
    accountId: string,
    categories: EncryptedCategory[]
  ): Promise<DecryptedCategory[]> => {
    const accountKey = getAccountKey(accountId)
    if (!accountKey) {
      throw new Error(`Account ${accountId} not unlocked`)
    }
    return decryptCategories(categories, accountKey)
  }

  return {
    // State
    isUnlocked,
    isAccountUnlocked,

    // Transaction encryption
    encryptTransaction,
    decryptTransactionsBatch,

    // Category encryption
    encryptCategoryName,
    decryptCategoriesBatch,

    // Generic field encryption
    encryptField,
    decryptField,
  }
}

/**
 * Hook to check if encryption is ready for an account
 */
export function useEncryptionReady(accountId: string | null) {
  const isUnlocked = useCryptoStore((s) => s.isUnlocked)
  const isAccountUnlocked = useCryptoStore((s) => s.isAccountUnlocked)

  if (!accountId) return false
  return isUnlocked && isAccountUnlocked(accountId)
}
