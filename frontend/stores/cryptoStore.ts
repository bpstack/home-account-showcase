/**
 * Crypto Store - In-memory cryptographic key management
 *
 * SECURITY MODEL (v2 - Memory Only):
 * - All CryptoKeys live exclusively in memory (Zustand store)
 * - User password is NEVER persisted
 * - Password must be re-entered after runtime restart (F5, tab close, crash)
 * - Authentication (cookie) is independent from cryptographic unlock
 *
 * STATE MODEL:
 * - Authenticated + Locked  → valid session, no UserKey
 * - Authenticated + Unlocked → UserKey in memory
 *
 * NOTE:
 * isUnlocked === UserKey present (does NOT imply account data is available)
 */

import { create } from 'zustand'
import {
  deriveUserKey,
  decryptAccountKey,
  encryptAccountKey,
  generateAccountKey,
  encrypt,
  decrypt,
  type DecryptedTransaction,
  type EncryptedTransaction,
  decryptTransactions,
} from '@/lib/crypto'

interface AccountKeyInfo {
  key: CryptoKey
  version: number
}

interface CryptoState {
  userKey: CryptoKey | null
  accountKeys: Map<string, AccountKeyInfo>
  isUnlocked: boolean
  isUnlocking: boolean
  error: string | null
}

interface CryptoActions {
  deriveAndSetUserKey: (_password: string, _salt: string) => Promise<void>
  unlockAccount: (_accountId: string, _encryptedKey: string, _keyVersion: number) => Promise<void>
  unlockAccounts: (
    _accounts: Array<{
      accountId: string
      encryptedKey: string
      keyVersion: number
    }>
  ) => Promise<void>
  createAccountKey: (_accountId: string) => Promise<string>
  getAccountKey: (_accountId: string) => CryptoKey | null
  encryptForAccount: (_accountId: string, _plaintext: string) => Promise<string>
  decryptFromAccount: (_accountId: string, _ciphertext: string) => Promise<string>
  decryptTransactionsForAccount: (
    _accountId: string,
    _transactions: EncryptedTransaction[]
  ) => Promise<DecryptedTransaction[]>
  reEncryptAllKeys: (_newPassword: string, _newSalt: string) => Promise<Map<string, string>>
  lock: () => void
  isAccountUnlocked: (_accountId: string) => boolean
}

type CryptoStore = CryptoState & CryptoActions

export const useCryptoStore = create<CryptoStore>((set, get) => ({
  userKey: null,
  accountKeys: new Map(),
  isUnlocked: false,
  isUnlocking: false,
  error: null,

  deriveAndSetUserKey: async (password: string, salt: string) => {
    set({ isUnlocking: true, error: null })
    try {
      const userKey = await deriveUserKey(password, salt)
      set({ userKey, isUnlocked: true, isUnlocking: false })
    } catch (error) {
      set({ error: 'Error al derivar clave de usuario', isUnlocking: false })
      throw error
    }
  },

  unlockAccount: async (accountId, encryptedKey, keyVersion) => {
    const { userKey, accountKeys } = get()
    if (!userKey) throw new Error('User key not available')
    const accountKey = await decryptAccountKey(encryptedKey, userKey)
    const newAccountKeys = new Map(accountKeys)
    newAccountKeys.set(accountId, { key: accountKey, version: keyVersion })
    set({ accountKeys: newAccountKeys })
  },

  unlockAccounts: async (accounts) => {
    const { userKey } = get()
    if (!userKey) throw new Error('User key not available')
    const newAccountKeys = new Map(get().accountKeys)
    let decryptedCount = 0
    await Promise.all(
      accounts.map(async ({ accountId, encryptedKey, keyVersion }) => {
        try {
          const accountKey = await decryptAccountKey(encryptedKey, userKey)
          newAccountKeys.set(accountId, { key: accountKey, version: keyVersion })
          decryptedCount++
        } catch (e) {
          console.error(`[CryptoStore] Failed to decrypt key for account ${accountId}:`, e)
        }
      })
    )
    set({ accountKeys: newAccountKeys })

    // If we had accounts to unlock but none succeeded, the password was wrong
    if (accounts.length > 0 && decryptedCount === 0) {
      throw new Error('Wrong password')
    }
  },

  createAccountKey: async (accountId) => {
    const { userKey, accountKeys } = get()
    if (!userKey) throw new Error('User key not available')
    const accountKey = await generateAccountKey()
    const encryptedKey = await encryptAccountKey(accountKey, userKey)
    const newAccountKeys = new Map(accountKeys)
    newAccountKeys.set(accountId, { key: accountKey, version: 1 })
    set({ accountKeys: newAccountKeys })
    return encryptedKey
  },

  getAccountKey: (accountId) => get().accountKeys.get(accountId)?.key ?? null,
  encryptForAccount: async (accountId, plaintext) => {
    const accountKey = get().getAccountKey(accountId)
    if (!accountKey) throw new Error('Account not unlocked')
    return encrypt(plaintext, accountKey)
  },
  decryptFromAccount: async (accountId, ciphertext) => {
    const accountKey = get().getAccountKey(accountId)
    if (!accountKey) throw new Error('Account not unlocked')
    return decrypt(ciphertext, accountKey)
  },
  decryptTransactionsForAccount: async (accountId, transactions) => {
    const accountKey = get().getAccountKey(accountId)
    if (!accountKey) throw new Error('Account not unlocked')
    return decryptTransactions(transactions, accountKey)
  },
  reEncryptAllKeys: async (newPassword, newSalt) => {
    const { userKey, accountKeys } = get()
    if (!userKey) {
      throw new Error('Cannot re-encrypt keys while locked')
    }
    const newUserKey = await deriveUserKey(newPassword, newSalt)
    const reEncryptedKeys = new Map<string, string>()
    for (const [accountId, { key: accountKey }] of accountKeys) {
      const encryptedKey = await encryptAccountKey(accountKey, newUserKey)
      reEncryptedKeys.set(accountId, encryptedKey)
    }
    accountKeys.clear()
    set({ userKey: newUserKey, accountKeys: new Map() })
    return reEncryptedKeys
  },
  lock: () => {
    const { accountKeys } = get()
    accountKeys.clear()
    set({ userKey: null, accountKeys: new Map(), isUnlocked: false, error: null })
  },
  isAccountUnlocked: (accountId) => get().accountKeys.has(accountId),
}))

export function useCryptoReady(accountId: string | undefined): boolean {
  const { isUnlocked, accountKeys } = useCryptoStore()
  if (!isUnlocked || !accountId) return false
  return accountKeys.has(accountId)
}

export function useAccountCrypto(accountId: string | undefined) {
  const store = useCryptoStore()
  const encrypt = async (plaintext: string) => {
    if (!accountId) throw new Error('No account selected')
    return store.encryptForAccount(accountId, plaintext)
  }
  const decrypt = async (ciphertext: string) => {
    if (!accountId) throw new Error('No account selected')
    return store.decryptFromAccount(accountId, ciphertext)
  }
  const isReady = accountId ? store.isAccountUnlocked(accountId) : false
  return { encrypt, decrypt, isReady }
}
