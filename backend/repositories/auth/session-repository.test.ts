import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({ query: vi.fn() }))
vi.mock('../../config/db.js', () => ({ default: db }))

import { SessionRepository } from './session-repository.js'

const SID = 'sid-1'
const OLD = Buffer.alloc(32, 1)
const NEW = Buffer.alloc(32, 2)
const EXPIRES = new Date('2026-11-22T04:00:00Z')

function row(fields: Partial<{ is_live: number; is_previous_in_grace: number }>) {
  return [
    [{ user_id: 'user-a', expires_at: EXPIRES, is_live: 1, is_previous_in_grace: 0, ...fields }],
  ]
}

beforeEach(() => db.query.mockReset())

// Requirement: one live credential per session. Of two requests with it, one rotates; the other
// is let through only within the grace window; a replaced credential after that ends the session.
describe('SessionRepository.rotate', () => {
  it('rotates when the presented credential is the live one', async () => {
    db.query.mockResolvedValueOnce([{ affectedRows: 1 }]).mockResolvedValueOnce(row({}))

    await expect(SessionRepository.rotate(SID, OLD, NEW, 60)).resolves.toEqual({
      status: 'rotated',
      userId: 'user-a',
      expiresAt: EXPIRES,
    })
    const [sql, params] = db.query.mock.calls[0]
    expect(sql).toContain('current_hash = ? AND revoked_at IS NULL AND expires_at > NOW()')
    expect(params).toEqual([NEW, SID, OLD])
  })

  it('lets the previous credential through within the grace window, without revoking', async () => {
    db.query
      .mockResolvedValueOnce([{ affectedRows: 0 }])
      .mockResolvedValueOnce(row({ is_previous_in_grace: 1 }))

    await expect(SessionRepository.rotate(SID, OLD, NEW, 60)).resolves.toMatchObject({
      status: 'grace',
    })
    expect(db.query).toHaveBeenCalledTimes(2)
    expect(db.query.mock.calls[1][1]).toEqual([OLD, 60, SID])
  })

  it('takes a replaced credential outside the window as reuse and revokes the session', async () => {
    db.query
      .mockResolvedValueOnce([{ affectedRows: 0 }])
      .mockResolvedValueOnce(row({ is_previous_in_grace: 0 }))
      .mockResolvedValueOnce([{ affectedRows: 1 }])

    await expect(SessionRepository.rotate(SID, OLD, NEW, 60)).resolves.toEqual({
      status: 'reuse',
      userId: 'user-a',
    })
    const [sql, params] = db.query.mock.calls[2]
    expect(sql).toContain('SET revoked_at = NOW()')
    expect(params).toEqual([SID])
  })

  it('is invalid for an unknown, revoked or expired session, and revokes nothing', async () => {
    db.query.mockResolvedValueOnce([{ affectedRows: 0 }]).mockResolvedValueOnce([[]])
    await expect(SessionRepository.rotate(SID, OLD, NEW, 60)).resolves.toEqual({
      status: 'invalid',
    })

    db.query
      .mockResolvedValueOnce([{ affectedRows: 0 }])
      .mockResolvedValueOnce(row({ is_live: 0, is_previous_in_grace: 1 }))
    await expect(SessionRepository.rotate(SID, OLD, NEW, 60)).resolves.toEqual({
      status: 'invalid',
    })

    expect(db.query).toHaveBeenCalledTimes(4)
  })
})

describe('SessionRepository.revokeAllForUser', () => {
  it('keeps the given session and ends the rest', async () => {
    db.query.mockResolvedValue([{ affectedRows: 2 }])
    await SessionRepository.revokeAllForUser('user-a', 'sid-keep')
    expect(db.query.mock.calls[0][1]).toEqual(['user-a', 'sid-keep'])
  })
})
