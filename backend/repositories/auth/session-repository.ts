// repositories/auth/session-repository.ts

import { randomUUID } from 'crypto'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import db from '../../config/db.js'

/**
 * One row per sign-in. A session has a single live credential at a time (its refresh token, or at
 * first the OAuth code), stored only as the SHA-256 of its jti. Times are compared in SQL.
 */
export type RotateOutcome =
  | { status: 'rotated'; userId: string; expiresAt: Date }
  // The previous credential, presented again within the grace window (parallel refreshes)
  | { status: 'grace'; userId: string; expiresAt: Date }
  // A replaced credential presented outside the grace window: taken as stolen, session revoked
  | { status: 'reuse'; userId: string }
  | { status: 'invalid' }

interface SessionRow extends RowDataPacket {
  user_id: string
  expires_at: Date
  is_live: number
  is_previous_in_grace: number
}

export class SessionRepository {
  /** Starts a session whose live credential has `credentialHash`; returns its id (`sid`). */
  static async create(userId: string, credentialHash: Buffer, expiresAt: Date): Promise<string> {
    // No scheduler: a user's finished sessions are removed when they sign in again
    await db.query(`DELETE FROM refresh_sessions WHERE user_id = ? AND expires_at < NOW()`, [
      userId,
    ])
    const sid = randomUUID()
    await db.query(
      `INSERT INTO refresh_sessions (id, user_id, current_hash, expires_at) VALUES (?, ?, ?, ?)`,
      [sid, userId, credentialHash, expiresAt]
    )
    return sid
  }

  /**
   * Replaces the live credential `presentedHash` with `newHash`, in one conditional statement: of
   * two simultaneous requests with the same credential, only one rotates. `graceSeconds` is 0 for
   * a one-time OAuth code, so presenting it twice counts as reuse.
   */
  static async rotate(
    sid: string,
    presentedHash: Buffer,
    newHash: Buffer,
    graceSeconds: number
  ): Promise<RotateOutcome> {
    const [update] = await db.query<ResultSetHeader>(
      `UPDATE refresh_sessions
       SET previous_hash = current_hash, current_hash = ?, rotated_at = NOW(3)
       WHERE id = ? AND current_hash = ? AND revoked_at IS NULL AND expires_at > NOW()`,
      [newHash, sid, presentedHash]
    )

    const [rows] = await db.query<SessionRow[]>(
      `SELECT user_id, expires_at,
              (revoked_at IS NULL AND expires_at > NOW()) AS is_live,
              (previous_hash = ? AND rotated_at > NOW(3) - INTERVAL ? SECOND) AS is_previous_in_grace
       FROM refresh_sessions WHERE id = ?`,
      [presentedHash, graceSeconds, sid]
    )
    const row = rows[0]

    if (update.affectedRows === 1 && row) {
      return { status: 'rotated', userId: row.user_id, expiresAt: new Date(row.expires_at) }
    }
    if (!row || !row.is_live) return { status: 'invalid' }
    if (row.is_previous_in_grace) {
      return { status: 'grace', userId: row.user_id, expiresAt: new Date(row.expires_at) }
    }

    await SessionRepository.revoke(sid)
    return { status: 'reuse', userId: row.user_id }
  }

  /** Ends one session (logout, or a reused credential). */
  static async revoke(sid: string): Promise<void> {
    await db.query(
      `UPDATE refresh_sessions SET revoked_at = NOW() WHERE id = ? AND revoked_at IS NULL`,
      [sid]
    )
  }

  /** Ends every session of a user, except `keepSid` if given (the one making the change). */
  static async revokeAllForUser(userId: string, keepSid?: string): Promise<void> {
    await db.query(
      `UPDATE refresh_sessions SET revoked_at = NOW()
       WHERE user_id = ? AND revoked_at IS NULL AND id <> ?`,
      [userId, keepSid ?? '']
    )
  }
}
