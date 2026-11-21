import { NextRequest, NextResponse } from 'next/server'
import {
  BACKEND_URL,
  isAllowedOrigin,
  applySession,
  sessionFromBackend,
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
  csrfTokenCookieOptions,
} from '../config'

const NEXT_STEPS = ['unlock', 'setup-pin'] as const

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  if (!isAllowedOrigin(origin)) {
    return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 })
  }

  try {
    const body = await req.json()

    // One-time code: the backend exchanges it for the session cookies and says where to go next.
    // Only a route handler can set cookies on this domain, so the exchange happens here.
    if (typeof body.code === 'string' && body.code) {
      const backendRes = await fetch(`${BACKEND_URL}/auth/oauth/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: body.code }),
        cache: 'no-store',
      })
      const data = await backendRes.json().catch(() => ({}))
      if (!backendRes.ok) {
        return NextResponse.json({ error: 'Código de inicio de sesión no válido' }, { status: 401 })
      }

      const next = NEXT_STEPS.includes(data.next) ? data.next : 'unlock'
      const response = NextResponse.json({ success: true, next })
      applySession(response, sessionFromBackend(backendRes))
      return response
    }

    // Old format, tokens in the URL: only until the backend hands over a code
    const { accessToken, refreshToken, csrfToken } = body

    if (!accessToken || !refreshToken || !csrfToken) {
      return NextResponse.json({ error: 'Tokens missing' }, { status: 400 })
    }

    const response = NextResponse.json({ success: true })

    response.cookies.set('accessToken', accessToken, accessTokenCookieOptions)
    response.cookies.set('refreshToken', refreshToken, refreshTokenCookieOptions)
    response.cookies.set('csrfToken', csrfToken, csrfTokenCookieOptions)

    return response
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
