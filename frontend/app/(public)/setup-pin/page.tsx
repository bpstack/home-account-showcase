'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCryptoStore } from '@/stores/cryptoStore'

export default function SetupPinPage() {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const csrfToken = searchParams.get('csrf')
  const { deriveAndSetUserKey, generateAndSaveAccountKey, setUnlocked } = useCryptoStore()

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
      // Usar proxy de Next.js para llamar al backend
      const keysRes = await fetch('/api/proxy/auth/keys', {
        credentials: 'include',
      })
      const keysData = await keysRes.json()

      if (!keysData.success) {
        throw new Error(keysData.error || 'Error al obtener claves')
      }

      await deriveAndSetUserKey(pin, keysData.key_salt)
      await generateAndSaveAccountKey(csrfToken || undefined)
      setUnlocked()

      router.push('/dashboard')
    } catch (err) {
      setError('Error configurando cifrado. Intenta de nuevo.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-layer-1 rounded-xl border border-layer-2">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary">Configura tu PIN de cifrado</h1>
          <p className="text-text-secondary mt-2">
            Este PIN protege tus datos financieros. Necesitarás introducirlo cada vez que inicies sesión.
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

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || pin.length < 6 || confirmPin.length < 6}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Configurando...' : 'Guardar PIN'}
          </button>
        </form>

        <p className="text-xs text-text-tertiary text-center">
          ⚠️ Si olvidas tu PIN, no podrás recuperar tus datos cifrados.
        </p>
      </div>
    </div>
  )
}
