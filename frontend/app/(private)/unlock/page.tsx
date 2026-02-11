'use client'

import { useState, useRef, Suspense, useEffect } from 'react'
import React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { ApiError } from '@/lib/apiClient'
import { Eye, EyeOff, Lock, Shield, Loader2, Key, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { Skeleton } from '@/components/ui/Skeleton'

function UnlockForm() {
  const router = useRouter()
  const { unlock, user } = useAuth()
  const authError = useAuthStore((s) => s.authError)
  const clearError = useAuthStore((s) => s.clearError)

  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [buttonPressed, setButtonPressed] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    clearError()
  }, [clearError])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Visual press feedback
    setButtonPressed(true)
    setTimeout(() => setButtonPressed(false), 150)

    setIsSubmitting(true)
    try {
      await unlock(password)
      setUnlocked(true)
    } catch (err) {
      setIsSubmitting(false)
      if (err instanceof ApiError && err.status === 401) {
        setError('Sesión expirada. Inicia sesión de nuevo.')
      } else if (err instanceof ApiError && err.status >= 500) {
        setError('Error del servidor. Inténtalo de nuevo en unos minutos.')
      } else if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Sin conexión. Verifica tu internet.')
      } else if (err instanceof Error && (err.message.includes('Wrong password') || err.message.includes('User key not available'))) {
        setError('Contraseña incorrecta.')
      } else {
        setError('Error al desbloquear. Verifica tu contraseña.')
      }
    }
  }

  // Transition screen after successful unlock
  if (unlocked) {
    return (
      <div className="min-h-[100dvh] bg-background text-foreground relative overflow-hidden flex items-center justify-center">
        <div className="fixed inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/20 dark:bg-amber-500/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/20 dark:bg-orange-500/10 rounded-full blur-[120px]" />
        </div>

        <div className="text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="mx-auto w-14 h-14 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-7 h-7 text-white" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight">Desbloqueado</h2>
            <p className="text-muted-foreground text-sm">Cargando tus datos...</p>
          </div>
          <div className="w-full max-w-xs mx-auto space-y-3 pt-2">
            <Skeleton className="h-3 w-full rounded-full" />
            <Skeleton className="h-3 w-3/4 mx-auto rounded-full" />
            <Skeleton className="h-3 w-1/2 mx-auto rounded-full" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground relative overflow-hidden sm:p-4">
      {/* Background effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/20 dark:bg-amber-500/10 rounded-full blur-[120px] animate-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/20 dark:bg-orange-500/10 rounded-full blur-[120px] animate-pulse"
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
        <div className="flex items-center gap-2 text-muted-foreground">
          <Shield className="w-4 h-4" />
          <span className="text-sm font-medium">Sesión segura</span>
        </div>
      </header>

      {/* Main content */}
      <main className="min-h-[100dvh] flex items-center justify-center p-6 pt-20">
        <div className="w-full max-w-md sm:max-w-sm">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-3xl blur-xl scale-105" />

            <div className="relative bg-card/80 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-2xl">
              {/* Welcome text */}
              <div className="text-center mb-8">
                <div className="mx-auto w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-2xl sm:text-xl font-bold tracking-tight mb-2">
                  Tu sesión está bloqueada
                </h1>
                <p className="text-muted-foreground">
                  Hola, <span className="font-medium text-foreground">{user?.email}</span>
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  Introduce tu contraseña o PIN para desbloquear tus datos cifrados
                </p>
              </div>

              {/* Security notice */}
              <div className="mb-6 p-4 bg-muted/50 rounded-xl border border-border/50">
                <div className="flex items-start gap-3">
                  <Lock className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Tus claves de cifrado viven solo en memoria. Tras cerrar la pestaña o recargar,
                    necesitarás tu contraseña para descifrar tus datos.
                  </p>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Error message */}
                {(error || authError) && (
                  <div className="p-4 text-sm bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 animate-in slide-in-from-top-2 duration-300">
                    {error || authError}
                  </div>
                )}

                {/* Password field */}
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    Contraseña o PIN
                  </label>
                  <div
                    className={`relative transition-all duration-300 ${focusedField === 'password' ? 'scale-[1.02]' : ''}`}
                  >
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Lock
                        className={`w-4 h-4 transition-colors duration-300 ${focusedField === 'password' ? 'text-amber-500' : ''}`}
                      />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      required
                      className={`w-full h-12 pl-11 pr-12 bg-muted/50 border-2 rounded-xl outline-none transition-all duration-300 ${
                        focusedField === 'password'
                          ? 'border-amber-500 bg-background shadow-lg shadow-amber-500/10'
                          : 'border-transparent hover:border-border'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  ref={buttonRef}
                  type="submit"
                  disabled={isSubmitting || !password}
                  className={`group relative w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl overflow-hidden transition-all duration-150 hover:shadow-lg hover:shadow-amber-500/30 disabled:opacity-70 disabled:cursor-not-allowed sm:h-10 ${
                    buttonPressed
                      ? 'scale-95 shadow-inner brightness-90'
                      : 'hover:scale-[1.02]'
                  }`}
                >
                  <span
                    className={`flex items-center justify-center gap-2 transition-all duration-300 ${isSubmitting ? 'opacity-0' : ''}`}
                  >
                    Desbloquear
                    <Key className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                  {isSubmitting && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Desbloqueando...</span>
                      </div>
                    </div>
                  )}
                </button>
              </form>

              {/* Logout option */}
              <p className="mt-6 text-center text-sm text-muted-foreground">
                ¿No eres tú?{' '}
                <button
                  onClick={() => {
                    clearError()
                    router.push('/login')
                  }}
                  className="font-semibold text-amber-500 hover:text-amber-600 transition-colors"
                >
                  Cerrar sesión
                </button>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function UnlockPage() {
  return (
    <Suspense fallback={<UnlockSkeleton />}>
      <UnlockForm />
    </Suspense>
  )
}

function UnlockSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-background relative overflow-hidden">
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-[120px]" />
      </div>

      <main className="min-h-[100dvh] flex items-center justify-center p-6">
        <div className="w-full max-w-md sm:max-w-sm">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-3xl blur-xl scale-105" />
            <div className="relative bg-card/80 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-2xl space-y-6">
              <div className="flex justify-center">
                <Skeleton className="w-14 h-14 rounded-2xl" />
              </div>
              <div className="text-center space-y-3">
                <Skeleton className="h-7 w-48 mx-auto" />
                <Skeleton className="h-4 w-32 mx-auto" />
                <Skeleton className="h-4 w-56 mx-auto" />
              </div>
              <Skeleton className="h-20 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
