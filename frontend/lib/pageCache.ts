/**
 * The cache where older service workers kept a copy of every page visited. Private pages are
 * rendered on the server with account data, and pages like /invite/<token> carry a secret in the
 * address, so pages are no longer cached; this name is kept only to delete what is left.
 */
export const PAGES_CACHE = 'home-account-v1-pages'

/** Deletes the leftover page copies. Never throws: without the Cache API there is nothing to do. */
export async function clearPageCache(): Promise<void> {
  try {
    if (typeof caches === 'undefined') return
    await caches.delete(PAGES_CACHE)
  } catch {
    // A browser that refuses storage access has no copies to remove either
  }
}
