import { NextRequest, NextResponse } from 'next/server'
import {
  BACKEND_URL,
  applySession,
  backendCookieHeader,
  isAllowedOrigin,
  refreshSession,
  sessionFromBackend,
} from '@/app/api/auth/config'
import type { SessionCookies } from '@/lib/sessionCookies'

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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(req, await params, 'DELETE')
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleProxy(req, await params, 'PATCH')
}

async function handleProxy(req: NextRequest, params: { path: string[] }, method: string) {
  // The same check as the /api/auth routes. Without it, a form on another site could post here
  // (the body is passed on as JSON whatever its type) and the browser would keep the cookies the
  // backend sets: signing the visitor in to an account of the other site's choosing.
  if (!isAllowedOrigin(req.headers.get('origin'))) {
    return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 })
  }

  try {
    const path = params.path.join('/')
    const url = new URL(req.url)
    const queryString = url.search

    // Obtener cookies de auth
    const current = {
      accessToken: req.cookies.get('accessToken')?.value,
      refreshToken: req.cookies.get('refreshToken')?.value,
      csrfToken: req.cookies.get('csrfToken')?.value,
    }
    // The session from a refresh made here, copied to the browser at the end (with the rotated
    // refresh token, if the backend rotates it)
    let refreshed: SessionCookies | null = null
    // At most one refresh per request, whether it worked or not
    let attemptedRefresh = false

    // Si no hay accessToken pero sí refreshToken, intentar refresh proactivo
    if (!current.accessToken && current.refreshToken) {
      attemptedRefresh = true
      const result = await refreshSession(current.refreshToken)
      if (result.ok) {
        refreshed = result.session
      } else if (result.status !== 401) {
        // Passing failure (429, 5xx): report it instead of calling the backend without a session
        return NextResponse.json(
          { success: false, error: 'No se pudo renovar la sesión' },
          { status: result.status }
        )
      }
    }

    // Construir headers para el backend
    const headers: Record<string, string> = {}
    const cookieHeader = backendCookieHeader(current, refreshed ?? {})
    if (cookieHeader) headers['Cookie'] = cookieHeader

    // Pasar CSRF token en header si es mutación
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
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

    // Si recibimos 401 y tenemos refreshToken, intentar refresh y retry una vez
    if (backendRes.status === 401 && current.refreshToken && !attemptedRefresh) {
      attemptedRefresh = true
      const result = await refreshSession(current.refreshToken)
      if (result.ok) refreshed = result.session

      if (refreshed) {
        backendRes = await fetch(`${BACKEND_URL}/${path}${queryString}`, {
          method,
          headers: { ...headers, Cookie: backendCookieHeader(current, refreshed) },
          body,
          cache: 'no-store',
        })
        data = await backendRes.json()
      }
    }

    const response = NextResponse.json(data, { status: backendRes.status })

    // The refreshed session first, then whatever the backend response itself sets or clears
    // (e.g. a password change ends the session): the latest word wins
    if (refreshed) applySession(response, refreshed)
    applySession(response, sessionFromBackend(backendRes))

    return response
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { success: false, error: 'Error de conexión con el servidor' },
      { status: 502 }
    )
  }
}
