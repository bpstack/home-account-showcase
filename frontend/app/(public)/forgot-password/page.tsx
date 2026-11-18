'use client'

import { useState } from 'react'
import { Button, Input } from '@/components/ui'
import { AuthShell, FormAlert } from '@/components/auth'

const BACK_TO_LOGIN = { href: '/login', label: 'Iniciar sesión' }

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

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

  if (success) {
    return (
      <AuthShell
        title="Revisa tu correo"
        description="Si el email está registrado, recibirás un enlace para elegir una contraseña nueva."
        back={BACK_TO_LOGIN}
      >
        {null}
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Recuperar contraseña"
      description="Te enviaremos un enlace para elegir una nueva."
      back={BACK_TO_LOGIN}
    >
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
          autoFocus
          className="h-11 sm:h-10"
        />

        <Button
          type="submit"
          isLoading={loading}
          disabled={!email.trim()}
          className="h-11 w-full sm:h-10"
        >
          Enviar enlace
        </Button>
      </form>
    </AuthShell>
  )
}
