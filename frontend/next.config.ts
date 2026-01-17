import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      '@tanstack/react-query',
    ],
  },
  // Disable caching in development
  headers: async () => {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/:path*',
          headers: [
            { key: 'Cache-Control', value: 'no-store, must-revalidate' },
          ],
        },
      ]
    }
    return []
  },
}

export default nextConfig
