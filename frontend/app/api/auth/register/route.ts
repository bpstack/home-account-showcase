import { NextRequest, NextResponse } from 'next/server'
import {
  BACKEND_URL,
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

    const backendRes = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    })

    const data = await backendRes.json()

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data.error || 'Error de registro' },
        { status: backendRes.status }
      )
    }

    const setCookieHeader = backendRes.headers.get('set-cookie')
    const cookies = parseCookies(setCookieHeader)

    const response = NextResponse.json({
      success: true,
      user: data.user,
      csrfToken: data.csrfToken,
    })

    if (cookies.accessToken) {
      response.cookies.set('accessToken', cookies.accessToken, accessTokenCookieOptions)
    }
    if (cookies.refreshToken) {
      response.cookies.set('refreshToken', cookies.refreshToken, refreshTokenCookieOptions)
    }
    if (cookies.csrfToken) {
      response.cookies.set('csrfToken', cookies.csrfToken, csrfTokenCookieOptions)
    }

    return response
  } catch (error) {
    console.error('Register proxy error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

function parseCookies(setCookieHeader: string | null): Record<string, string> {
  const cookies: Record<string, string> = {}
  if (!setCookieHeader) return cookies

  const cookieStrings = setCookieHeader.split(/,(?=[^;]+?=)/)
  for (const cookieStr of cookieStrings) {
    const [nameValue] = cookieStr.split(';')
    if (nameValue) {
      const [name, ...valueParts] = nameValue.trim().split('=')
      if (name && valueParts.length > 0) {
        cookies[name.trim()] = valueParts.join('=').trim()
      }
    }
  }
  return cookies
}
