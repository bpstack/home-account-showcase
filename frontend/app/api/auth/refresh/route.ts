import { NextRequest, NextResponse } from 'next/server'
import { isAllowedOrigin, applySession, refreshSession } from '../config'

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  if (!isAllowedOrigin(origin)) {
    return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 })
  }

  try {
    const refreshToken = req.cookies.get('refreshToken')?.value

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token' }, { status: 401 })
    }

    const session = await refreshSession(refreshToken)

    if (!session) {
      // Refresh falló - limpiar cookies
      const response = NextResponse.json({ error: 'Token expirado' }, { status: 401 })
      response.cookies.delete('accessToken')
      response.cookies.delete('refreshToken')
      response.cookies.delete('csrfToken')
      return response
    }

    const response = NextResponse.json({ success: true, csrfToken: session.csrfToken })
    // Access, CSRF and, when the backend rotates it, the refresh token
    applySession(response, session)
    return response
  } catch (error) {
    console.error('Refresh proxy error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
