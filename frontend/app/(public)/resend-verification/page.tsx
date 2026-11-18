'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button, ButtonLink, Input } from '@/components/ui'
import { AuthShell, FormAlert } from '@/components/auth'

const BACK_TO_LOGIN = { href: '/login', label: 'Iniciar sesión' }
const TITLE = 'Reenviar verificación'

function ResendVerificationContent() {
  const searchParams = useSearchParams()
  const initialEmail = searchParams.get('email') || ''

  const [email, setEmail] = useState(initialEmail)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')

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

  if (messageType === 'success') {
    return (
      <AuthShell title="Email enviado" description={message}>
        <ButtonLink href="/login" className="h-11 w-full sm:h-10">
          Ir a iniciar sesión
        </ButtonLink>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title={TITLE}
      description="Te enviaremos otro enlace para confirmar tu email."
      back={BACK_TO_LOGIN}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {messageType === 'error' && <FormAlert>{message}</FormAlert>}

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

export default function ResendVerificationPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title={TITLE} back={BACK_TO_LOGIN}>
          {null}
        </AuthShell>
      }
    >
      <ResendVerificationContent />
    </Suspense>
  )
}
