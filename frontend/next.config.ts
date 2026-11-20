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
  // Disable caching in development
  headers: async () => {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/:path*',
          headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
        },
      ]
    }
    return []
  },
}

export default withSerwist(nextConfig)
