'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useCryptoStore } from '@/stores/cryptoStore'
import {
  validateBIP39Mnemonic,
  deriveRecoveryKey,
  decryptRecoveryBlob,
  generateSalt,
  deriveUserKeyExtractable,
  generateVerificationBlob,
  generateRecoveryBlob,
  encryptAccountKey,
  decryptAccountKey,
} from '@/lib/crypto'
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Shield } from 'lucide-react'

function RecoveryForm() {
  const router = useRouter()
  const [step, setStep] = useState<'mnemonic' | 'newpin' | 'processing' | 'done'>('mnemonic')
  const [mnemonic, setMnemonic] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [showConfirmPin, setShowConfirmPin] = useState(false)

  const [recoveryData, setRecoveryData] = useState<{
    recoveryBlob: string
    recoverySalt: string
    originalUserKey: CryptoKey
  } | null>(null)

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

      let originalUserKey: CryptoKey
      try {
        originalUserKey = await decryptRecoveryBlob(data.recovery_blob, recoveryKey)
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
          await decryptAccountKey(keysData.encrypted_keys[0].encrypted_key, originalUserKey)
        } catch {
          await fetch('/api/proxy/auth/record-failed-bip39', {
            method: 'POST',
            credentials: 'include',
          })
          setError('Error de descifrado. La frase no corresponde a esta cuenta.')
          return
        }
      }

      setRecoveryData({
        recoveryBlob: data.recovery_blob,
        recoverySalt: data.recovery_salt,
        originalUserKey,
      })
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
      const { originalUserKey, recoverySalt } = recoveryData

      const keysRes = await fetch('/api/proxy/auth/keys', { credentials: 'include' })
      const keysData = await keysRes.json()

      const decryptedAccountKeys: Array<{
        accountId: string
        accountKey: CryptoKey
      }> = []

      for (const ek of keysData.encrypted_keys || []) {
        const ak = await decryptAccountKey(ek.encrypted_key, originalUserKey)
        decryptedAccountKeys.push({ accountId: ek.account_id, accountKey: ak })
      }

      const newSalt = generateSalt()
      const { key: newUserKey, raw: newUserKeyRaw } = await deriveUserKeyExtractable(
        newPin,
        newSalt
      )

      const reEncryptedKeys: Array<{ accountId: string; encryptedKey: string }> = []
      for (const { accountId, accountKey } of decryptedAccountKeys) {
        const encryptedKey = await encryptAccountKey(accountKey, newUserKey)
        reEncryptedKeys.push({ accountId, encryptedKey })
      }

      const verificationBlob = await generateVerificationBlob(newUserKey)

      const cleaned = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ')
      const recoveryKey = await deriveRecoveryKey(cleaned, recoverySalt)
      const newRecoveryBlob = await generateRecoveryBlob(newUserKeyRaw, recoveryKey)

      const csrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('csrfToken='))
        ?.split('=')[1]

      const recoveryRes = await fetch('/api/proxy/auth/recover-bip39', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
        },
        body: JSON.stringify({
          newKeySalt: newSalt,
          verificationBlob,
          recoveryBlob: newRecoveryBlob,
          reEncryptedKeys,
        }),
        credentials: 'include',
      })

      if (!recoveryRes.ok) {
        const err = await recoveryRes.json()
        throw new Error(err.error || 'Error en recuperación')
      }

      useCryptoStore.getState().lock()
      setStep('done')

      setTimeout(() => router.push('/login'), 2000)
    } catch (err: any) {
      setError(err.message || 'Error en el proceso de recuperación')
      setStep('newpin')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md p-8 space-y-6 text-center">
          <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Recuperación exitosa</h1>
          <p className="text-muted-foreground">Redirigiendo a la página de inicio de sesión...</p>
        </div>
      </div>
    )
  }

  if (step === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md p-8 space-y-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" />
          <h1 className="text-xl font-bold text-foreground">Procesando recuperación</h1>
          <p className="text-muted-foreground">
            Esto puede tomar unos segundos. No cierres esta página.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        {step === 'mnemonic' ? (
          <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-amber-500" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Recupera tu cuenta</h1>
              <p className="text-muted-foreground mt-2">
                Ingresa tus 24 palabras de recuperación para restaurar el acceso a tus datos.
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <form onSubmit={handleMnemonicSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Frase de recuperación (24 palabras)
                </label>
                <textarea
                  value={mnemonic}
                  onChange={(e) => setMnemonic(e.target.value)}
                  placeholder="word1 word2 word3 ..."
                  className="w-full h-32 p-4 text-sm font-mono bg-muted/50 border border-border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading || !mnemonic.trim()}
                className="w-full py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Verificando...' : 'Continuar'}
              </button>
            </form>

            <p className="text-xs text-center text-muted-foreground">
              <Link href="/login" className="underline hover:text-foreground">
                Cancelar y volver al login
              </Link>
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Frase verificada</h1>
              <p className="text-muted-foreground mt-2">
                Ahora crea un nuevo PIN para proteger tus datos.
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <form onSubmit={handleNewPinSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nuevo PIN (6-8 dígitos)
                </label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={8}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full h-12 px-4 pr-12 text-center text-2xl tracking-widest bg-muted/50 border border-border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Confirmar PIN
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPin ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={8}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full h-12 px-4 pr-12 text-center text-2xl tracking-widest bg-muted/50 border border-border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPin(!showConfirmPin)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || newPin.length < 6 || confirmPin.length < 6}
                className="w-full py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Procesando...' : 'Recuperar cuenta'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

import Link from 'next/link'

export default function RecoveryPage() {
  return (
    <Suspense fallback={<RecoverySkeleton />}>
      <RecoveryForm />
    </Suspense>
  )
}

function RecoverySkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl p-8 space-y-6">
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-muted rounded-full" />
          <div className="h-7 bg-muted rounded w-48 mx-auto" />
          <div className="h-4 bg-muted rounded w-64 mx-auto" />
        </div>
        <div className="h-32 bg-muted rounded-xl" />
        <div className="h-12 bg-muted rounded-xl" />
      </div>
    </div>
  )
}
