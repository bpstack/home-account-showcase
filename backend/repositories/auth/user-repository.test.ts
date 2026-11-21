import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const connection = {
    query: vi.fn(),
    beginTransaction: vi.fn(async () => undefined),
    commit: vi.fn(async () => undefined),
    rollback: vi.fn(async () => undefined),
    release: vi.fn(),
  }
  return {
    connection,
    db: {
      query: vi.fn(),
      getConnection: vi.fn(async () => connection),
    },
  }
})

vi.mock('../../config/db.js', () => ({ default: mocks.db }))
vi.mock('../../config/config.js', () => ({ SALT_ROUNDS: 4 }))

import { UserRepository } from './user-repository.js'

const USER_ID = 'user-a'
const VERIFIER = Buffer.alloc(32, 0x11)

beforeEach(() => {
  vi.clearAllMocks()
  mocks.connection.query.mockReset()
  mocks.db.query.mockReset()
})

function selectRow(row: object) {
  mocks.connection.query.mockResolvedValueOnce([[row]])
}

describe('attemptPinUnlock', () => {
  it('locks the row and commits a v1 result without comparing', async () => {
    selectRow({ pin_verifier: null })
    const matches = vi.fn()

    await expect(UserRepository.attemptPinUnlock(USER_ID, matches)).resolves.toEqual({
      status: 'not-v2',
    })

    expect(mocks.connection.query).toHaveBeenCalledOnce()
    expect(mocks.connection.query.mock.calls[0][0]).toContain('FOR UPDATE')
    expect(matches).not.toHaveBeenCalled()
    expect(mocks.connection.commit).toHaveBeenCalledOnce()
    expect(mocks.connection.rollback).not.toHaveBeenCalled()
    expect(mocks.connection.release).toHaveBeenCalledOnce()
  })

  it('does not compare while locked and does not increment attempts', async () => {
    selectRow({
      pin_verifier: VERIFIER,
      pin_attempts: 5,
      pin_locked_until: new Date(Date.now() + 10 * 60 * 1000),
    })
    const matches = vi.fn()

    const result = await UserRepository.attemptPinUnlock(USER_ID, matches)

    expect(result).toEqual({ status: 'locked', minutes: 10 })
    expect(matches).not.toHaveBeenCalled()
    expect(mocks.connection.query).toHaveBeenCalledOnce()
    expect(mocks.connection.commit).toHaveBeenCalledOnce()
    expect(mocks.connection.release).toHaveBeenCalledOnce()
  })

  it('returns 4, 3, 2, 1 and 0 remaining over five failures', async () => {
    for (let previousAttempts = 0; previousAttempts < 5; previousAttempts++) {
      mocks.connection.query.mockReset()
      selectRow({
        pin_verifier: VERIFIER,
        pin_attempts: previousAttempts,
        pin_locked_until: null,
      })

      const result = await UserRepository.attemptPinUnlock(USER_ID, () => false)

      expect(result).toEqual({ status: 'invalid', remaining: 4 - previousAttempts })
      expect(mocks.connection.query).toHaveBeenCalledTimes(2)
      const update = mocks.connection.query.mock.calls[1][0] as string
      expect(update).toContain('pin_attempts = pin_attempts + 1')
      expect(update).toContain('IF(pin_attempts >= 5')
      expect(update).not.toContain('IF(pin_attempts + 1 >= 5')
      expect(update).toContain('INTERVAL 30 MINUTE')
    }
  })

  it('locks again after an expired lock without resetting the counter first', async () => {
    selectRow({
      pin_verifier: VERIFIER,
      pin_attempts: 5,
      pin_locked_until: new Date(Date.now() - 1000),
    })

    await expect(UserRepository.attemptPinUnlock(USER_ID, () => false)).resolves.toEqual({
      status: 'invalid',
      remaining: 0,
    })

    const update = mocks.connection.query.mock.calls[1][0] as string
    expect(update).toContain('pin_attempts = pin_attempts + 1')
    expect(update).toContain('IF(pin_attempts >= 5')
    expect(update).not.toContain('pin_attempts = 0')
  })

  it('resets attempts after a success and returns the sealed data', async () => {
    selectRow({
      pin_verifier: VERIFIER,
      pin_wrapped_key: 'server-sealed',
      pin_attempts: 3,
      pin_locked_until: null,
      verification_blob: 'verification',
    })

    await expect(UserRepository.attemptPinUnlock(USER_ID, () => true)).resolves.toEqual({
      status: 'success',
      sealedWrappedKey: 'server-sealed',
      verificationBlob: 'verification',
    })

    const update = mocks.connection.query.mock.calls[1][0] as string
    expect(update).toContain('pin_attempts = 0')
    expect(update).toContain('pin_locked_until = NULL')
    expect(mocks.connection.commit).toHaveBeenCalledOnce()
  })

  it('rolls back and releases the connection when comparison fails', async () => {
    selectRow({ pin_verifier: VERIFIER, pin_locked_until: null })

    await expect(
      UserRepository.attemptPinUnlock(USER_ID, () => {
        throw new Error('comparison failed')
      })
    ).rejects.toThrow('comparison failed')

    expect(mocks.connection.rollback).toHaveBeenCalledOnce()
    expect(mocks.connection.commit).not.toHaveBeenCalled()
    expect(mocks.connection.release).toHaveBeenCalledOnce()
  })
})

describe('setPinV2', () => {
  it('writes verifier and wrapping in one statement without touching other encrypted data', async () => {
    mocks.db.query.mockResolvedValueOnce([{ affectedRows: 1 }])

    await UserRepository.setPinV2(USER_ID, {
      keySalt: 'new-salt',
      pinVerifier: VERIFIER,
      sealedWrappedKey: 'server-sealed',
    })

    expect(mocks.db.query).toHaveBeenCalledOnce()
    const [sql, params] = mocks.db.query.mock.calls[0]
    expect(sql).toContain('key_salt = ?, pin_verifier = ?, pin_wrapped_key = ?')
    expect(sql).toContain('pin_attempts = 0, pin_locked_until = NULL')
    expect(sql).not.toContain('account_keys')
    expect(sql).not.toContain('recovery_blob')
    expect(params).toEqual(['new-salt', VERIFIER, 'server-sealed', null, USER_ID])
  })
})

describe('isPinV2', () => {
  it('derives the version from a non-null verifier', async () => {
    mocks.db.query.mockResolvedValueOnce([[{ pin_verifier: VERIFIER }]])
    await expect(UserRepository.isPinV2(USER_ID)).resolves.toBe(true)

    mocks.db.query.mockResolvedValueOnce([[{ pin_verifier: null }]])
    await expect(UserRepository.isPinV2(USER_ID)).resolves.toBe(false)
  })
})
