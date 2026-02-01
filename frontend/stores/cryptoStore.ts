/**
 * Crypto Store - Manages encryption keys in memory
 *
 * SECURITY:
 * - CryptoKeys are stored in memory (Zustand store)
 * - Password is stored in sessionStorage for page refresh recovery
 * - sessionStorage is cleared on browser close and logout
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

const SESSION_STORAGE_KEY = '_cp'

function savePasswordToSession(password: string): void {
  if (typeof window !== 'undefined') {
    try { sessionStorage.setItem(SESSION_STORAGE_KEY, btoa(password)) } catch (e) { console.error(e) }
  }
}

function getPasswordFromSession(): string | null {
  if (typeof window !== 'undefined') {
    try {
      const encoded = sessionStorage.getItem(SESSION_STORAGE_KEY)
      return encoded ? atob(encoded) : null
    } catch (e) { return null }
  }
  return null
}

function clearPasswordFromSession(): void {
  if (typeof window !== 'undefined') {
    try { sessionStorage.removeItem(SESSION_STORAGE_KEY) } catch (e) { console.error(e) }
  }
}

interface AccountKeyInfo { key: CryptoKey; version: number }

interface CryptoState {
  userKey: CryptoKey | null
  accountKeys: Map<string, AccountKeyInfo>
  isUnlocked: boolean
  isUnlocking: boolean
  error: string | null
}

interface CryptoActions {
  deriveAndSetUserKey: (password: string, salt: string) => Promise<void>
  getStoredPassword: () => string | null
  unlockAccount: (accountId: string, encryptedKey: string, keyVersion: number) => Promise<void>
  unlockAccounts: (accounts: Array<{ accountId: string; encryptedKey: string; keyVersion: number }>) => Promise<void>
  createAccountKey: (accountId: string) => Promise<string>
  getAccountKey: (accountId: string) => CryptoKey | null
  encryptForAccount: (accountId: string, plaintext: string) => Promise<string>
  decryptFromAccount: (accountId: string, ciphertext: string) => Promise<string>
  decryptTransactionsForAccount: (accountId: string, transactions: EncryptedTransaction[]) => Promise<DecryptedTransaction[]>
  reEncryptAllKeys: (newPassword: string, newSalt: string) => Promise<Map<string, string>>
  lock: () => void
  isAccountUnlocked: (accountId: string) => boolean
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
      savePasswordToSession(password)
      set({ userKey, isUnlocked: true, isUnlocking: false })
    } catch (error) {
      set({ error: 'Error al derivar clave de usuario', isUnlocking: false })
      throw error
    }
  },

  getStoredPassword: () => getPasswordFromSession(),

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
    await Promise.all(accounts.map(async ({ accountId, encryptedKey, keyVersion }) => {
      try {
        const accountKey = await decryptAccountKey(encryptedKey, userKey)
        newAccountKeys.set(accountId, { key: accountKey, version: keyVersion })
      } catch (e) { console.error(e) }
    }))
    set({ accountKeys: newAccountKeys })
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
    const { accountKeys } = get()
    const newUserKey = await deriveUserKey(newPassword, newSalt)
    const reEncryptedKeys = new Map<string, string>()
    for (const [accountId, { key: accountKey }] of accountKeys) {
      const encryptedKey = await encryptAccountKey(accountKey, newUserKey)
      reEncryptedKeys.set(accountId, encryptedKey)
    }
    savePasswordToSession(newPassword)
    set({ userKey: newUserKey })
    return reEncryptedKeys
  },
  lock: () => {
    clearPasswordFromSession()
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
