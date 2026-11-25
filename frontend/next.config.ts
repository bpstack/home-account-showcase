import type { NextConfig } from 'next'
import { withSerwist } from '@serwist/turbopack'

// The service worker is built from `app/sw.ts` and served by the route handler in
// `app/serwist/[path]/route.ts`, at `/serwist/sw.js`.

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', '@tanstack/react-query'],
  },
  headers: async () => {
    // Only this site may show its pages inside a frame: another site could otherwise lay the app,
    // invisible, over its own buttons (clickjacking). `frame-ancestors` is the current form;
    // `X-Frame-Options` covers browsers that do not read it.
    const frameHeaders = [
      { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    ]
    // Disable caching in development
    const devHeaders =
      process.env.NODE_ENV === 'development'
        ? [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }]
        : []
    return [{ source: '/:path*', headers: [...frameHeaders, ...devHeaders] }]
  },
}

export default withSerwist(nextConfig)
