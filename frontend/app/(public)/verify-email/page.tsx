'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react'

function VerifyEmailContent() {
  const searchParams = useSearchParams()

  const token = searchParams.get('token')
  const email = searchParams.get('email')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token || !email) {
      setStatus('error')
      setMessage('Enlace de verificación inválido. Faltan parámetros.')
      return
    }

    fetch(
      `/api/proxy/auth/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.verified) {
          setStatus('success')
          setMessage(data.message || 'Email verificado correctamente.')
        } else {
          setStatus('error')
          setMessage(data.message || 'No se pudo verificar el email.')
        }
      })
      .catch((err) => {
        console.error('Verification error:', err)
        setStatus('error')
        setMessage('Error de conexión. Intenta de nuevo.')
      })
  }, [token, email])

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
            <div className="relative bg-card/80 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-2xl text-center">
              {status === 'loading' ? (
                <>
                  <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                    <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                  </div>
                  <p className="text-muted-foreground">Verificando tu email...</p>
                </>
              ) : status === 'success' ? (
                <>
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight mb-3">Email verificado</h1>
                  <p className="text-muted-foreground mb-8">{message}</p>
                  <Link
                    href="/login"
                    className="group relative w-full h-12 bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-[1.02] flex items-center justify-center gap-2"
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
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <XCircle className="w-8 h-8 text-red-500" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight mb-3">Verificación fallida</h1>
                  <p className="text-muted-foreground mb-8">{message}</p>
                  <Link
                    href="/resend-verification"
                    className="w-full h-12 bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-[1.02] flex items-center justify-center mb-4"
                  >
                    Solicitar nuevo email
                  </Link>
                  <Link
                    href="/login"
                    className="text-sm text-muted-foreground hover:text-emerald-500 transition-colors"
                  >
                    Volver a iniciar sesión
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] bg-background flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  )
}
