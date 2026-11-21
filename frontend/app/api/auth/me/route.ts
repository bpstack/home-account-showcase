import { NextRequest, NextResponse } from 'next/server'
import { BACKEND_URL, isAllowedOrigin, applySession, refreshSession } from '../config'
import type { SessionCookies } from '@/lib/sessionCookies'

function fetchMe(accessToken: string) {
  return fetch(`${BACKEND_URL}/auth/me`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', Cookie: `accessToken=${accessToken}` },
    cache: 'no-store',
  })
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin')
  if (!isAllowedOrigin(origin)) {
    return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 })
  }

  try {
    let accessToken = req.cookies.get('accessToken')?.value
    const refreshToken = req.cookies.get('refreshToken')?.value
    // The session from a refresh made here, copied to the browser at the end
    let refreshed: SessionCookies | null = null

    // Si no hay accessToken pero sí refreshToken, intentar refresh
    if (!accessToken && refreshToken) {
      refreshed = await refreshSession(refreshToken)
      if (refreshed?.accessToken) accessToken = refreshed.accessToken
    }

    if (!accessToken) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    let backendRes = await fetchMe(accessToken)

    // Si el backend dice que el token expiró, intentar refresh una vez
    if (backendRes.status === 401 && refreshToken && !refreshed) {
      refreshed = await refreshSession(refreshToken)
      if (refreshed?.accessToken) backendRes = await fetchMe(refreshed.accessToken)
    }

    if (backendRes.status === 401) {
      // Refresh falló - limpiar cookies
      const response = NextResponse.json({ error: 'Sesión expirada' }, { status: 401 })
      response.cookies.delete('accessToken')
      response.cookies.delete('refreshToken')
      return response
    }

    const data = await backendRes.json()

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data.error || 'No autenticado' },
        { status: backendRes.status }
      )
    }

    const response = NextResponse.json({ success: true, user: data.user })
    if (refreshed) applySession(response, refreshed)
    return response
  } catch (error) {
    console.error('Me proxy error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
