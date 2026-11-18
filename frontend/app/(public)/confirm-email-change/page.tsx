'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { ButtonLink } from '@/components/ui'
import { AuthShell } from '@/components/auth'

const BACK_TO_SETTINGS = { href: '/profile', label: 'Configuración' }
const LOADING_TITLE = 'Confirmando el cambio de email…'

function ConfirmEmailChangeContent() {
  const searchParams = useSearchParams()

  const token = searchParams.get('token')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Enlace de confirmación inválido. Faltan parámetros.')
      return
    }

    fetch(`/api/proxy/auth/confirm-email-change?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.changed) {
          setStatus('success')
          setMessage(data.message || 'Email cambiado correctamente.')
        } else {
          setStatus('error')
          setMessage(data.message || 'No se pudo cambiar el email.')
        }
      })
      .catch((err) => {
        console.error('Confirm email change error:', err)
        setStatus('error')
        setMessage('Error de conexión. Intenta de nuevo.')
      })
  }, [token])

  if (status === 'loading') {
    return <AuthShell title={LOADING_TITLE}>{null}</AuthShell>
  }

  if (status === 'success') {
    return (
      <AuthShell
        title="Email cambiado"
        description={<>{message} Confirma el email nuevo para poder iniciar sesión.</>}
        back={BACK_TO_SETTINGS}
      >
        <ButtonLink href="/resend-verification" className="h-11 w-full sm:h-10">
          Reenviar el email de verificación
        </ButtonLink>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="No se pudo cambiar el email" description={message}>
      <ButtonLink href="/profile" className="h-11 w-full sm:h-10">
        Volver a configuración
      </ButtonLink>
    </AuthShell>
  )
}

export default function ConfirmEmailChangePage() {
  return (
    <Suspense fallback={<AuthShell title={LOADING_TITLE}>{null}</AuthShell>}>
      <ConfirmEmailChangeContent />
    </Suspense>
  )
}
