import { NextRequest, NextResponse } from 'next/server'
import { BACKEND_URL, isAllowedOrigin, accessTokenCookieOptions, csrfTokenCookieOptions } from '../config'

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

    // Proxy al backend con el refresh token
    const backendRes = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `refreshToken=${refreshToken}`,
      },
      cache: 'no-store',
    })

    const data = await backendRes.json()

    if (!backendRes.ok) {
      // Refresh falló - limpiar cookies
      const response = NextResponse.json(
        { error: data.error || 'Token expirado' },
        { status: 401 }
      )
      response.cookies.delete('accessToken')
      response.cookies.delete('refreshToken')
      response.cookies.delete('csrfToken')
      return response
    }

    // Extraer nuevo access token del backend
    const setCookieHeader = backendRes.headers.get('set-cookie')
    const cookies = parseCookies(setCookieHeader)

    const response = NextResponse.json({ success: true, csrfToken: data.csrfToken })

    // Setear el nuevo access token
    if (cookies.accessToken) {
      response.cookies.set('accessToken', cookies.accessToken, accessTokenCookieOptions)
    }
    // Setear el nuevo CSRF token
    if (cookies.csrfToken) {
      response.cookies.set('csrfToken', cookies.csrfToken, csrfTokenCookieOptions)
    }

    return response
  } catch (error) {
    console.error('Refresh proxy error:', error)
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
