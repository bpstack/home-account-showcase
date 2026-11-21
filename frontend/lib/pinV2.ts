/**
 * PIN v2 steps shared by every flow that unlocks with the PIN or sets one (docs/PIN-plan.md §6.5).
 *
 * The server checks the PIN and counts the attempt; the client never tests a PIN on its own.
 * Raw UserKey bytes returned here must be zeroed by the caller (`raw.fill(0)`) once used.
 */

import { auth } from './apiClient'
import {
  derivePinSecrets,
  generateSalt,
  importUserKey,
  unwrapUserKeyRaw,
  verifyUserKey,
  wrapUserKey,
} from './crypto'

/**
 * Proves the PIN to the server (`POST /auth/unlock`, which counts the attempt) and unwraps the
 * UserKey it releases. Throws PinError on a wrong or locked PIN.
 */
export async function unlockUserKeyWithPin(pin: string, keySalt: string) {
  const { authKeyHex, kek } = await derivePinSecrets(pin, keySalt)
  const released = await auth.unlockPin(authKeyHex)
  const raw = await unwrapUserKeyRaw(released.wrappedUserKey, kek)
  try {
    const userKey = await importUserKey(raw)
    if (released.verification_blob && !(await verifyUserKey(released.verification_blob, userKey))) {
      throw new Error('User key does not match the verification blob')
    }
    return { raw, userKey, encryptedKeys: released.encrypted_keys }
  } catch (error) {
    raw.fill(0)
    throw error
  }
}

/**
 * Makes `pin` the PIN that wraps `userKeyRaw`, with a new salt (`POST /auth/pin`). The UserKey
 * itself does not change, so neither do the account keys nor the recovery blob.
 * `verificationBlob` is only sent when the UserKey is new.
 */
export async function setPinForUserKey(
  pin: string,
  userKeyRaw: Uint8Array,
  verificationBlob?: string
): Promise<void> {
  const newKeySalt = generateSalt()
  const { authKeyHex, kek } = await derivePinSecrets(pin, newKeySalt)
  const wrappedUserKey = await wrapUserKey(userKeyRaw, kek)
  await auth.setPin({
    newKeySalt,
    authKey: authKeyHex,
    wrappedUserKey,
    ...(verificationBlob && { verificationBlob }),
  })
}
