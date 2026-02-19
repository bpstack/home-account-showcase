'use client'

import { useState, Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const emailParam = searchParams.get('email')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  useEffect(() => {
    if (!token || !emailParam) {
      setError('Enlace de recuperación inválido o expirado')
    }
  }, [token, emailParam])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/proxy/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailParam,
          token: token,
          newPassword: password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al restablecer la contraseña')
      }

      setSuccess(true)
      setTimeout(() => router.push('/login'), 2000)
    } catch (err: unknown) {
      const error = err as Error
      setError(error.message || 'Error al conectar con el servidor')
    } finally {
      setLoading(false)
    }
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
              {success ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight mb-3">Contraseña actualizada</h1>
                  <p className="text-muted-foreground">
                    Ya puedes iniciar sesión con tu nueva contraseña. Redirigiendo...
                  </p>
                </div>
              ) : (
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

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                      <div className="p-4 text-sm bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        {error}
                      </div>
                    )}

                    {/* Password field */}
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
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
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

                    {/* Confirm password field */}
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
                      disabled={loading || !token || !password || !confirmPassword}
                      className="group relative w-full h-12 bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 sm:h-10"
                    >
                      <span
                        className={`flex items-center justify-center gap-2 transition-all duration-300 ${loading ? 'opacity-0' : ''}`}
                      >
                        Guardar contraseña
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
