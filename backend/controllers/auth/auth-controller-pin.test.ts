import { createHash } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PinUnlockResult } from '../../repositories/auth/user-repository.js'

const USER_ID = 'user-a'
const GOOD_AUTH_KEY = '11'.repeat(32)
const WRAPPED = Buffer.alloc(60, 0x5a).toString('base64')

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
    repo: {
      attemptPinUnlock: vi.fn(),
      setPinV2: vi.fn(),
      isPinV2: vi.fn(),
      changePin: vi.fn(),
      changePassword: vi.fn(),
      recordFailedPinAttempt: vi.fn(),
      resetPinAttempts: vi.fn(),
    },
    accounts: { getByUserId: vi.fn() },
    pin: {
      computeVerifier: vi.fn(),
      verifiersMatch: vi.fn(),
      sealWrappedKey: vi.fn(),
      openWrappedKey: vi.fn(),
    },
    db: { query: vi.fn(), getConnection: vi.fn() },
    sessions: { revoke: vi.fn(), revokeAllForUser: vi.fn() },
  }
})

vi.mock('../../config/config.js', () => ({
  SALT_ROUNDS: 4,
  SECRET_JWT_KEY: 'test-secret',
  PIN_SERVER_KEY: Buffer.alloc(32, 1),
}))
vi.mock('../../config/db.js', () => ({ default: mocks.db }))
vi.mock('../../repositories/auth/user-repository.js', () => ({ UserRepository: mocks.repo }))
vi.mock('../../repositories/crypto/account-key-repository.js', () => ({
  AccountKeyRepository: mocks.accounts,
}))
vi.mock('../../services/auth/pinService.js', () => mocks.pin)
vi.mock('../../repositories/auth/session-repository.js', () => ({
  SessionRepository: mocks.sessions,
}))
vi.mock('../../services/email/email-service.js', () => ({ sendPasswordResetEmail: vi.fn() }))
vi.mock('./email-verification-controller.js', () => ({ sendVerificationTokenEmail: vi.fn() }))

import {
  changePassword,
  changePin,
  getKeys,
  getResetInfo,
  recoverWithBip39,
  recordFailedPin,
  resetPassword,
  resetPinAttempts,
  setPin,
  unlock,
} from './auth-controller.js'

type Outcome = {
  status?: number
  body?: any
  error?: { statusCode?: number; message: string }
}
type Handler = (req: Request, res: Response, next: NextFunction) => void

function run(handler: Handler, body: object = {}, query: object = {}): Promise<Outcome> {
  return new Promise((resolve) => {
    let code: number | undefined
    const res = {
      status(c: number) {
        code = c
        return this
      },
      json(payload: unknown) {
        resolve({ status: code ?? 200, body: payload })
        return this
      },
      cookie() {
        return this
      },
      clearCookie() {
        return this
      },
    }
    const req = { body, user: { id: USER_ID, sid: 'sid-current' }, query, cookies: {} }
    handler(req as unknown as Request, res as unknown as Response, (error?: unknown) =>
      resolve({ error: error as Outcome['error'] })
    )
  })
}

const state = {
  pinVerifier: Buffer.from(GOOD_AUTH_KEY, 'hex') as Buffer | null,
  attempts: 0,
  lockedUntil: null as Date | null,
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.db.query.mockReset()
  mocks.db.getConnection.mockReset()
  mocks.connection.query.mockReset()
  mocks.db.getConnection.mockResolvedValue(mocks.connection)
  state.pinVerifier = Buffer.from(GOOD_AUTH_KEY, 'hex')
  state.attempts = 0
  state.lockedUntil = null

  mocks.pin.computeVerifier.mockImplementation((_userId: string, authKey: Buffer) =>
    Buffer.from(authKey)
  )
  mocks.pin.verifiersMatch.mockImplementation((a: Buffer, b: Buffer) => a.equals(b))
  mocks.pin.sealWrappedKey.mockReturnValue('server-sealed')
  mocks.pin.openWrappedKey.mockReturnValue('client-wrapped')
  mocks.accounts.getByUserId.mockResolvedValue([{ account_id: 'account-a' }])
  mocks.repo.isPinV2.mockResolvedValue(true)

  mocks.repo.attemptPinUnlock.mockImplementation(
    async (_userId: string, matches: (stored: Buffer) => boolean): Promise<PinUnlockResult> => {
      if (!state.pinVerifier) return { status: 'not-v2' }
      if (state.lockedUntil && state.lockedUntil > new Date()) {
        const minutes = Math.ceil((state.lockedUntil.getTime() - Date.now()) / 60000)
        return { status: 'locked', minutes }
      }
      if (!matches(state.pinVerifier)) {
        state.attempts++
        if (state.attempts >= 5) {
          state.lockedUntil = new Date(Date.now() + 30 * 60 * 1000)
        }
        return { status: 'invalid', remaining: Math.max(0, 5 - state.attempts) }
      }
      state.attempts = 0
      state.lockedUntil = null
      return {
        status: 'success',
        sealedWrappedKey: 'server-sealed',
        verificationBlob: 'verification',
      }
    }
  )
})

describe('unlock', () => {
  it('returns five 422 responses, then 423 without comparing the correct PIN', async () => {
    for (let attempt = 1; attempt <= 5; attempt++) {
      const out = await run(unlock, { authKey: '22'.repeat(32) })
      expect(out.status).toBe(422)
      expect(out.status).not.toBe(401)
      expect(out.body).toEqual({ code: 'PIN_INVALID', remaining: 5 - attempt })
    }

    expect(mocks.pin.verifiersMatch).toHaveBeenCalledTimes(5)
    const sixth = await run(unlock, { authKey: GOOD_AUTH_KEY })

    expect(sixth.status).toBe(423)
    expect(sixth.body).toEqual({ code: 'PIN_LOCKED', minutes: 30 })
    expect(mocks.pin.verifiersMatch).toHaveBeenCalledTimes(5)
    expect(mocks.pin.openWrappedKey).not.toHaveBeenCalled()
    expect(mocks.accounts.getByUserId).not.toHaveBeenCalled()
  })

  it('releases the wrapping and resets attempts after a success', async () => {
    state.attempts = 3

    const out = await run(unlock, { authKey: GOOD_AUTH_KEY })

    expect(out.status).toBe(200)
    expect(out.body).toEqual({
      wrappedUserKey: 'client-wrapped',
      encrypted_keys: [{ account_id: 'account-a' }],
      verification_blob: 'verification',
    })
    expect(state.attempts).toBe(0)
    expect(mocks.pin.openWrappedKey).toHaveBeenCalledWith(USER_ID, 'server-sealed')
  })

  it('returns 409 for a v1 user', async () => {
    state.pinVerifier = null
    const out = await run(unlock, { authKey: GOOD_AUTH_KEY })
    expect(out.status).toBe(409)
    expect(out.body).toEqual({ code: 'PIN_NOT_V2' })
  })

  it('rejects malformed authKey before consulting the repository', async () => {
    const out = await run(unlock, { authKey: 'xyz' })
    expect(out.error?.statusCode).toBe(400)
    expect(mocks.repo.attemptPinUnlock).not.toHaveBeenCalled()
  })
})

describe('setPin', () => {
  it('stores the verifier and sealed wrapping together', async () => {
    const out = await run(setPin, {
      newKeySalt: 'ab'.repeat(32),
      authKey: GOOD_AUTH_KEY,
      wrappedUserKey: WRAPPED,
      verificationBlob: 'new-verification',
    })

    expect(out.status).toBe(200)
    expect(out.body).toEqual({ success: true })
    expect(mocks.pin.sealWrappedKey).toHaveBeenCalledWith(USER_ID, WRAPPED)
    expect(mocks.repo.setPinV2).toHaveBeenCalledWith(USER_ID, {
      keySalt: 'ab'.repeat(32),
      pinVerifier: expect.any(Buffer),
      sealedWrappedKey: 'server-sealed',
      verificationBlob: 'new-verification',
    })
  })

  it('rejects an oversized verification blob', async () => {
    const out = await run(setPin, {
      newKeySalt: 'ab'.repeat(32),
      authKey: GOOD_AUTH_KEY,
      wrappedUserKey: WRAPPED,
      verificationBlob: 'A'.repeat(257),
    })
    expect(out.error?.statusCode).toBe(400)
    expect(mocks.repo.setPinV2).not.toHaveBeenCalled()
  })

  it('rejects a wrapping that is not 60 base64-encoded bytes', async () => {
    const out = await run(setPin, {
      newKeySalt: 'ab'.repeat(32),
      authKey: GOOD_AUTH_KEY,
      wrappedUserKey: 'short',
    })
    expect(out.error?.statusCode).toBe(400)
    expect(mocks.repo.setPinV2).not.toHaveBeenCalled()
  })
})

describe('v1-only endpoints', () => {
  it.each([
    ['changePin', changePin],
    ['recoverWithBip39', recoverWithBip39],
    ['recordFailedPin', recordFailedPin],
    ['resetPinAttempts', resetPinAttempts],
  ])('%s returns 409 for a v2 user without writing', async (_name, handler) => {
    const out = await run(handler)
    expect(out.status).toBe(409)
    expect(out.body).toEqual({ code: 'PIN_V2' })
    expect(mocks.repo.changePin).not.toHaveBeenCalled()
    expect(mocks.repo.recordFailedPinAttempt).not.toHaveBeenCalled()
    expect(mocks.repo.resetPinAttempts).not.toHaveBeenCalled()
    expect(mocks.db.getConnection).not.toHaveBeenCalled()
  })
})

describe('recoverWithBip39', () => {
  it('writes nothing to the account keys if the user moved to PIN v2 after the check', async () => {
    mocks.repo.isPinV2.mockResolvedValue(false)
    mocks.connection.query.mockResolvedValue([{ affectedRows: 0 }])

    const out = await run(recoverWithBip39, {
      newKeySalt: 'ab'.repeat(32),
      verificationBlob: 'verification',
      recoveryBlob: 'recovery',
      reEncryptedKeys: [{ accountId: 'account-a', encryptedKey: 'key' }],
    })

    expect(out.error?.statusCode).toBe(409)
    expect(mocks.connection.query).toHaveBeenCalledOnce()
    expect(mocks.connection.query.mock.calls[0][0]).toContain('pin_verifier IS NULL')
    expect(mocks.connection.commit).not.toHaveBeenCalled()
    expect(mocks.connection.rollback).toHaveBeenCalledOnce()
  })
})

describe('getKeys', () => {
  it('returns pin_v2 without exposing internal PIN columns', async () => {
    mocks.db.query.mockResolvedValueOnce([
      [
        {
          key_salt: 'salt',
          verification_blob: 'verification',
          bip39_verified: true,
          pin_verifier: Buffer.alloc(32),
        },
      ],
    ])

    const out = await run(getKeys)

    expect(out.status).toBe(200)
    expect(out.body.pin_v2).toBe(true)
    expect(out.body).not.toHaveProperty('pin_verifier')
    expect(out.body).not.toHaveProperty('pin_wrapped_key')
  })
})

const RESET_TOKEN = 'reset-token'
const RESET_HASH = createHash('sha256').update(RESET_TOKEN).digest('hex')

function resetRow(pinVerifier: Buffer | null) {
  return {
    id: USER_ID,
    reset_token_hash: RESET_HASH,
    reset_token_expires: new Date(Date.now() + 60 * 60 * 1000),
    key_salt: 'old-salt',
    recovery_blob: 'old-recovery',
    recovery_salt: 'old-recovery-salt',
    pin_verifier: pinVerifier,
  }
}

const resetFields = {
  email: 'user@example.com',
  token: RESET_TOKEN,
  newPassword: 'new-password-1',
  newKeySalt: 'attacker-salt',
  newVerificationBlob: 'attacker-verification',
  reEncryptedKeys: [{ accountId: 'account-a', encryptedKey: 'attacker-key' }],
  newRecoveryBlob: 'attacker-recovery',
  clearAccountKeys: true,
}

describe('getResetInfo', () => {
  it('returns pin_v2 without exposing the verifier or sealed wrapping', async () => {
    mocks.db.query.mockResolvedValueOnce([[resetRow(Buffer.alloc(32))]])

    const out = await run(getResetInfo, {}, { email: 'user@example.com', token: RESET_TOKEN })

    expect(out.status).toBe(200)
    expect(out.body.pin_v2).toBe(true)
    expect(out.body).not.toHaveProperty('pin_verifier')
    expect(out.body).not.toHaveProperty('pin_wrapped_key')
  })
})

describe('resetPassword', () => {
  it('ignores every cryptographic field when the locked row is PIN v2, even if set meanwhile', async () => {
    // The first read (token check) still sees a v1 user; the PIN is set before the write
    mocks.db.query.mockResolvedValueOnce([[resetRow(null)]])
    mocks.connection.query.mockResolvedValueOnce([[{ pin_verifier: Buffer.alloc(32) }]])
    mocks.connection.query.mockResolvedValue([{ affectedRows: 1 }])

    const out = await run(resetPassword, resetFields)

    expect(out.status).toBe(200)
    expect(mocks.connection.query).toHaveBeenCalledTimes(2)
    expect(mocks.connection.query.mock.calls[0][0]).toContain('FOR UPDATE')
    const [sql, params] = mocks.connection.query.mock.calls[1]
    expect(sql).toContain('password_hash = ?')
    expect(sql).toContain('reset_token_hash = NULL')
    expect(sql).toContain('reset_token_expires = NULL')
    expect(sql).not.toContain('key_salt')
    expect(sql).not.toContain('verification_blob')
    expect(sql).not.toContain('recovery_blob')
    expect(sql).not.toContain('account_keys')
    expect(params).toEqual([expect.any(String), USER_ID])
    expect(mocks.connection.commit).toHaveBeenCalledOnce()
    expect(mocks.connection.rollback).not.toHaveBeenCalled()
    expect(mocks.connection.release).toHaveBeenCalledOnce()
  })

  it('preserves the v1 re-encryption and cleanup path', async () => {
    mocks.db.query.mockResolvedValueOnce([[resetRow(null)]])
    mocks.connection.query.mockResolvedValueOnce([[{ pin_verifier: null }]])
    mocks.connection.query.mockResolvedValue([{ affectedRows: 1 }])

    const out = await run(resetPassword, resetFields)

    expect(out.status).toBe(200)
    expect(mocks.connection.query).toHaveBeenCalledTimes(5)
    const statements = mocks.connection.query.mock.calls.map(([sql]) => sql as string)
    expect(statements[0]).toContain('FOR UPDATE')
    expect(statements[1]).toContain('key_salt = COALESCE(?, key_salt)')
    expect(statements[1]).toContain('verification_blob = COALESCE(?, verification_blob)')
    expect(statements[1]).toContain('recovery_blob = COALESCE(?, recovery_blob)')
    expect(statements[2]).toContain('UPDATE account_keys')
    expect(statements[3]).toContain('DELETE FROM account_keys')
    expect(statements[4]).toContain('UPDATE users SET recovery_blob = NULL')
    expect(mocks.connection.commit).toHaveBeenCalledOnce()
    expect(mocks.connection.release).toHaveBeenCalledOnce()
  })
})

// Requirement: a new login password has at least 8 characters, enforced by the server.
describe('password minimum length', () => {
  it('change-password rejects 7 characters and accepts 8', async () => {
    const short = await run(changePassword, { currentPassword: 'old', newPassword: 'abcd12!' })
    expect(short.error?.statusCode).toBe(400)
    expect(mocks.repo.changePassword).not.toHaveBeenCalled()

    const ok = await run(changePassword, { currentPassword: 'old', newPassword: 'abcd123!' })
    expect(ok.status).toBe(200)
    expect(mocks.repo.changePassword).toHaveBeenCalledOnce()
  })

  it('reset-password rejects 7 characters before looking up the token', async () => {
    const out = await run(resetPassword, { ...resetFields, newPassword: 'abcd12!' })
    expect(out.error?.statusCode).toBe(400)
    expect(mocks.db.query).not.toHaveBeenCalled()
  })
})

// Requirement (session-plan S2): a new password ends every session, in the same commit; changing
// an existing PIN ends the user's other sessions and keeps the current one; the first PIN, or the
// same PIN moved to the new scheme, ends nothing.
describe('sessions after a credential change', () => {
  it('reset-password ends every session of the user inside its transaction', async () => {
    mocks.db.query.mockResolvedValueOnce([[resetRow(null)]])
    mocks.connection.query.mockResolvedValueOnce([[{ pin_verifier: Buffer.alloc(32) }]])
    mocks.connection.query.mockResolvedValue([{ affectedRows: 1 }])

    const out = await run(resetPassword, resetFields)

    expect(out.status).toBe(200)
    expect(mocks.sessions.revokeAllForUser).toHaveBeenCalledWith(
      USER_ID,
      undefined,
      mocks.connection
    )
    expect(mocks.sessions.revokeAllForUser.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.connection.commit.mock.invocationCallOrder[0]
    )
  })

  it('recover-bip39 ends every session of the user inside its transaction', async () => {
    mocks.repo.isPinV2.mockResolvedValue(false)
    mocks.connection.query.mockResolvedValue([{ affectedRows: 1 }])

    const out = await run(recoverWithBip39, {
      newKeySalt: 'ab'.repeat(32),
      verificationBlob: 'verification',
      recoveryBlob: 'recovery',
      reEncryptedKeys: [{ accountId: 'account-a', encryptedKey: 'key' }],
    })

    expect(out.status).toBe(200)
    expect(mocks.sessions.revokeAllForUser).toHaveBeenCalledWith(
      USER_ID,
      undefined,
      mocks.connection
    )
    expect(mocks.sessions.revokeAllForUser.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.connection.commit.mock.invocationCallOrder[0]
    )
  })

  it('changing an existing PIN ends the other sessions and keeps this one', async () => {
    mocks.repo.isPinV2.mockResolvedValue(true)
    const out = await run(setPin, {
      newKeySalt: 'ab'.repeat(32),
      authKey: GOOD_AUTH_KEY,
      wrappedUserKey: WRAPPED,
    })
    expect(out.status).toBe(200)
    expect(mocks.sessions.revokeAllForUser).toHaveBeenCalledWith(USER_ID, 'sid-current')
  })

  it('the first PIN, or the same PIN moved to the new scheme, ends no session', async () => {
    mocks.repo.isPinV2.mockResolvedValue(false)
    const out = await run(setPin, {
      newKeySalt: 'ab'.repeat(32),
      authKey: GOOD_AUTH_KEY,
      wrappedUserKey: WRAPPED,
    })
    expect(out.status).toBe(200)
    expect(mocks.sessions.revokeAllForUser).not.toHaveBeenCalled()
  })
})
