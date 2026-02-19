'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'

function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/proxy/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al enviar el correo')
      }

      setSuccess(true)
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
                  <h1 className="text-2xl font-bold tracking-tight mb-3">Correo enviado</h1>
                  <p className="text-muted-foreground mb-8">
                    Si el email existe en nuestro sistema, recibirás instrucciones para restablecer
                    tu contraseña.
                  </p>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-emerald-500 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Volver al login
                  </Link>
                </div>
              ) : (
                <>
                  <div className="text-center mb-8">
                    <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-7 h-7 text-emerald-500" />
                    </div>
                    <h1 className="text-2xl sm:text-xl font-bold tracking-tight mb-2">
                      ¿Olvidaste tu contraseña?
                    </h1>
                    <p className="text-muted-foreground">
                      Ingresa tu email y te enviaremos un enlace para restablecerla.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                      <div className="p-4 text-sm bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        {error}
                      </div>
                    )}

                    <div className="space-y-2">
                      <label htmlFor="email" className="text-sm font-medium">
                        Email
                      </label>
                      <div
                        className={`relative transition-all duration-300 ${focused ? 'scale-[1.02]' : ''}`}
                      >
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                          <Mail
                            className={`w-4 h-4 transition-colors duration-300 ${focused ? 'text-emerald-500' : ''}`}
                          />
                        </div>
                        <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onFocus={() => setFocused(true)}
                          onBlur={() => setFocused(false)}
                          placeholder="tu@email.com"
                          required
                          autoFocus
                          className={`w-full h-12 pl-11 pr-4 bg-muted/50 border-2 rounded-xl outline-none transition-all duration-300 ${
                            focused
                              ? 'border-emerald-500 bg-background shadow-lg shadow-emerald-500/10'
                              : 'border-transparent hover:border-border'
                          }`}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !email.trim()}
                      className="group relative w-full h-12 bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 sm:h-10"
                    >
                      <span
                        className={`flex items-center justify-center gap-2 transition-all duration-300 ${loading ? 'opacity-0' : ''}`}
                      >
                        Enviar enlace de recuperación
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

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<ForgotPasswordSkeleton />}>
      <ForgotPasswordForm />
    </Suspense>
  )
}

function ForgotPasswordSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  )
}
