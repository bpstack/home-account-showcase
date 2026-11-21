import { describe, expect, it } from 'vitest'
import { createKeyVault, MAX_AGE_MS, type VaultEntry } from './keyVault'

/**
 * In-memory store for testing. Implements the minimal KeyVaultStore interface.
 */
function makeMapStore() {
  const map = new Map<string, VaultEntry>()

  return {
    async get() {
      return map.get('current')
    },
    async put(entry: VaultEntry) {
      map.set('current', entry)
    },
    async delete() {
      map.delete('current')
    },
  }
}

/**
 * Helper to create a non-extractable CryptoKey for testing.
 */
async function createTestKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

/**
 * Helper to create an extractable CryptoKey for testing.
 */
async function createExtractableKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
}

describe('keyVault', () => {
  it('save and load with the same userId within deadline returns the key', async () => {
    const store = makeMapStore()
    const vault = createKeyVault(store)
    const key = await createTestKey()
    const userId = 'user-123'

    await vault.saveUserKey(userId, key)
    const loaded = await vault.loadUserKey(userId)

    expect(loaded).toBe(key)
  })

  it('expired entry returns null and deletes it', async () => {
    const store = makeMapStore()
    const vault = createKeyVault(store)
    const key = await createTestKey()
    const userId = 'user-123'

    await vault.saveUserKey(userId, key)

    // Simulate time passing beyond MAX_AGE_MS
    const futureNow = Date.now() + MAX_AGE_MS + 1
    const loaded = await vault.loadUserKey(userId, futureNow)

    expect(loaded).toBeNull()

    // Second load should also return null (entry was deleted)
    const loadedAgain = await vault.loadUserKey(userId, futureNow)
    expect(loadedAgain).toBeNull()
  })

  it('different userId returns null and deletes the entry', async () => {
    const store = makeMapStore()
    const vault = createKeyVault(store)
    const key = await createTestKey()
    const userId1 = 'user-123'
    const userId2 = 'user-456'

    await vault.saveUserKey(userId1, key)

    // Try to load with a different userId
    const loaded = await vault.loadUserKey(userId2)
    expect(loaded).toBeNull()

    // Try to load with the original userId (should also be null because it was deleted)
    const loadedOriginal = await vault.loadUserKey(userId1)
    expect(loadedOriginal).toBeNull()
  })

  it('extractable key is not saved', async () => {
    const store = makeMapStore()
    const vault = createKeyVault(store)
    const extractableKey = await createExtractableKey()
    const userId = 'user-123'

    await vault.saveUserKey(userId, extractableKey)

    // Load should return null because the key was not saved
    const loaded = await vault.loadUserKey(userId)
    expect(loaded).toBeNull()
  })

  it('null store: load returns null and nothing throws', async () => {
    const vault = createKeyVault(null)
    const key = await createTestKey()
    const userId = 'user-123'

    // Save should be a no-op
    await vault.saveUserKey(userId, key)

    // Load should return null
    const loaded = await vault.loadUserKey(userId)
    expect(loaded).toBeNull()

    // Clear should be a no-op
    await vault.clearUserKey()
  })

  it('clearUserKey removes the entry', async () => {
    const store = makeMapStore()
    const vault = createKeyVault(store)
    const key = await createTestKey()
    const userId = 'user-123'

    await vault.saveUserKey(userId, key)
    await vault.clearUserKey()

    const loaded = await vault.loadUserKey(userId)
    expect(loaded).toBeNull()
  })
})
