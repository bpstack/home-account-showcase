'use client'

import { useState, Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  KeyRound,
  ShieldAlert,
} from 'lucide-react'
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
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

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

  return (
    <div className="min-h-[100dvh] bg-background text-foreground relative overflow-hidden sm:p-4">
      {/* Background effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/20 dark:bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 dark:bg-blue-500/10 rounded-full blur-[120px] animate-pulse"
          style={{ animationDelay: '1s' }}
        />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 p-6 flex items-center justify-between max-w-7xl mx-auto">
        <Link
          href="/login"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-sm font-medium">Volver</span>
        </Link>
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-lg shadow-emerald-500/20">
            <span className="text-white font-bold text-sm">HA</span>
          </div>
        </Link>
      </header>

      {/* Main content */}
      <main className="min-h-[100dvh] flex items-center justify-center p-6 pt-20">
        <div className="w-full max-w-md sm:max-w-sm">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-blue-500/10 rounded-3xl blur-xl scale-105" />
            <div className="relative bg-card/80 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-2xl">
              {/* ── SUCCESS ── */}
              {phase === 'success' && (
                <div className="text-center">
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight mb-3">Contraseña actualizada</h1>
                  <p className="text-muted-foreground">
                    Ya puedes iniciar sesión con tu nueva contraseña. Redirigiendo...
                  </p>
                </div>
              )}

              {/* ── PHASE 1: New password ── */}
              {phase === 'password' && (
                <>
                  <div className="text-center mb-8">
                    <div className="w-14 h-14 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Lock className="w-7 h-7 text-blue-500" />
                    </div>
                    <h1 className="text-2xl sm:text-xl font-bold tracking-tight mb-2">
                      Nueva contraseña
                    </h1>
                    <p className="text-muted-foreground">Ingresa tu nueva contraseña.</p>
                  </div>

                  <form onSubmit={handlePasswordSubmit} className="space-y-5">
                    {error && (
                      <div className="p-4 text-sm bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        {error}
                      </div>
                    )}

                    <div className="space-y-2">
                      <label htmlFor="password" className="text-sm font-medium">
                        Nueva contraseña
                      </label>
                      <div
                        className={`relative transition-all duration-300 ${focusedField === 'password' ? 'scale-[1.02]' : ''}`}
                      >
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                          <Lock
                            className={`w-4 h-4 transition-colors duration-300 ${focusedField === 'password' ? 'text-blue-500' : ''}`}
                          />
                        </div>
                        <input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          onFocus={() => setFocusedField('password')}
                          onBlur={() => setFocusedField(null)}
                          placeholder="••••••••"
                          required
                          disabled={!token}
                          autoFocus
                          className={`w-full h-12 pl-11 pr-12 bg-muted/50 border-2 rounded-xl outline-none transition-all duration-300 ${
                            focusedField === 'password'
                              ? 'border-blue-500 bg-background shadow-lg shadow-blue-500/10'
                              : 'border-transparent hover:border-border'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="confirmPassword" className="text-sm font-medium">
                        Confirmar contraseña
                      </label>
                      <div
                        className={`relative transition-all duration-300 ${focusedField === 'confirm' ? 'scale-[1.02]' : ''}`}
                      >
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                          <Lock
                            className={`w-4 h-4 transition-colors duration-300 ${focusedField === 'confirm' ? 'text-blue-500' : ''}`}
                          />
                        </div>
                        <input
                          id="confirmPassword"
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          onFocus={() => setFocusedField('confirm')}
                          onBlur={() => setFocusedField(null)}
                          placeholder="••••••••"
                          required
                          disabled={!token}
                          className={`w-full h-12 pl-11 pr-4 bg-muted/50 border-2 rounded-xl outline-none transition-all duration-300 ${
                            focusedField === 'confirm'
                              ? 'border-blue-500 bg-background shadow-lg shadow-blue-500/10'
                              : 'border-transparent hover:border-border'
                          }`}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !token || !newPassword || !confirmPassword}
                      className="group relative w-full h-12 bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 sm:h-10"
                    >
                      <span
                        className={`flex items-center justify-center gap-2 transition-all duration-300 ${loading ? 'opacity-0' : ''}`}
                      >
                        Continuar
                      </span>
                      {loading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        </div>
                      )}
                    </button>
                  </form>

                  <p className="text-center text-sm text-muted-foreground mt-5">
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-1 hover:text-emerald-500 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Volver al login
                    </Link>
                  </p>
                </>
              )}

              {/* ── PHASE 2: BIP39 re-encryption ── */}
              {phase === 'bip39' && (
                <>
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <KeyRound className="w-7 h-7 text-emerald-500" />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight mb-2">Frase de recuperación</h1>
                    <p className="text-sm text-muted-foreground">
                      Tus datos están cifrados con tu contraseña anterior. Introduce tus{' '}
                      <strong>24 palabras de recuperación</strong> para migrar el cifrado a tu nueva
                      contraseña.
                    </p>
                  </div>

                  <form onSubmit={handleBip39Submit} className="space-y-4">
                    {bip39Error && (
                      <div className="p-4 text-sm bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        {bip39Error}
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Frase de recuperación (24 palabras)
                      </label>
                      <textarea
                        value={mnemonic}
                        onChange={(e) => setMnemonic(e.target.value)}
                        placeholder="palabra1 palabra2 palabra3 ..."
                        rows={4}
                        autoFocus
                        className="w-full px-4 py-3 bg-muted/50 border-2 border-transparent hover:border-border focus:border-emerald-500 focus:bg-background rounded-xl outline-none transition-all duration-300 text-sm font-mono resize-none shadow-sm focus:shadow-lg focus:shadow-emerald-500/10"
                      />
                      <p className="text-xs text-muted-foreground">
                        Escribe las palabras separadas por espacios, en minúsculas.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={bip39Loading || mnemonic.trim().split(/\s+/).length < 24}
                      className="group relative w-full h-12 bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      <span
                        className={`flex items-center justify-center gap-2 transition-all duration-300 ${bip39Loading ? 'opacity-0' : ''}`}
                      >
                        Restaurar acceso
                      </span>
                      {bip39Loading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        </div>
                      )}
                    </button>
                  </form>

                  {/* Skip option */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-start gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl mb-3">
                      <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">
                        Si omites este paso, tus datos financieros cifrados quedarán inaccesibles
                        hasta que uses tu frase de recuperación.
                      </p>
                    </div>
                    <button
                      onClick={handleSkip}
                      disabled={skipping}
                      className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2 disabled:opacity-50"
                    >
                      {skipping ? 'Procesando...' : 'Omitir y solo cambiar contraseña →'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordSkeleton />}>
      <ResetPasswordForm />
    </Suspense>
  )
}

function ResetPasswordSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  )
}
