'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, PasswordInput } from '@/components/ui'
import { AuthShell, FormAlert, RecoveryPhrase } from '@/components/auth'
import { useCryptoStore } from '@/stores/cryptoStore'
import { useAuthStore } from '@/stores/authStore'
import {
  generateVerificationBlob,
  generateBIP39Mnemonic,
  generateSalt,
  deriveRecoveryKey,
  deriveUserKeyExtractable,
  generateRecoveryBlob,
  generateUserKeyRaw,
  importUserKey,
  verifyUserKey,
} from '@/lib/crypto'
import { saveUserKey } from '@/lib/keyVault'
import { setPinForUserKey } from '@/lib/pinV2'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

const PIN_TITLE = 'Crea tu PIN de cifrado'
const FIELD_CLASS = 'h-11 sm:h-10'
const FULL_CLASS = 'h-11 w-full sm:h-10'

interface KeysData {
  key_salt: string
  encrypted_keys?: Array<{ account_id: string; encrypted_key: string; key_version: number }>
  verification_blob?: string | null
  pin_v2?: boolean
}

function SetupPinForm() {
  // Phases:
  //  'loading'  → fetching keys from server to determine next step
  //  'password' → user must enter login password: its UserKey becomes the fixed data key (PIN v2)
  //  'pin'      → create the new numeric PIN
  //  'bip39'    → show recovery mnemonic
  const [phase, setPhase] = useState<'loading' | 'password' | 'pin' | 'bip39'>('loading')
  const [keysData, setKeysData] = useState<KeysData | null>(null)
  // Raw bytes of the UserKey unlocked with the login password, kept until the PIN wraps them
  const userKeyRawRef = useRef<Uint8Array | null>(null)
  // Fresh setup: the first account is created once, even if a later step fails and the user retries
  const accountCreatedRef = useRef(false)

  // password phase
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  // pin phase
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinLoading, setPinLoading] = useState(false)

  // bip39 phase
  const [mnemonic, setMnemonic] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const csrfToken = searchParams.get('csrf')
  const fromParam = searchParams.get('from') || '/dashboard'
  const { generateAndSaveAccountKey, forceUnlockAfterSetup } = useCryptoStore()
  const { user } = useAuth()

  // On mount: fetch keys and decide initial phase
  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/proxy/auth/keys', { credentials: 'include' })
        const data = await res.json()
        if (!data.success) throw new Error(data.error || 'Error al obtener claves')
        setKeysData(data)

        if (data.pin_v2) {
          // Already has a PIN (v2): nothing to set up; the private layout unlocks if needed
          useAuthStore.getState().setHasSeparatePin(true)
          router.replace(fromParam)
          return
        }

        if (data.encrypted_keys?.length > 0) {
          // Existing data: the PIN will wrap the UserKey of the login password, so it is needed
          // even if the keys are already in memory (that key cannot be exported)
          setPhase('password')
        } else {
          // OAuth / fresh setup — no keys anywhere → create new account
          setPhase('pin')
        }
      } catch {
        setPhase('pin') // fallback
      }
    }
    init()
  }, [router, fromParam])

  // Step 1: unlock with login password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!keysData) return
    setPasswordError('')
    setPasswordLoading(true)
    try {
      const cryptoStore = useCryptoStore.getState()
      const { raw } = await deriveUserKeyExtractable(password, keysData.key_salt)
      const userKey = await importUserKey(raw)

      if (keysData.verification_blob) {
        const isValid = await verifyUserKey(keysData.verification_blob, userKey)
        if (!isValid) {
          raw.fill(0)
          setPasswordError('Contraseña incorrecta')
          return
        }
      }

      userKeyRawRef.current?.fill(0)
      userKeyRawRef.current = raw
      cryptoStore.setUserKey(userKey)

      if (keysData.encrypted_keys?.length) {
        await cryptoStore.unlockAccounts(
          keysData.encrypted_keys.map((k) => ({
            accountId: k.account_id,
            encryptedKey: k.encrypted_key,
            keyVersion: k.key_version,
          }))
        )
      }

      setPhase('pin')
    } catch (err) {
      if (!(err instanceof Error && err.message === 'Contraseña incorrecta')) {
        setPasswordError('Error al verificar contraseña. Inténtalo de nuevo.')
        console.error(err)
      }
    } finally {
      setPasswordLoading(false)
    }
  }

  // Step 2: create the PIN
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPinError('')

    const effectiveCsrf = csrfToken || document.cookie.match(/csrfToken=([^;]+)/)?.[1]

    if (pin.length < 6 || pin.length > 8) {
      setPinError('El PIN debe tener entre 6 y 8 dígitos')
      return
    }
    if (!/^\d+$/.test(pin)) {
      setPinError('El PIN solo puede contener números')
      return
    }
    if (pin !== confirmPin) {
      setPinError('Los PINs no coinciden')
      return
    }

    setPinLoading(true)
    try {
      // Re-fetch keys if we don't have them (safety)
      let kd = keysData
      if (!kd) {
        const res = await fetch('/api/proxy/auth/keys', { credentials: 'include' })
        kd = await res.json()
        setKeysData(kd)
      }
      if (!kd) throw new Error('No se pudieron obtener las claves')

      const hasExistingKeys = (kd.encrypted_keys?.length ?? 0) > 0
      let userKeyRaw = userKeyRawRef.current
      let verificationBlob: string | undefined

      if (hasExistingKeys) {
        // The UserKey unlocked with the password becomes the fixed data key: the account keys,
        // the verification blob and the recovery blob stay as they are
        if (!userKeyRaw) {
          setPhase('password')
          return
        }
      } else {
        // OAuth / fresh setup: a new random UserKey, generated once. A retry after a failed later
        // step must wrap the same key: a second one would not open the account key of the first.
        if (!userKeyRaw) {
          userKeyRaw = generateUserKeyRaw()
          userKeyRawRef.current = userKeyRaw
        }
        const newUserKey = await importUserKey(userKeyRaw)
        useCryptoStore.getState().setUserKey(newUserKey)
        verificationBlob = await generateVerificationBlob(newUserKey)
      }

      // Verifier and wrapped UserKey are written together: from here the user is on PIN v2
      await setPinForUserKey(pin, userKeyRaw, verificationBlob)

      if (!hasExistingKeys && !accountCreatedRef.current) {
        await generateAndSaveAccountKey(effectiveCsrf || undefined)
        accountCreatedRef.current = true
      }

      const userKey = useCryptoStore.getState().userKey
      if (userKey) {
        // Mark separate PIN as configured
        useAuthStore.getState().setHasSeparatePin(true)

        // Save the key in the device vault (IndexedDB) so the user doesn't need to enter PIN on reload
        if (user) {
          await saveUserKey(user.id, userKey)
        }

        // Generate BIP39 recovery phrase
        const words = generateBIP39Mnemonic()
        const recoverySalt = generateSalt()
        const recoveryKey = await deriveRecoveryKey(words, recoverySalt)
        const recoveryBlob = await generateRecoveryBlob(userKeyRaw, recoveryKey)

        await fetch('/api/proxy/auth/recovery-blob', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(effectiveCsrf && { 'X-CSRF-Token': effectiveCsrf }),
          },
          body: JSON.stringify({ recoveryBlob, recoverySalt }),
          credentials: 'include',
        })

        userKeyRaw.fill(0)
        userKeyRawRef.current = null

        setMnemonic(words)
        setPhase('bip39')
        return
      }

      forceUnlockAfterSetup()
      router.push(fromParam)
    } catch (err) {
      setPinError('Error configurando cifrado. Inténtalo de nuevo.')
      console.error(err)
    } finally {
      setPinLoading(false)
    }
  }

  if (phase === 'loading') {
    return <AuthShell title={PIN_TITLE}>{null}</AuthShell>
  }

  // Step 1 — password
  if (phase === 'password') {
    return (
      <AuthShell
        title="Configura tu PIN de cifrado"
        description="Primero confirma tu contraseña de acceso para desbloquear tus datos."
      >
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {passwordError && <FormAlert>{passwordError}</FormAlert>}

          <PasswordInput
            id="password"
            label="Contraseña de acceso"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className={FIELD_CLASS}
          />

          <Button
            type="submit"
            isLoading={passwordLoading}
            disabled={!password}
            className={FULL_CLASS}
          >
            Continuar
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            className={FULL_CLASS}
          >
            Volver
          </Button>
        </form>
      </AuthShell>
    )
  }

  // Step 3 — BIP39 mnemonic (the PIN is already saved: there is no going back from here)
  if (phase === 'bip39') {
    return (
      <AuthShell
        title="Guarda tu frase de recuperación"
        description="Estas 24 palabras son la única forma de recuperar tus datos si olvidas el PIN. Guárdalas en un lugar seguro, fuera de línea."
        wide
      >
        <RecoveryPhrase mnemonic={mnemonic} />

        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(mnemonic)
            toast.success('Frase copiada al portapapeles')
          }}
          className={`mt-4 ${FULL_CLASS}`}
        >
          Copiar al portapapeles
        </Button>

        <label className="mt-6 flex items-start gap-3 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-accent"
          />
          He guardado esta frase en un lugar seguro. Entiendo que no se puede recuperar.
        </label>

        <Button
          type="button"
          onClick={() => {
            forceUnlockAfterSetup()
            router.push(fromParam)
          }}
          disabled={!confirmed}
          className={`mt-6 ${FULL_CLASS}`}
        >
          Continuar
        </Button>
      </AuthShell>
    )
  }

  // Step 2 — PIN creation
  return (
    <AuthShell
      title={PIN_TITLE}
      description="Protege tus datos financieros. Lo necesitarás cada vez que recargues la página."
    >
      <form onSubmit={handlePinSubmit} className="space-y-4">
        {pinError && <FormAlert>{pinError}</FormAlert>}

        <PasswordInput
          id="pin"
          label="PIN (6 a 8 dígitos)"
          subject="PIN"
          inputMode="numeric"
          autoComplete="off"
          maxLength={8}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          autoFocus
          className={`${FIELD_CLASS} tracking-widest`}
        />

        <PasswordInput
          id="confirmPin"
          label="Repite el PIN"
          subject="PIN"
          inputMode="numeric"
          autoComplete="off"
          maxLength={8}
          value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
          className={`${FIELD_CLASS} tracking-widest`}
        />

        <Button
          type="submit"
          isLoading={pinLoading}
          disabled={pin.length < 6 || confirmPin.length < 6}
          className={FULL_CLASS}
        >
          Guardar PIN
        </Button>
        {keysData?.encrypted_keys?.length ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setPhase('password')}
            className={FULL_CLASS}
          >
            Volver
          </Button>
        ) : null}
      </form>

      <p className="mt-4 text-xs text-muted-foreground">
        Después de guardar el PIN verás tu frase de recuperación.
      </p>
    </AuthShell>
  )
}

export default function SetupPinPage() {
  return (
    <Suspense fallback={<AuthShell title={PIN_TITLE}>{null}</AuthShell>}>
      <SetupPinForm />
    </Suspense>
  )
}
