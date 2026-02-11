'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function AuthCallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      const accessToken = searchParams.get('accessToken')
      const refreshToken = searchParams.get('refreshToken')
      const csrfToken = searchParams.get('csrfToken')
      const redirect = searchParams.get('redirect') || '/dashboard'
      const errorParam = searchParams.get('error')

      if (errorParam) {
        setError(errorParam === 'oauth_invalid' ? 'Error de autenticación OAuth' : errorParam)
        return
      }

      if (!accessToken || !refreshToken || !csrfToken) {
        setError('Tokens de autenticación no encontrados')
        return
      }

      try {
        const res = await fetch('/api/auth/oauth-callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken, refreshToken, csrfToken }),
        })

        if (!res.ok) {
          throw new Error('Error al establecer sesión')
        }

        router.replace(redirect)
      } catch (err) {
        console.error('Auth callback error:', err)
        setError('Error al establecer la sesión')
      }
    }

    handleCallback()
  }, [searchParams, router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <p className="text-red-500 mb-4">{error}</p>
          <a href="/login" className="text-blue-500 hover:underline">
            Volver al login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Estableciendo sesión...</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthCallbackSkeleton />}>
      <AuthCallbackHandler />
    </Suspense>
  )
}

function AuthCallbackSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  )
}
