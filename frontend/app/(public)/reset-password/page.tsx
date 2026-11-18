'use client'

import { useState, Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, ButtonLink, PasswordInput, Textarea } from '@/components/ui'
import { AuthShell, FormAlert } from '@/components/auth'
import {
  deriveRecoveryKey,
  decryptRecoveryBlob,
  deriveUserKeyExtractable,
  encryptAccountKey,
  decryptAccountKey,
  generateVerificationBlob,
  generateRecoveryBlob,
  generateSalt,
  validateBIP39Mnemonic,
} from '@/lib/crypto'

type Phase = 'password' | 'bip39' | 'success'

const BACK_TO_LOGIN = { href: '/login', label: 'Iniciar sesión' }

interface CryptoInfo {
  key_salt: string
  recovery_blob: string | null
  recovery_salt: string | null
  encrypted_keys: Array<{ account_id: string; encrypted_key: string; key_version: number }>
}

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const emailParam = searchParams.get('email')

  const [phase, setPhase] = useState<Phase>('password')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // BIP39 phase state
  const [cryptoInfo, setCryptoInfo] = useState<CryptoInfo | null>(null)
  const [mnemonic, setMnemonic] = useState('')
  const [bip39Error, setBip39Error] = useState('')
  const [bip39Loading, setBip39Loading] = useState(false)
  const [skipping, setSkipping] = useState(false)

  useEffect(() => {
    if (!token || !emailParam) {
      setError('Enlace de recuperación inválido o expirado')
    }
  }, [token, emailParam])

  // Phase 1: validate password, fetch crypto info, decide next phase
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    try {
      // Fetch crypto recovery info (does NOT consume the token)
      const infoRes = await fetch(
        `/api/proxy/auth/reset-info?email=${encodeURIComponent(emailParam!)}&token=${encodeURIComponent(token!)}`,
        { credentials: 'include' }
      )
      const infoData = await infoRes.json()

      if (!infoRes.ok) {
        throw new Error(infoData.error || 'Token inválido o expirado')
      }

      const ci: CryptoInfo = {
        key_salt: infoData.key_salt,
        recovery_blob: infoData.recovery_blob,
        recovery_salt: infoData.recovery_salt,
        encrypted_keys: infoData.encrypted_keys || [],
      }
      setCryptoInfo(ci)

      // If user has recovery phrase set up, ask them to use it
      if (ci.recovery_blob && ci.recovery_salt && ci.encrypted_keys.length > 0) {
        setPhase('bip39')
      } else {
        // No recovery phrase — generate new verification blob from new password
        // and clear stale account keys (irrecoverable without BIP39)
        const newKeySalt = generateSalt()
        const { key: newUserKey } = await deriveUserKeyExtractable(newPassword, newKeySalt)
        const newVerificationBlob = await generateVerificationBlob(newUserKey)
        await doPasswordReset({ newKeySalt, newVerificationBlob, clearAccountKeys: true })
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Error al conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  // Phase 2a: re-encrypt with BIP39 recovery
  const handleBip39Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cryptoInfo) return
    setBip39Error('')
    setBip39Loading(true)

    try {
      const words = mnemonic.trim().toLowerCase()
      if (!validateBIP39Mnemonic(words)) {
        setBip39Error(
          'Frase de recuperación inválida. Verifica que las 24 palabras sean correctas.'
        )
        return
      }

      // 1. Derive recovery key from mnemonic + stored salt
      const recoveryKey = await deriveRecoveryKey(words, cryptoInfo.recovery_salt!)

      // 2. Decrypt old user key from recovery blob
      const oldUserKey = await decryptRecoveryBlob(cryptoInfo.recovery_blob!, recoveryKey)

      // 3. Generate new salt + derive new user key from new password
      const newKeySalt = generateSalt()
      const { key: newUserKey, raw: newUserKeyRaw } = await deriveUserKeyExtractable(
        newPassword,
        newKeySalt
      )

      // 4. Re-encrypt all account keys with new user key
      const reEncryptedKeys: Array<{ accountId: string; encryptedKey: string }> = []
      for (const ek of cryptoInfo.encrypted_keys) {
        const accountKey = await decryptAccountKey(ek.encrypted_key, oldUserKey)
        const newEncryptedKey = await encryptAccountKey(accountKey, newUserKey)
        reEncryptedKeys.push({ accountId: ek.account_id, encryptedKey: newEncryptedKey })
      }

      // 5. Generate new verification blob and new recovery blob
      const newVerificationBlob = await generateVerificationBlob(newUserKey)
      const newRecoveryBlob = await generateRecoveryBlob(newUserKeyRaw, recoveryKey)

      // 6. Atomically reset password + crypto
      await doPasswordReset({ newKeySalt, newVerificationBlob, reEncryptedKeys, newRecoveryBlob })
    } catch (err: unknown) {
      const msg = (err as Error).message || ''
      if (msg.toLowerCase().includes('decrypt') || msg.toLowerCase().includes('operation')) {
        setBip39Error(
          'Frase de recuperación incorrecta. Verifica las palabras e inténtalo de nuevo.'
        )
      } else {
        setBip39Error(msg || 'Error al procesar la frase de recuperación.')
      }
    } finally {
      setBip39Loading(false)
    }
  }

  // Phase 2b: skip BIP39 — generate new verification blob, clear stale account keys
  const handleSkip = async () => {
    setSkipping(true)
    try {
      const newKeySalt = generateSalt()
      const { key: newUserKey } = await deriveUserKeyExtractable(newPassword, newKeySalt)
      const newVerificationBlob = await generateVerificationBlob(newUserKey)
      await doPasswordReset({ newKeySalt, newVerificationBlob, clearAccountKeys: true })
    } catch (err: unknown) {
      setBip39Error((err as Error).message || 'Error al restablecer la contraseña')
    } finally {
      setSkipping(false)
    }
  }

  const doPasswordReset = async (extra: {
    newKeySalt?: string
    newVerificationBlob?: string
    reEncryptedKeys?: Array<{ accountId: string; encryptedKey: string }>
    newRecoveryBlob?: string
    clearAccountKeys?: boolean
  }) => {
    const res = await fetch('/api/proxy/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailParam,
        token,
        newPassword,
        ...extra,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error al restablecer la contraseña')
    setPhase('success')
    setTimeout(() => router.push('/login'), 2500)
  }

  if (phase === 'success') {
    return (
      <AuthShell
        title="Contraseña actualizada"
        description="Ya puedes iniciar sesión con la nueva. Te llevamos allí…"
      >
        <ButtonLink href="/login" className="h-11 w-full sm:h-10">
          Iniciar sesión
        </ButtonLink>
      </AuthShell>
    )
  }

  if (phase === 'bip39') {
    return (
      <AuthShell
        title="Frase de recuperación"
        description="Tus datos están cifrados con la contraseña anterior. Introduce tus 24 palabras de recuperación para pasarlos a la nueva."
        back={BACK_TO_LOGIN}
      >
        <form onSubmit={handleBip39Submit} className="space-y-4">
          {bip39Error && <FormAlert>{bip39Error}</FormAlert>}

          <div>
            <label htmlFor="mnemonic" className="mb-1 block text-sm font-medium">
              Frase de recuperación (24 palabras)
            </label>
            <Textarea
              id="mnemonic"
              value={mnemonic}
              onChange={(e) => setMnemonic(e.target.value)}
              rows={4}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              aria-describedby="mnemonic-hint"
              className="font-mono"
            />
            <p id="mnemonic-hint" className="mt-1 text-xs text-muted-foreground">
              Las palabras separadas por espacios, en minúsculas.
            </p>
          </div>

          <Button
            type="submit"
            isLoading={bip39Loading}
            disabled={mnemonic.trim().split(/\s+/).length < 24}
            className="h-11 w-full sm:h-10"
          >
            Restaurar acceso
          </Button>
        </form>

        <div className="mt-6 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Si omites este paso, tus datos cifrados quedarán inaccesibles hasta que uses la frase de
            recuperación.
          </p>
          <Button
            type="button"
            variant="ghost"
            onClick={handleSkip}
            isLoading={skipping}
            className="mt-2 h-11 w-full sm:h-10"
          >
            Omitir y cambiar solo la contraseña
          </Button>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Nueva contraseña" back={BACK_TO_LOGIN}>
      <form onSubmit={handlePasswordSubmit} className="space-y-4">
        {error && <FormAlert>{error}</FormAlert>}

        <PasswordInput
          id="password"
          label="Nueva contraseña"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          disabled={!token}
          autoFocus
          className="h-11 sm:h-10"
        />

        <PasswordInput
          id="confirmPassword"
          label="Repite la contraseña"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          disabled={!token}
          className="h-11 sm:h-10"
        />

        <Button
          type="submit"
          isLoading={loading}
          disabled={!token || !newPassword || !confirmPassword}
          className="h-11 w-full sm:h-10"
        >
          Continuar
        </Button>
      </form>
    </AuthShell>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Nueva contraseña" back={BACK_TO_LOGIN}>
          {null}
        </AuthShell>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
