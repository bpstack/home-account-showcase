import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import {
  Serwist,
  CacheFirst,
  NetworkOnly,
  CacheableResponsePlugin,
  ExpirationPlugin,
} from 'serwist'
import { PAGES_CACHE } from '../lib/pageCache'

export {}

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
    skipWaiting(): void
  }
}

declare const self: WorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Pages are never stored: private ones carry account data and some addresses carry a token
    // (/invite/<token>, reset links). Offline, the app cannot work anyway. NetworkOnly still uses
    // the navigation preload response
    {
      matcher: ({ request }) => request.mode === 'navigate',
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ request }) =>
        request.destination === 'image' ||
        /\.(png|jpg|jpeg|svg|gif|webp|ico)$/i.test(new URL(request.url).pathname),
      handler: new CacheFirst({
        cacheName: 'home-account-v1-images',
        plugins: [
          new CacheableResponsePlugin({
            statuses: [0, 200],
          }),
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60,
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
    {
      matcher: ({ request }) => request.destination === 'style' || request.destination === 'script',
      handler: new CacheFirst({
        cacheName: 'home-account-v1-static',
        plugins: [
          new CacheableResponsePlugin({
            statuses: [0, 200],
          }),
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 365 * 24 * 60 * 60,
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
    {
      matcher: ({ url }) =>
        url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com',
      handler: new CacheFirst({
        cacheName: 'home-account-v1-fonts',
        plugins: [
          new CacheableResponsePlugin({
            statuses: [0, 200],
          }),
          new ExpirationPlugin({
            maxEntries: 30,
            maxAgeSeconds: 365 * 24 * 60 * 60,
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
  ],
})

serwist.addEventListeners()

type ExtendableEventLike = Event & { waitUntil(_promise: Promise<unknown>): void }
const sw = self as unknown as {
  addEventListener(_type: string, _listener: (_event: Event) => void): void
}

// Removes the page copies that earlier versions of this worker stored
sw.addEventListener('activate', (event: Event) => {
  ;(event as ExtendableEventLike).waitUntil(caches.delete(PAGES_CACHE))
})

sw.addEventListener('message', (_event: Event) => {
  self.skipWaiting()
})
