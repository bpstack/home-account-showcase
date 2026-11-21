'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useCryptoStore } from '@/stores/cryptoStore'
import { useAuthStore } from '@/stores/authStore'
import {
  validateBIP39Mnemonic,
  deriveRecoveryKey,
  decryptRecoveryBlobRaw,
  importUserKey,
  decryptAccountKey,
} from '@/lib/crypto'
import { setPinForUserKey } from '@/lib/pinV2'
import { Button, ButtonLink, PasswordInput, Textarea } from '@/components/ui'
import { AuthShell, FormAlert } from '@/components/auth'

const TITLE = 'Recupera tu cuenta'
// Recovery needs the session: it is reached from /unlock, so that is where back goes.
const BACK_TO_UNLOCK = { href: '/unlock', label: 'Volver' }
const FULL_CLASS = 'h-11 w-full sm:h-10'

function RecoveryForm() {
  const router = useRouter()
  const [step, setStep] = useState<'mnemonic' | 'newpin' | 'processing' | 'done'>('mnemonic')
  const [mnemonic, setMnemonic] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // The UserKey from the recovery blob. It does not change: the new PIN only wraps it (PIN v2)
  const [recoveryData, setRecoveryData] = useState<{ userKeyRaw: Uint8Array } | null>(null)

  const handleMnemonicSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const cleaned = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ')

    if (!validateBIP39Mnemonic(cleaned)) {
      setError('Frase mnemónica inválida. Verifica las 24 palabras.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/proxy/auth/recovery-info', {
        credentials: 'include',
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 429) {
          setError(data.error || 'Recuperación bloqueada temporalmente.')
          return
        }
        if (res.status === 404) {
          setError('No tienes recuperación configurada. Contacta soporte.')
          return
        }
        throw new Error(data.error || 'Error obteniendo datos de recuperación')
      }

      const recoveryKey = await deriveRecoveryKey(cleaned, data.recovery_salt)

      let userKeyRaw: Uint8Array
      try {
        userKeyRaw = await decryptRecoveryBlobRaw(data.recovery_blob, recoveryKey)
      } catch {
        await fetch('/api/proxy/auth/record-failed-bip39', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        })
        setError('Frase incorrecta. Verifica tus 24 palabras.')
        return
      }

      const keysRes = await fetch('/api/proxy/auth/keys', { credentials: 'include' })
      const keysData = await keysRes.json()

      if (keysData.encrypted_keys?.length > 0) {
        try {
          const originalUserKey = await importUserKey(userKeyRaw)
          await decryptAccountKey(keysData.encrypted_keys[0].encrypted_key, originalUserKey)
        } catch {
          userKeyRaw.fill(0)
          await fetch('/api/proxy/auth/record-failed-bip39', {
            method: 'POST',
            credentials: 'include',
          })
          setError('Error de descifrado. La frase no corresponde a esta cuenta.')
          return
        }
      }

      setRecoveryData({ userKeyRaw })
      setStep('newpin')
    } catch (err: any) {
      setError(err.message || 'Error en recuperación')
    } finally {
      setLoading(false)
    }
  }

  const handleNewPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPin.length < 6 || newPin.length > 8 || !/^\d+$/.test(newPin)) {
      setError('El PIN debe tener entre 6 y 8 dígitos')
      return
    }
    if (newPin !== confirmPin) {
      setError('Los PINs no coinciden')
      return
    }
    if (!recoveryData) {
      setError('Error interno. Recarga la página.')
      return
    }

    setStep('processing')
    setLoading(true)

    try {
      // Same UserKey, new PIN: one statement on the server sets the salt, the verifier and the
      // wrapping. The account keys and the recovery blob do not change.
      await setPinForUserKey(newPin, recoveryData.userKeyRaw)
      recoveryData.userKeyRaw.fill(0)
      setRecoveryData(null)

      // The session stays open (POST /auth/pin does not end it): unlock with the new PIN
      useCryptoStore.getState().lock()
      useAuthStore.getState().setHasSeparatePin(true)
      setStep('done')

      setTimeout(() => router.push('/unlock'), 2000)
    } catch (err: any) {
      setError(err.message || 'Error en el proceso de recuperación')
      setStep('newpin')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'done') {
    return (
      <AuthShell
        title="Cuenta recuperada"
        description="Te llevamos a desbloquear con tu PIN nuevo…"
      >
        <ButtonLink href="/unlock" className={FULL_CLASS}>
          Desbloquear
        </ButtonLink>
      </AuthShell>
    )
  }

  if (step === 'processing') {
    return (
      <AuthShell
        title="Recuperando tu cuenta…"
        description="Puede tardar unos segundos. No cierres esta página."
      >
        {null}
      </AuthShell>
    )
  }

  if (step === 'newpin') {
    return (
      <AuthShell
        title="Frase verificada"
        description="Ahora crea un PIN nuevo para proteger tus datos."
      >
        <form onSubmit={handleNewPinSubmit} className="space-y-4">
          {error && <FormAlert>{error}</FormAlert>}

          <PasswordInput
            id="newPin"
            label="PIN nuevo (6 a 8 dígitos)"
            subject="PIN"
            inputMode="numeric"
            autoComplete="off"
            maxLength={8}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
            autoFocus
            className="h-11 tracking-widest sm:h-10"
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
            className="h-11 tracking-widest sm:h-10"
          />

          <Button
            type="submit"
            isLoading={loading}
            disabled={newPin.length < 6 || confirmPin.length < 6}
            className={FULL_CLASS}
          >
            Recuperar cuenta
          </Button>
        </form>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title={TITLE}
      description="Introduce tus 24 palabras de recuperación para restaurar el acceso a tus datos."
      back={BACK_TO_UNLOCK}
    >
      <form onSubmit={handleMnemonicSubmit} className="space-y-4">
        {error && <FormAlert>{error}</FormAlert>}

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
            className="font-mono"
          />
        </div>

        <Button
          type="submit"
          isLoading={loading}
          disabled={!mnemonic.trim()}
          className={FULL_CLASS}
        >
          Continuar
        </Button>
      </form>
    </AuthShell>
  )
}

export default function RecoveryPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title={TITLE} back={BACK_TO_UNLOCK}>
          {null}
        </AuthShell>
      }
    >
      <RecoveryForm />
    </Suspense>
  )
}
