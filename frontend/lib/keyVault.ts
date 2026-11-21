/**
 * Key Vault - Persistent storage for the UserKey (CryptoKey) in IndexedDB.
 *
 * SECURITY MODEL:
 * - Only the UserKey is stored (non-extractable CryptoKey).
 * - Account keys are NOT stored (they remain exportable and are re-decrypted from the server).
 * - IndexedDB stores CryptoKey via structured clone: the browser can use it, but no script can
 *   read its bytes.
 * - Never localStorage or sessionStorage for keys.
 *
 * DESIGN:
 * - Logic is separated from storage: functions receive a minimal store interface.
 * - In the app, that store is IndexedDB; in tests, a Map.
 * - The IndexedDB adapter is ~20 lines and covered by manual testing.
 */

// ============================================
// TYPES
// ============================================

export interface VaultEntry {
  userId: string
  key: CryptoKey
  savedAt: number
}

interface KeyVaultStore {
  get(): Promise<VaultEntry | undefined>
  put(entry: VaultEntry): Promise<void>
  delete(): Promise<void>
}

// ============================================
// CONSTANTS
// ============================================

/** 30 days in milliseconds. Exported for testing. */
export const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

// ============================================
// LOGIC (testable with any store)
// ============================================

/**
 * Creates a key vault with the given store.
 * In the app, the store is IndexedDB; in tests, a Map.
 * If store is null (e.g., IndexedDB not supported), all operations are no-ops.
 */
export function createKeyVault(store: KeyVaultStore | null) {
  /**
   * Save the UserKey for a user.
   * If the key is extractable, refuse to save (defense-in-depth).
   */
  async function saveUserKey(userId: string, key: CryptoKey): Promise<void> {
    if (!store) return
    if (key.extractable) return // Never persist an extractable key
    await store.put({ userId, key, savedAt: Date.now() })
  }

  /**
   * Load the UserKey for a user.
   * Returns null if:
   * - No entry exists
   * - userId doesn't match (different user on same browser)
   * - Entry is older than MAX_AGE_MS
   * In the last two cases, the entry is deleted.
   */
  async function loadUserKey(userId: string, now = Date.now()): Promise<CryptoKey | null> {
    if (!store) return null
    const entry = await store.get()
    if (!entry) return null

    if (entry.userId !== userId || now - entry.savedAt > MAX_AGE_MS) {
      await store.delete()
      return null
    }

    return entry.key
  }

  /**
   * Clear the stored UserKey.
   */
  async function clearUserKey(): Promise<void> {
    if (!store) return
    await store.delete()
  }

  return { saveUserKey, loadUserKey, clearUserKey }
}

// ============================================
// INDEXEDDB ADAPTER
// ============================================

const DB_NAME = 'hac-key-vault'
const DB_VERSION = 1
const STORE_NAME = 'keys'
const ENTRY_KEY = 'current'

function makeIndexedDBStore(): KeyVaultStore | null {
  if (typeof indexedDB === 'undefined') return null

  function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  return {
    async get() {
      try {
        const db = await openDB()
        return await new Promise<VaultEntry | undefined>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readonly')
          const store = tx.objectStore(STORE_NAME)
          const request = store.get(ENTRY_KEY)
          request.onsuccess = () => resolve(request.result as VaultEntry | undefined)
          request.onerror = () => reject(request.error)
          tx.oncomplete = () => db.close()
        })
      } catch {
        return undefined
      }
    },

    async put(entry: VaultEntry) {
      try {
        const db = await openDB()
        await new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite')
          const store = tx.objectStore(STORE_NAME)
          const request = store.put(entry, ENTRY_KEY)
          request.onsuccess = () => resolve(undefined)
          request.onerror = () => reject(request.error)
          tx.oncomplete = () => db.close()
        })
      } catch {
        // Ignore errors (e.g., incognito, blocked)
      }
    },

    async delete() {
      try {
        const db = await openDB()
        await new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite')
          const store = tx.objectStore(STORE_NAME)
          const request = store.delete(ENTRY_KEY)
          request.onsuccess = () => resolve(undefined)
          request.onerror = () => reject(request.error)
          tx.oncomplete = () => db.close()
        })
      } catch {
        // Ignore errors
      }
    },
  }
}

// ============================================
// DEFAULT EXPORTS (for app usage)
// ============================================

const defaultStore = makeIndexedDBStore()
const defaultVault = createKeyVault(defaultStore)

export const saveUserKey = defaultVault.saveUserKey
export const loadUserKey = defaultVault.loadUserKey
export const clearUserKey = defaultVault.clearUserKey
