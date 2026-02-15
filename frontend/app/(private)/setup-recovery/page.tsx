'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import {
  generateBIP39Mnemonic,
  generateSalt,
  deriveRecoveryKey,
  deriveUserKeyExtractable,
  generateRecoveryBlob,
} from '@/lib/crypto'
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Shield } from 'lucide-react'

function SetupRecoveryForm() {
  const router = useRouter()

  const [phase, setPhase] = useState<'pin' | 'generating' | 'show'>('pin')
  const [currentPin, setCurrentPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [mnemonic, setMnemonic] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (currentPin.length < 6 || currentPin.length > 8 || !/^\d+$/.test(currentPin)) {
      setError('El PIN debe tener entre 6 y 8 dígitos')
      return
    }

    setLoading(true)
    setPhase('generating')

    try {
      // Fetch key_salt from backend
      const keysRes = await fetch('/api/proxy/auth/keys', { credentials: 'include' })
      const keysData = await keysRes.json()
      if (!keysData.success || !keysData.key_salt) {
        throw new Error('No se pudo obtener la clave de cifrado')
      }

      // Derive extractable UserKey from current PIN
      const { raw: userKeyRaw } = await deriveUserKeyExtractable(currentPin, keysData.key_salt)

      // Generate mnemonic and recovery key
      const words = generateBIP39Mnemonic()
      const recoverySalt = generateSalt()
      const recoveryKey = await deriveRecoveryKey(words, recoverySalt)

      // Generate recovery blob
      const recoveryBlob = await generateRecoveryBlob(userKeyRaw, recoveryKey)

      // Save to backend
      const csrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('csrfToken='))
        ?.split('=')[1]

      const res = await fetch('/api/proxy/auth/recovery-blob', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
        },
        body: JSON.stringify({ recoveryBlob, recoverySalt }),
        credentials: 'include',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al guardar frase de recuperación')
      }

      // Show mnemonic to user
      setMnemonic(words)
      setPhase('show')
    } catch (err: any) {
      setError(err.message || 'Error al generar frase de recuperación')
      setPhase('pin')
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = () => {
    router.push('/profile')
  }

  if (phase === 'generating') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md p-8 space-y-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" />
          <h1 className="text-xl font-bold text-foreground">Generando frase de recuperación</h1>
          <p className="text-muted-foreground">Esto puede tomar unos segundos...</p>
        </div>
      </div>
    )
  }

  if (phase === 'show') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-lg space-y-6">
          <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Frase de recuperación generada</h1>
              <p className="text-muted-foreground mt-2">
                Estas 24 palabras son la ÚNICA forma de recuperar tus datos si olvidas tu PIN.
                Cópialas y guárdalas en un lugar seguro offline.
              </p>
            </div>

            {/* Grid of words */}
            <div className="grid grid-cols-3 gap-2 p-4 bg-muted/50 rounded-xl border border-border">
              {mnemonic.split(' ').map((word, i) => (
                <div key={i} className="flex items-center gap-2 p-2 text-sm">
                  <span className="text-muted-foreground w-6 text-right">{i + 1}.</span>
                  <span className="font-mono font-medium text-foreground">{word}</span>
                </div>
              ))}
            </div>

            {/* Copy button */}
            <button
              onClick={() => navigator.clipboard.writeText(mnemonic)}
              className="w-full py-2 text-sm border border-border rounded-lg hover:bg-muted"
            >
              Copiar al portapapeles
            </button>

            {/* Confirmation checkbox */}
            <label className="flex items-start gap-3 text-sm text-muted-foreground">
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
              className="w-full py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 disabled:opacity-50"
            >
              Continuar al perfil
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Configura tu frase de recuperación
            </h1>
            <p className="text-muted-foreground mt-2">
              Ingresa tu PIN actual para generar una frase de recuperación de 24 palabras. Esta
              frase te permitirá recuperar tus datos si olvidas tu PIN.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                PIN actual (6-8 dígitos)
              </label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={8}
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full h-12 px-4 pr-12 text-center text-2xl tracking-widest bg-muted/50 border border-border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="••••••"
                  autoFocus
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

            <button
              type="submit"
              disabled={loading || currentPin.length < 6}
              className="w-full py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Generando...' : 'Generar frase de recuperación'}
            </button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            <button
              onClick={() => router.push('/profile')}
              className="underline hover:text-foreground"
            >
              Cancelar
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SetupRecoveryPage() {
  return (
    <Suspense fallback={<SetupRecoverySkeleton />}>
      <SetupRecoveryForm />
    </Suspense>
  )
}

function SetupRecoverySkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 space-y-6">
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-muted rounded-full" />
          <div className="h-7 bg-muted rounded w-48 mx-auto" />
          <div className="h-4 bg-muted rounded w-64 mx-auto" />
        </div>
        <div className="h-12 bg-muted rounded-xl" />
        <div className="h-12 bg-muted rounded-xl" />
      </div>
    </div>
  )
}
