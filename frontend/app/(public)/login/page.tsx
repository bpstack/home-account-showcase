'use client'

import { useState, Suspense } from 'react'
import React from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth, PinRequiredError } from '@/hooks/useAuth'
import { ApiError } from '@/lib/apiClient'
import { Button, Input, PasswordInput } from '@/components/ui'
import { AuthShell, FormAlert, OAuthButtons } from '@/components/auth'

type PinData = {
  keySalt: string
  encryptedKeys: Array<{ account_id: string; encrypted_key: string; key_version: number }>
  verificationBlob: string
  redirectTo: string
}

const submitClass = 'h-11 w-full sm:h-10'

function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const redirect = searchParams.get('redirect')

  const { login, unlockAfterLogin } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  // PIN step state (shown when login() detects a separate encryption PIN)
  const [pinData, setPinData] = useState<PinData | null>(null)
  const [pinValue, setPinValue] = useState('')
  const [pinError, setPinError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      await login(email, password, redirect || undefined)
    } catch (err) {
      if (err instanceof PinRequiredError) {
        setPinData({
          keySalt: err.keySalt,
          encryptedKeys: err.encryptedKeys,
          verificationBlob: err.verificationBlob,
          redirectTo: err.redirectTo,
        })
        return
      }
      if (err instanceof ApiError) {
        // Handle email not verified error
        if ((err as any).code === 'EMAIL_NOT_VERIFIED') {
          const userEmail = (err as any).email || email
          router.push(`/resend-verification?email=${encodeURIComponent(userEmail)}`)
          return
        }
        setError(err.message)
      } else {
        setError('Error al conectar con el servidor')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pinData) return
    setIsLoading(true)
    setPinError('')

    try {
      await unlockAfterLogin(
        pinValue,
        pinData.keySalt,
        pinData.encryptedKeys,
        pinData.verificationBlob,
        pinData.redirectTo
      )
    } catch (err) {
      setPinError((err as Error).message || 'PIN incorrecto')
    } finally {
      setIsLoading(false)
    }
  }

  if (pinData) {
    return (
      <AuthShell
        title="PIN de cifrado"
        description="Tu cuenta tiene un PIN de cifrado aparte. Introdúcelo para acceder a tus datos."
      >
        <form onSubmit={handlePinSubmit} className="space-y-4">
          {pinError && <FormAlert>{pinError}</FormAlert>}

          <PasswordInput
            id="pin"
            label="PIN (6 a 8 dígitos)"
            subject="PIN"
            inputMode="numeric"
            autoComplete="off"
            maxLength={8}
            value={pinValue}
            onChange={(e) => setPinValue(e.target.value.replace(/\D/g, '').slice(0, 8))}
            autoFocus
            required
            className="h-11 tracking-widest sm:h-10"
          />

          <Button
            type="submit"
            isLoading={isLoading}
            disabled={pinValue.length < 6}
            className={submitClass}
          >
            Desbloquear
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={submitClass}
            onClick={() => {
              setPinData(null)
              setPinValue('')
              setPinError('')
            }}
          >
            Volver
          </Button>
        </form>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Inicia sesión" backToHome>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <FormAlert>{error}</FormAlert>}

        <Input
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-11 sm:h-10"
        />

        <div>
          <div className="mb-1 flex items-baseline justify-between gap-4">
            <label htmlFor="password" className="text-sm font-medium">
              Contraseña
            </label>
            <Link
              href="/forgot-password"
              className="rounded-sm text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              ¿La olvidaste?
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-11 sm:h-10"
          />
        </div>

        <Button type="submit" isLoading={isLoading} className={submitClass}>
          Iniciar sesión
        </Button>
      </form>

      <OAuthButtons redirect={redirect} />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{' '}
        <Link
          href="/register"
          className="rounded-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Regístrate
        </Link>
      </p>
    </AuthShell>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Inicia sesión" backToHome>
          {null}
        </AuthShell>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
