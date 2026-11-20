import { createSerwistRoute } from '@serwist/turbopack'

// Builds `app/sw.ts` with esbuild and serves it at `/serwist/sw.js`, with the
// `Service-Worker-Allowed: /` header so it can control the whole site.
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute(
  {
    swSrc: 'app/sw.ts',
    useNativeEsbuild: true,
  }
)
