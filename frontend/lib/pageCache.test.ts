import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearPageCache, PAGES_CACHE } from './pageCache'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('clearPageCache', () => {
  it('deletes the cache where the old service worker kept page copies', async () => {
    const del = vi.fn().mockResolvedValue(true)
    vi.stubGlobal('caches', { delete: del })
    await clearPageCache()
    expect(del).toHaveBeenCalledWith('home-account-v1-pages')
    expect(PAGES_CACHE).toBe('home-account-v1-pages')
  })

  it('does nothing, without failing, where the browser has no Cache API', async () => {
    vi.stubGlobal('caches', undefined)
    await expect(clearPageCache()).resolves.toBeUndefined()
  })

  it('does not fail the logout when the browser refuses storage access', async () => {
    vi.stubGlobal('caches', { delete: vi.fn().mockRejectedValue(new Error('SecurityError')) })
    await expect(clearPageCache()).resolves.toBeUndefined()
  })
})
