'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react'

function ResendVerificationContent() {
  const searchParams = useSearchParams()
  const initialEmail = searchParams.get('email') || ''

  const [email, setEmail] = useState(initialEmail)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')
  const [focused, setFocused] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setMessageType('')

    try {
      const res = await fetch('/api/proxy/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })

      const data = await res.json()

      if (data.success) {
        setMessageType('success')
        if (data.alreadyVerified) {
          setMessage('Tu email ya está verificado. Puedes iniciar sesión.')
        } else {
          setMessage(data.message || 'Email enviado. Revisa tu bandeja de entrada.')
        }
      } else {
        setMessageType('error')
        setMessage(data.error || 'Error al enviar el email.')
      }
    } catch (err) {
      console.error('Resend error:', err)
      setMessageType('error')
      setMessage('Error de conexión. Intenta de nuevo.')
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
              {messageType === 'success' ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight mb-3">Email enviado</h1>
                  <p className="text-muted-foreground mb-8">{message}</p>
                  <Link
                    href="/login"
                    className="group w-full h-12 bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-[1.02] flex items-center justify-center gap-2 sm:h-10"
                  >
                    Ir a iniciar sesión
                    <svg
                      className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </Link>
                </div>
              ) : (
                <>
                  <div className="text-center mb-8">
                    <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-7 h-7 text-emerald-500" />
                    </div>
                    <h1 className="text-2xl sm:text-xl font-bold tracking-tight mb-2">
                      Reenviar verificación
                    </h1>
                    <p className="text-muted-foreground">
                      Introduce tu email para recibir un nuevo enlace.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {messageType === 'error' && (
                      <div className="p-4 text-sm bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 animate-in slide-in-from-top-2 duration-300">
                        {message}
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
                          required
                          autoComplete="email"
                          placeholder="tu@email.com"
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
                        Enviar email de verificación
                      </span>
                      {loading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        </div>
                      )}
                    </button>

                    <p className="text-center text-sm text-muted-foreground">
                      <Link href="/login" className="hover:text-emerald-500 transition-colors">
                        Volver a iniciar sesión
                      </Link>
                    </p>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function ResendVerificationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] bg-background flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      }
    >
      <ResendVerificationContent />
    </Suspense>
  )
}
