import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Unit tests for pure code (no React, no browser). They run in `pnpm run verify`.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    include: ['lib/**/*.test.ts'],
    environment: 'node',
  },
})
