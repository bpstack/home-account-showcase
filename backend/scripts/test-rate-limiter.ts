#!/usr/bin/env npx tsx
// scripts/test-rate-limiter.ts
// Rate limiter tests

import {
  getAIRateLimitStatus,
  getProviderLimits,
} from '../middlewares/aiRateLimiter.js'

console.log('\n' + '='.repeat(60))
console.log('  RATE LIMITER TEST SUITE')
console.log('='.repeat(60) + '\n')

let passed = 0
let failed = 0

// Test 1: Get provider limits
console.log('--- PROVIDER LIMITS ---\n')
const limits = getProviderLimits()

const expectedLimits = {
  ollama: 'unlimited',
  groq: 15,
  claude: 5,
  gemini: 5,
  none: 0,
}

for (const [provider, limit] of Object.entries(expectedLimits)) {
  const actual = limits[provider as keyof typeof limits]
  const ok = actual === limit
  const status = ok ? '✅' : '❌'
  if (ok) passed++
  else failed++
  console.log(`${status} ${provider}: ${actual} (expected: ${limit})`)
}

// Test 2: Rate limit status for anonymous user
console.log('\n--- RATE LIMIT STATUS (anonymous) ---\n')
const statusAnon = getAIRateLimitStatus('anonymous')
console.log(`Provider: ${statusAnon.provider}`)
console.log(`Remaining: ${statusAnon.remaining}`)
console.log(`Max requests: ${statusAnon.maxRequests}`)
console.log(`Is unlimited: ${statusAnon.isUnlimited}`)

// Verify structure
const hasRequiredFields =
  'provider' in statusAnon &&
  'remaining' in statusAnon &&
  'maxRequests' in statusAnon &&
  'isUnlimited' in statusAnon

if (hasRequiredFields) {
  passed++
  console.log('\n✅ Status object has all required fields')
} else {
  failed++
  console.log('\n❌ Status object missing required fields')
}

// Test 3: Rate limit status for specific user
console.log('\n--- RATE LIMIT STATUS (test-user-123) ---\n')
const statusUser = getAIRateLimitStatus('test-user-123')
console.log(`Provider: ${statusUser.provider}`)
console.log(`Remaining: ${statusUser.remaining}`)
console.log(`Reset time: ${statusUser.resetTime}`)

passed++ // Just verify it doesn't crash
console.log('\n✅ User rate limit status retrieved successfully')

// Summary
console.log('\n' + '='.repeat(60))
console.log(`  RESULTS: ${passed} passed, ${failed} failed`)
console.log('='.repeat(60) + '\n')

if (failed > 0) {
  console.log('⚠️  Some tests failed.\n')
  process.exit(1)
} else {
  console.log('✅ All rate limiter tests passed!\n')
  process.exit(0)
}
