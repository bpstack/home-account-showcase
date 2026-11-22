import * as bcrypt from 'bcrypt'
import { secureXSS } from './secure-sanitize.js'

/**
 * Body fields that carry a password. The HTML sanitizer leaves them as typed: it used to trim
 * them and cut or rewrite `<`, `>` and `&` (`abc<def123` was stored as `abc`), so two different
 * passwords could be the same one.
 */
export const PASSWORD_FIELDS: ReadonlySet<string> = new Set([
  'password',
  'currentPassword',
  'newPassword',
])

/**
 * Whether `password`, exactly as typed, matches `hash`. A hash stored while the sanitizer still
 * rewrote passwords holds the rewritten form, so that form is tried too, and only when it differs:
 * nobody who signed up then is locked out.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  if (await bcrypt.compare(password, hash)) return true
  const legacy = secureXSS(password)
  return legacy !== password && (await bcrypt.compare(legacy, hash))
}
