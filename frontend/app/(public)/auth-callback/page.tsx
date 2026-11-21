'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ButtonLink } from '@/components/ui'
import { AuthShell } from '@/components/auth'

const LOADING_TITLE = 'Iniciando sesión…'

function AuthCallbackHandler() {
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      // One-time code in the fragment: the browser never sends it to a server, so it stays out
      // of logs and the Referer. It is removed from the address bar at once.
      const code = new URLSearchParams(window.location.hash.slice(1)).get('code')
      if (code) window.history.replaceState(null, '', window.location.pathname)

      const accessToken = searchParams.get('accessToken')
      const refreshToken = searchParams.get('refreshToken')
      const csrfToken = searchParams.get('csrfToken')
      let redirect = searchParams.get('redirect') || '/dashboard'
      const errorParam = searchParams.get('error')

      if (errorParam) {
        setError(errorParam === 'oauth_invalid' ? 'Error de autenticación OAuth' : errorParam)
        return
      }

      if (!code && (!accessToken || !refreshToken || !csrfToken)) {
        setError('Tokens de autenticación no encontrados')
        return
      }

      try {
        const res = await fetch('/api/auth/oauth-callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // Old format (tokens in the URL) only until the backend hands over a code
          body: JSON.stringify(code ? { code } : { accessToken, refreshToken, csrfToken }),
        })

        if (!res.ok) {
          throw new Error('Error al establecer sesión')
        }

        if (code) {
          const { next } = (await res.json()) as { next?: string }
          redirect = next === 'setup-pin' ? '/setup-pin' : '/unlock'
        }

        // Recuperar redirect guardado antes del OAuth (ej: /invite/[token])
        const savedRedirect = sessionStorage.getItem('oauth_redirect')
        sessionStorage.removeItem('oauth_redirect')

        // El redirect del backend es /unlock o /setup-pin
        // Añadir el savedRedirect como parámetro 'from' para que después del unlock
        // el usuario vaya al destino original
        let finalRedirect = redirect
        if (
          savedRedirect &&
          (redirect.startsWith('/unlock') || redirect.startsWith('/setup-pin'))
        ) {
          const separator = redirect.includes('?') ? '&' : '?'
          finalRedirect = `${redirect}${separator}from=${encodeURIComponent(savedRedirect)}`
        } else if (savedRedirect) {
          // Si el redirect no es unlock/setup-pin, usar el savedRedirect directamente
          finalRedirect = savedRedirect
        }

        // Full page navigation to ensure cookies are applied
        window.location.href = finalRedirect
      } catch (err) {
        console.error('Auth callback error:', err)
        setError('Error al establecer la sesión')
      }
    }

    handleCallback()
  }, [searchParams])

  if (error) {
    return (
      <AuthShell title="No se pudo iniciar sesión" description={error}>
        <ButtonLink href="/login" className="h-11 w-full sm:h-10">
          Volver a iniciar sesión
        </ButtonLink>
      </AuthShell>
    )
  }

  return <AuthShell title={LOADING_TITLE}>{null}</AuthShell>
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthShell title={LOADING_TITLE}>{null}</AuthShell>}>
      <AuthCallbackHandler />
    </Suspense>
  )
}
