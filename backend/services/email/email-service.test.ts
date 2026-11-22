import { describe, expect, it, vi } from 'vitest'

vi.mock('@emailjs/nodejs', () => ({ default: { send: vi.fn() } }))

import { describeEmailError } from './email-service.js'

// Requirement: when EmailJS refuses a send, the log says why (its status and text), not
// "[object Object]".
describe('describeEmailError', () => {
  it("shows EmailJS's status and reason", () => {
    const out = describeEmailError({ status: 412, text: 'Gmail_API: Invalid grant' })
    expect(out).toContain('412')
    expect(out).toContain('Gmail_API: Invalid grant')
  })

  it('keeps the message of any other error', () => {
    expect(describeEmailError(new Error('socket hang up'))).toContain('socket hang up')
  })
})
