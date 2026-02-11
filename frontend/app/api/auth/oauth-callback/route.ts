import { NextRequest, NextResponse } from 'next/server'
import {
  isAllowedOrigin,
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
  csrfTokenCookieOptions,
} from '../config'

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  if (!isAllowedOrigin(origin)) {
    return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 })
  }

  try {
    const body = await req.json()
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
