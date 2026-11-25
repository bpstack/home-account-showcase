import { beforeEach, describe, expect, it, vi } from 'vitest'

// The browser's cookies, as the private server pages see them
const jar = vi.hoisted(() => ({ cookies: {} as Record<string, string> }))
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (name in jar.cookies ? { name, value: jar.cookies[name] } : undefined),
  }),
}))

import { hasSession } from './serverApi'

beforeEach(() => {
  jar.cookies = {}
})

describe('whether a private page may render or must send the user to /login', () => {
  it('renders after the 15-minute access cookie has gone, while the refresh one is alive', async () => {
    jar.cookies = { refreshToken: 'refresh' }
    await expect(hasSession()).resolves.toBe(true)
  })

  it('renders with a live access cookie', async () => {
    jar.cookies = { accessToken: 'access', refreshToken: 'refresh' }
    await expect(hasSession()).resolves.toBe(true)
  })

  it('sends to /login when neither cookie is left', async () => {
    jar.cookies = { selectedAccountId: 'account-1' }
    await expect(hasSession()).resolves.toBe(false)
  })
})
