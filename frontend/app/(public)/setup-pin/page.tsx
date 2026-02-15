'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCryptoStore } from '@/stores/cryptoStore'
import {
  generateVerificationBlob,
  generateBIP39Mnemonic,
  generateSalt,
  deriveRecoveryKey,
  deriveUserKeyExtractable,
  generateRecoveryBlob,
} from '@/lib/crypto'

function SetupPinForm() {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState<'pin' | 'bip39'>('pin')
  const [mnemonic, setMnemonic] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const csrfToken = searchParams.get('csrf')
  const { deriveAndSetUserKey, generateAndSaveAccountKey, forceUnlockAfterSetup } = useCryptoStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (pin.length < 6 || pin.length > 8) {
      setError('El PIN debe tener entre 6 y 8 dígitos')
      return
    }

    if (!/^\d+$/.test(pin)) {
      setError('El PIN solo puede contener números')
      return
    }

    if (pin !== confirmPin) {
      setError('Los PINs no coinciden')
      return
    }

    setLoading(true)

    try {
      const keysRes = await fetch('/api/proxy/auth/keys', {
        credentials: 'include',
      })
      const keysData = await keysRes.json()

      if (!keysData.success) {
        throw new Error(keysData.error || 'Error al obtener claves')
      }

      await deriveAndSetUserKey(pin, keysData.key_salt)
      await generateAndSaveAccountKey(csrfToken || undefined)

      const userKey = useCryptoStore.getState().userKey
      if (userKey) {
        const blob = await generateVerificationBlob(userKey)
        await fetch('/api/proxy/auth/verification-blob', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
          },
          body: JSON.stringify({ verificationBlob: blob }),
          credentials: 'include',
        })

        // Generate BIP39 mnemonic and recovery blob
        const words = generateBIP39Mnemonic()
        const recoverySalt = generateSalt()
        const recoveryKey = await deriveRecoveryKey(words, recoverySalt)

        // Get extractable UserKey for recovery blob
        const { raw: userKeyRaw } = await deriveUserKeyExtractable(pin, keysData.key_salt)
        const recoveryBlob = await generateRecoveryBlob(userKeyRaw, recoveryKey)

        // Save recovery blob to backend
        await fetch('/api/proxy/auth/recovery-blob', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
          },
          body: JSON.stringify({ recoveryBlob, recoverySalt }),
          credentials: 'include',
        })

        // Show BIP39 phase
        setMnemonic(words)
        setPhase('bip39')
        return
      }

      forceUnlockAfterSetup()
      router.push('/dashboard')
    } catch (err) {
      setError('Error configurando cifrado. Intenta de nuevo.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Show BIP39 mnemonic phase
  if (phase === 'bip39') {
    const handleContinue = () => {
      forceUnlockAfterSetup()
      router.push('/dashboard')
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-lg p-8 space-y-6 bg-layer-1 rounded-xl border border-layer-2">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-text-primary">
              Guarda tu frase de recuperación
            </h1>
            <p className="text-text-secondary mt-2">
              Estas 24 palabras son la ÚNICA forma de recuperar tus datos si olvidas tu PIN.
              Cópialas y guárdalas en un lugar seguro offline.
            </p>
          </div>

          {/* Grid of words */}
          <div className="grid grid-cols-3 gap-2 p-4 bg-background rounded-lg border border-layer-3">
            {mnemonic.split(' ').map((word, i) => (
              <div key={i} className="flex items-center gap-2 p-2 text-sm">
                <span className="text-text-tertiary w-6 text-right">{i + 1}.</span>
                <span className="font-mono font-medium text-text-primary">{word}</span>
              </div>
            ))}
          </div>

          {/* Copy button */}
          <button
            onClick={() => navigator.clipboard.writeText(mnemonic)}
            className="w-full py-2 text-sm border border-layer-3 rounded-lg hover:bg-layer-2"
          >
            Copiar al portapapeles
          </button>

          {/* Confirmation checkbox */}
          <label className="flex items-start gap-3 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1"
            />
            He guardado esta frase en un lugar seguro. Entiendo que no se puede recuperar.
          </label>

          <button
            onClick={handleContinue}
            disabled={!confirmed}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            Continuar al dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-layer-1 rounded-xl border border-layer-2">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary">Configura tu PIN de cifrado</h1>
          <p className="text-text-secondary mt-2">
            Este PIN protege tus datos financieros. Necesitarás introducirlo cada vez que inicies
            sesión.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              PIN (6-8 dígitos)
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-3 text-center text-2xl tracking-widest rounded-lg border border-layer-3 bg-background focus:ring-2 focus:ring-blue-500"
              placeholder="••••••"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Confirmar PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-3 text-center text-2xl tracking-widest rounded-lg border border-layer-3 bg-background focus:ring-2 focus:ring-blue-500"
              placeholder="••••••"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading || pin.length < 6 || confirmPin.length < 6}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Configurando...' : 'Guardar PIN'}
          </button>
        </form>

        <p className="text-xs text-text-tertiary text-center">
          Tu frase de recuperación se mostrará después de configurar el PIN.
        </p>
      </div>
    </div>
  )
}

export default function SetupPinPage() {
  return (
    <Suspense fallback={<SetupPinSkeleton />}>
      <SetupPinForm />
    </Suspense>
  )
}

function SetupPinSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
    </div>
  )
}
