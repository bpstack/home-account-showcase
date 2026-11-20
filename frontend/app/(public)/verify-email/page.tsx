'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { ButtonLink } from '@/components/ui'
import { AuthShell } from '@/components/auth'

const BACK_TO_LOGIN = { href: '/login', label: 'Iniciar sesión' }
const LOADING_TITLE = 'Verificando tu email…'

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

  if (status === 'loading') {
    return <AuthShell title={LOADING_TITLE}>{null}</AuthShell>
  }

  if (status === 'success') {
    return (
      <AuthShell title="Email verificado" description={message}>
        <ButtonLink href="/login" className="h-11 w-full sm:h-10">
          Iniciar sesión
        </ButtonLink>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="No se pudo verificar" description={message} back={BACK_TO_LOGIN}>
      <ButtonLink href="/resend-verification" className="h-11 w-full sm:h-10">
        Pedir otro enlace
      </ButtonLink>
    </AuthShell>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<AuthShell title={LOADING_TITLE}>{null}</AuthShell>}>
      <VerifyEmailContent />
    </Suspense>
  )
}
