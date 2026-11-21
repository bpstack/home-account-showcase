'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { ApiError } from '@/lib/apiClient'
import { useAuthStore } from '@/stores/authStore'
import { Button, PasswordInput } from '@/components/ui'
import { AuthShell, FormAlert } from '@/components/auth'

const linkClass =
  'rounded-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

// Once the keys are unlocked, the private layout sends the user back to `?from=` (or /dashboard).
export default function UnlockPage() {
  const { unlock, logout, user } = useAuth()
  const authError = useAuthStore((s) => s.authError)
  const clearError = useAuthStore((s) => s.clearError)

  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showRecoveryLink, setShowRecoveryLink] = useState(false)

  useEffect(() => {
    clearError()
  }, [clearError])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await unlock(password)

      // Reset PIN attempts on successful unlock
      await fetch('/api/proxy/auth/reset-pin-attempts', {
        method: 'POST',
        credentials: 'include',
      })
      // Stays "submitting" until the layout navigates away.
    } catch (err) {
      setIsSubmitting(false)

      // Record failed PIN attempt
      try {
        const res = await fetch('/api/proxy/auth/record-failed-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        })
        const data = await res.json()

        if (data.locked) {
          setError('PIN bloqueado por 30 minutos. Demasiados intentos fallidos.')
          setShowRecoveryLink(true)
          return
        } else if (data.remaining <= 2) {
          setError(`PIN incorrecto. Te quedan ${data.remaining} intentos.`)
          setShowRecoveryLink(true)
          return
        }
      } catch {
        // Ignore tracking errors
      }

      if (err instanceof ApiError && err.status === 401) {
        setError('Sesión expirada. Inicia sesión de nuevo.')
      } else if (err instanceof ApiError && err.status >= 500) {
        setError('Error del servidor. Inténtalo de nuevo en unos minutos.')
      } else if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Sin conexión. Verifica tu internet.')
      } else if (
        err instanceof Error &&
        (err.message.includes('Wrong password') || err.message.includes('User key not available'))
      ) {
        setError('PIN incorrecto.')
        setShowRecoveryLink(true)
      } else {
        setError('Error al desbloquear. Verifica tu contraseña.')
      }
    }
  }

  return (
    <AuthShell title="Sesión bloqueada" description={user?.email}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {(error || authError) && <FormAlert>{error || authError}</FormAlert>}

        <PasswordInput
          id="password"
          label="Contraseña o PIN"
          subject="contraseña o PIN"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          required
          className="h-11 sm:h-10"
        />

        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={!password}
          className="h-11 w-full sm:h-10"
        >
          Desbloquear
        </Button>
      </form>

      <p className="mt-4 text-xs text-muted-foreground">
        Este dispositivo recordará tu PIN hasta que cierres sesión.
      </p>

      <p className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        {showRecoveryLink && (
          <Link href="/recovery" className={linkClass}>
            ¿Olvidaste el PIN?
          </Link>
        )}
        <button
          type="button"
          onClick={() => {
            clearError()
            logout()
          }}
          className={linkClass}
        >
          ¿No eres tú? Cerrar sesión
        </button>
      </p>
    </AuthShell>
  )
}
