'use client'

import { useState, Suspense } from 'react'
import React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { ApiError } from '@/lib/apiClient'
import { validateRegister } from '@/validators/auth-validators'
import { Button, Input, PasswordInput } from '@/components/ui'
import { AuthShell, FormAlert, OAuthButtons } from '@/components/auth'

const HOME = { href: '/', label: 'Inicio' }

const fieldClass = 'h-11 sm:h-10'

function RegisterForm() {
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect')
  // Si viene de una invitación, no crear cuenta por defecto
  const isFromInvite = redirect?.startsWith('/invite/')

  const { register } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [accountName, setAccountName] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})

    const validation = validateRegister({
      name,
      email,
      password,
      confirmPassword,
      accountName: accountName || undefined,
    })

    if (!validation.success) {
      setFieldErrors(validation.errors)
      return
    }

    setIsLoading(true)

    try {
      await register(email, password, name, accountName || undefined, {
        skipDefaultAccount: isFromInvite,
        redirectTo: redirect || undefined,
      })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Error al conectar con el servidor')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell title="Crear cuenta" back={HOME}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <FormAlert>{error}</FormAlert>}

        <Input
          id="name"
          label="Tu nombre"
          autoComplete="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            clearFieldError('name')
          }}
          error={fieldErrors.name}
          required
          className={fieldClass}
        />

        <div>
          <label htmlFor="accountName" className="mb-1 block text-sm font-medium">
            Nombre de la cuenta{' '}
            <span className="font-normal text-muted-foreground">(opcional)</span>
          </label>
          <Input
            id="accountName"
            placeholder="Casa"
            autoComplete="off"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            error={fieldErrors.accountName}
            className={fieldClass}
          />
        </div>

        <Input
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            clearFieldError('email')
          }}
          error={fieldErrors.email}
          required
          className={fieldClass}
        />

        <div>
          <PasswordInput
            id="password"
            label="Contraseña"
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              clearFieldError('password')
            }}
            error={fieldErrors.password}
            aria-describedby={fieldErrors.password ? undefined : 'password-hint'}
            required
            className={fieldClass}
          />
          {!fieldErrors.password && (
            <p id="password-hint" className="mt-1 text-xs text-muted-foreground">
              Mínimo 6 caracteres, con un número y un símbolo.
            </p>
          )}
        </div>

        <PasswordInput
          id="confirmPassword"
          label="Repite la contraseña"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value)
            clearFieldError('confirmPassword')
          }}
          error={fieldErrors.confirmPassword}
          required
          className={fieldClass}
        />

        <Button type="submit" isLoading={isLoading} className="h-11 w-full sm:h-10">
          Crear cuenta
        </Button>
      </form>

      <OAuthButtons redirect={redirect} />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{' '}
        <Link
          href="/login"
          className="rounded-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Inicia sesión
        </Link>
      </p>
    </AuthShell>
  )
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Crear cuenta" back={HOME}>
          {null}
        </AuthShell>
      }
    >
      <RegisterForm />
    </Suspense>
  )
}
