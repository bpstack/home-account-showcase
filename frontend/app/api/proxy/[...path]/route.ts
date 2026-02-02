import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.API_URL || 'http://localhost:3001/api'
const isProduction = process.env.NODE_ENV === 'production'

// Cookie options for setting tokens
const accessTokenCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 15 * 60, // 15 minutos
}

const csrfTokenCookieOptions = {
  httpOnly: false,
  secure: isProduction,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 8 * 60 * 60, // 8 horas
}

// Proxy general para todas las peticiones al backend
// Esto evita problemas de cookies cross-site
export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, await params, 'GET')
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, await params, 'POST')
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, await params, 'PUT')
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, await params, 'DELETE')
}

// Helper para intentar refresh del token
async function tryRefresh(refreshToken: string): Promise<{ success: boolean; accessToken?: string; csrfToken?: string }> {
  try {
    const refreshRes = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `refreshToken=${refreshToken}`,
      },
      cache: 'no-store',
    })

    if (!refreshRes.ok) {
      return { success: false }
    }

    // Extraer tokens de las cookies de respuesta
    const setCookieHeader = refreshRes.headers.get('set-cookie')
    if (setCookieHeader) {
      const cookies = parseCookies(setCookieHeader)
      if (cookies.accessToken) {
        return {
          success: true,
          accessToken: cookies.accessToken,
          csrfToken: cookies.csrfToken,
        }
      }
    }

    return { success: false }
  } catch {
    return { success: false }
  }
}

async function handleProxy(
  req: NextRequest,
  params: { path: string[] },
  method: string
) {
  try {
    const path = params.path.join('/')
    const url = new URL(req.url)
    const queryString = url.search

    // Obtener cookies de auth
    let accessToken = req.cookies.get('accessToken')?.value
    const refreshToken = req.cookies.get('refreshToken')?.value
    const csrfToken = req.cookies.get('csrfToken')?.value

    // Si no hay accessToken pero sí refreshToken, intentar refresh proactivo
    let newAccessToken: string | undefined
    let newCsrfToken: string | undefined

    if (!accessToken && refreshToken) {
      const refreshResult = await tryRefresh(refreshToken)
      if (refreshResult.success && refreshResult.accessToken) {
        accessToken = refreshResult.accessToken
        newAccessToken = refreshResult.accessToken
        newCsrfToken = refreshResult.csrfToken
      }
    }

    // Construir headers para el backend
    const headers: Record<string, string> = {}

    // Pasar cookies como Cookie header al backend
    const cookieParts: string[] = []
    if (accessToken) cookieParts.push(`accessToken=${accessToken}`)
    if (refreshToken) cookieParts.push(`refreshToken=${refreshToken}`)
    if (csrfToken) cookieParts.push(`csrfToken=${csrfToken}`)

    if (cookieParts.length > 0) {
      headers['Cookie'] = cookieParts.join('; ')
    }

    // Pasar CSRF token en header si es mutación
    if (['POST', 'PUT', 'DELETE'].includes(method)) {
      const csrfFromHeader = req.headers.get('x-csrf-token')
      if (csrfFromHeader) {
        headers['X-CSRF-Token'] = csrfFromHeader
      }
    }

    // Obtener body si existe (clonar para posible retry)
    let body: string | ArrayBuffer | undefined
    const contentType = req.headers.get('content-type') || ''

    if (method !== 'GET') {
      try {
        if (contentType.includes('application/json')) {
          headers['Content-Type'] = 'application/json'
          body = await req.text()
        } else if (contentType.includes('multipart/form-data')) {
          headers['Content-Type'] = contentType
          body = await req.arrayBuffer()
        } else {
          const text = await req.text()
          if (text) {
            headers['Content-Type'] = 'application/json'
            body = text
          }
        }
      } catch {
        // No body
      }
    }

    // Hacer petición al backend
    let backendRes = await fetch(`${BACKEND_URL}/${path}${queryString}`, {
      method,
      headers,
      body,
      cache: 'no-store',
    })

    let data = await backendRes.json()

    // Si recibimos 401 y tenemos refreshToken, intentar refresh y retry
    if (backendRes.status === 401 && refreshToken && !newAccessToken) {
      const refreshResult = await tryRefresh(refreshToken)

      if (refreshResult.success && refreshResult.accessToken) {
        // Actualizar headers con el nuevo token
        const retryHeaders = { ...headers }
        const retryCookieParts = [
          `accessToken=${refreshResult.accessToken}`,
          `refreshToken=${refreshToken}`,
        ]
        if (csrfToken) retryCookieParts.push(`csrfToken=${csrfToken}`)
        retryHeaders['Cookie'] = retryCookieParts.join('; ')

        // Retry la petición original
        backendRes = await fetch(`${BACKEND_URL}/${path}${queryString}`, {
          method,
          headers: retryHeaders,
          body,
          cache: 'no-store',
        })

        data = await backendRes.json()
        newAccessToken = refreshResult.accessToken
        newCsrfToken = refreshResult.csrfToken
      }
    }

    // Crear respuesta
    const response = NextResponse.json(data, { status: backendRes.status })

    // Setear nuevos tokens si hubo refresh
    if (newAccessToken) {
      response.cookies.set('accessToken', newAccessToken, accessTokenCookieOptions)
    }
    if (newCsrfToken) {
      response.cookies.set('csrfToken', newCsrfToken, csrfTokenCookieOptions)
    }

    // Si el backend envía cookies adicionales, re-setearlas
    const setCookieHeader = backendRes.headers.get('set-cookie')
    if (setCookieHeader) {
      const cookies = parseCookies(setCookieHeader)

      if (cookies.accessToken && !newAccessToken) {
        response.cookies.set('accessToken', cookies.accessToken, accessTokenCookieOptions)
      }
      if (cookies.refreshToken) {
        response.cookies.set('refreshToken', cookies.refreshToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: 'lax',
          path: '/',
          maxAge: 8 * 60 * 60, // 8 horas
        })
      }
      if (cookies.csrfToken && !newCsrfToken) {
        response.cookies.set('csrfToken', cookies.csrfToken, csrfTokenCookieOptions)
      }
    }

    return response
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { success: false, error: 'Error de conexión con el servidor' },
      { status: 502 }
    )
  }
}

function parseCookies(setCookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {}
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
