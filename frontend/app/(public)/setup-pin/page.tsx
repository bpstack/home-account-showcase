'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { useCryptoStore } from '@/stores/cryptoStore'
import { useAuthStore } from '@/stores/authStore'
import { accounts, auth } from '@/lib/apiClient'
import {
  generateVerificationBlob,
  generateBIP39Mnemonic,
  generateSalt,
  deriveRecoveryKey,
  deriveUserKeyExtractable,
  generateRecoveryBlob,
  encryptAccountKey,
  verifyUserKey,
} from '@/lib/crypto'
import { toast } from 'sonner'

interface KeysData {
  key_salt: string
  encrypted_keys?: Array<{ account_id: string; encrypted_key: string; key_version: number }>
  verification_blob?: string | null
}

function SetupPinForm() {
  // Phases:
  //  'loading'  → fetching keys from server to determine next step
  //  'password' → user must enter login password to unlock (no separate PIN yet, keys lost on F5)
  //  'pin'      → create the new numeric PIN
  //  'bip39'    → show recovery mnemonic
  const [phase, setPhase] = useState<'loading' | 'password' | 'pin' | 'bip39'>('loading')
  const [keysData, setKeysData] = useState<KeysData | null>(null)

  // password phase
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  // pin phase
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinLoading, setPinLoading] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [showConfirmPin, setShowConfirmPin] = useState(false)

  // bip39 phase
  const [mnemonic, setMnemonic] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const csrfToken = searchParams.get('csrf')
  const fromParam = searchParams.get('from') || '/dashboard'
  const { deriveAndSetUserKey, generateAndSaveAccountKey, forceUnlockAfterSetup } = useCryptoStore()

  // On mount: fetch keys and decide initial phase
  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/proxy/auth/keys', { credentials: 'include' })
        const data = await res.json()
        if (!data.success) throw new Error(data.error || 'Error al obtener claves')
        setKeysData(data)

        const { accountKeys } = useCryptoStore.getState()
        const hasKeysInMemory = accountKeys.size > 0
        const hasKeysInDB = data.encrypted_keys?.length > 0

        if (hasKeysInMemory) {
          // Already unlocked (e.g. came here via /unlock fallback) → go straight to PIN
          setPhase('pin')
        } else if (hasKeysInDB) {
          // Keys exist in DB but not in memory (F5 scenario) → need password first
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
  }, [])

  // Step 1: unlock with login password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!keysData) return
    setPasswordError('')
    setPasswordLoading(true)
    try {
      const cryptoStore = useCryptoStore.getState()
      await cryptoStore.deriveAndSetUserKey(password, keysData.key_salt)
      const userKey = useCryptoStore.getState().userKey
      if (!userKey) throw new Error('No se pudo derivar la clave')

      if (keysData.verification_blob) {
        const isValid = await verifyUserKey(keysData.verification_blob, userKey)
        if (!isValid) {
          cryptoStore.lock()
          setPasswordError('Contraseña incorrecta')
          return
        }
      }

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

      await deriveAndSetUserKey(pin, kd.key_salt)

      const cryptoState = useCryptoStore.getState()
      const hasExistingKeys = cryptoState.accountKeys.size > 0

      if (hasExistingKeys) {
        // Re-encrypt existing account keys with the new PIN-derived UserKey
        const newUserKey = cryptoState.userKey!
        for (const [accountId, { key }] of cryptoState.accountKeys) {
          const newEncryptedKey = await encryptAccountKey(key, newUserKey)
          await accounts.saveAccountKey(accountId, newEncryptedKey)
        }
      } else {
        // OAuth / fresh setup → create a new account
        await generateAndSaveAccountKey(effectiveCsrf || undefined)
      }

      const userKey = useCryptoStore.getState().userKey
      if (userKey) {
        await auth.saveVerificationBlob(await generateVerificationBlob(userKey))

        // Mark separate PIN as configured
        useAuthStore.getState().setHasSeparatePin(true)

        // Generate BIP39 recovery phrase
        const words = generateBIP39Mnemonic()
        const recoverySalt = generateSalt()
        const recoveryKey = await deriveRecoveryKey(words, recoverySalt)
        const { raw: userKeyRaw } = await deriveUserKeyExtractable(pin, kd.key_salt)
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

  // Loading
  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    )
  }

  // Step 1 — password
  if (phase === 'password') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md p-8 space-y-6 bg-layer-1 rounded-xl border border-layer-2">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Volver atrás
          </button>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-text-primary">Configura tu PIN de cifrado</h1>
            <p className="text-text-secondary mt-2">
              Primero confirma tu contraseña de acceso para desbloquear tus datos.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Contraseña de acceso
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-layer-3 bg-background focus:ring-2 focus:ring-blue-500"
                placeholder="Tu contraseña"
                autoFocus
              />
            </div>

            {passwordError && <p className="text-red-500 text-sm text-center">{passwordError}</p>}

            <button
              type="submit"
              disabled={passwordLoading || !password}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {passwordLoading ? 'Verificando...' : 'Continuar'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Step 3 — BIP39 mnemonic
  if (phase === 'bip39') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-lg p-8 space-y-6 bg-layer-1 rounded-xl border border-layer-2">
          <button
            onClick={() => setPhase('pin')}
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Volver atrás
          </button>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-text-primary">
              Guarda tu frase de recuperación
            </h1>
            <p className="text-text-secondary mt-2">
              Estas 24 palabras son la ÚNICA forma de recuperar tus datos si olvidas tu PIN.
              Cópialas y guárdalas en un lugar seguro offline.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 p-4 bg-background rounded-lg border border-layer-3">
            {mnemonic.split(' ').map((word, i) => (
              <div key={i} className="flex items-center gap-2 p-2 text-sm">
                <span className="text-text-tertiary w-6 text-right">{i + 1}.</span>
                <span className="font-mono font-medium text-text-primary">{word}</span>
              </div>
            ))}
          </div>

          <button
            onClick={async () => {
              await navigator.clipboard.writeText(mnemonic)
              toast.success('Frase copiada al portapapeles', {
                duration: 3000,
                style: { background: '#22c55e', border: 'none', color: 'white' },
              })
            }}
            className="w-full py-2 text-sm border border-layer-3 rounded-lg hover:bg-layer-2 transition-all duration-200 active:scale-[0.98]"
          >
            Copiar al portapapeles
          </button>

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
            onClick={() => {
              forceUnlockAfterSetup()
              router.push(fromParam)
            }}
            disabled={!confirmed}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            Continuar al dashboard
          </button>
        </div>
      </div>
    )
  }

  // Step 2 — PIN creation
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-layer-1 rounded-xl border border-layer-2">
        {keysData?.encrypted_keys?.length ? (
          <button
            onClick={() => setPhase('password')}
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Volver atrás
          </button>
        ) : null}

        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary">Crea tu PIN de cifrado</h1>
          <p className="text-text-secondary mt-2">
            Este PIN protegerá tus datos financieros. Lo necesitarás cada vez que recargues la
            página.
          </p>
        </div>

        <form onSubmit={handlePinSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              PIN (6-8 dígitos)
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-3 pr-12 text-center text-2xl tracking-widest rounded-lg border border-layer-3 bg-background focus:ring-2 focus:ring-blue-500"
                placeholder="••••••"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
              >
                {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Confirmar PIN
            </label>
            <div className="relative">
              <input
                type={showConfirmPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-3 pr-12 text-center text-2xl tracking-widest rounded-lg border border-layer-3 bg-background focus:ring-2 focus:ring-blue-500"
                placeholder="••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPin(!showConfirmPin)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
              >
                {showConfirmPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {pinError && <p className="text-red-500 text-sm text-center">{pinError}</p>}

          <button
            type="submit"
            disabled={pinLoading || pin.length < 6 || confirmPin.length < 6}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pinLoading ? 'Configurando...' : 'Guardar PIN'}
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
