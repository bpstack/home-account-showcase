'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ButtonLink } from '@/components/ui'
import { AuthShell } from '@/components/auth'
import { internalPath } from '@/lib/internalPath'

const LOADING_TITLE = 'Iniciando sesión…'

function AuthCallbackHandler() {
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  // Runs once: removing the code from the address bar changes the router state and re-runs the
  // effect (twice in development), which found no code and showed an error while the first run
  // was still exchanging it
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const handleCallback = async () => {
      // One-time code in the fragment: the browser never sends it to a server, so it stays out
      // of logs and the Referer. It is removed from the address bar at once.
      const code = new URLSearchParams(window.location.hash.slice(1)).get('code')
      if (code) window.history.replaceState(null, '', window.location.pathname)

      // A fixed text: what comes in the URL is never shown as is
      if (searchParams.get('error')) {
        setError('Error de autenticación OAuth')
        return
      }

      if (!code) {
        setError('Falta el código de inicio de sesión. Vuelve a intentarlo.')
        return
      }

      try {
        // The route exchanges the code with the backend, once, and sets the session cookies
        const res = await fetch('/api/auth/oauth-callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })

        if (!res.ok) {
          throw new Error('Error al establecer sesión')
        }

        const { next } = (await res.json()) as { next?: string }
        const step = next === 'setup-pin' ? '/setup-pin' : '/unlock'

        // Destination saved before the OAuth (e.g. /invite/[token]): reached after the PIN step
        const savedRedirect = internalPath(sessionStorage.getItem('oauth_redirect'))
        sessionStorage.removeItem('oauth_redirect')

        // Full page navigation to ensure cookies are applied
        window.location.href = savedRedirect
          ? `${step}?from=${encodeURIComponent(savedRedirect)}`
          : step
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
