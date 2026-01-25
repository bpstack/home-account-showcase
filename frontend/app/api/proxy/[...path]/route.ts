import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.API_URL || 'http://localhost:3001/api'

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
    const accessToken = req.cookies.get('accessToken')?.value
    const refreshToken = req.cookies.get('refreshToken')?.value
    const csrfToken = req.cookies.get('csrfToken')?.value

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

    // Obtener body si existe
    let body: BodyInit | undefined
    const contentType = req.headers.get('content-type') || ''

    if (method !== 'GET') {
      try {
        if (contentType.includes('application/json')) {
          headers['Content-Type'] = 'application/json'
          body = await req.text()
        } else if (contentType.includes('multipart/form-data')) {
          // Para uploads, pasar los bytes raw y el content-type original
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
    const backendRes = await fetch(`${BACKEND_URL}/${path}${queryString}`, {
      method,
      headers,
      body,
      cache: 'no-store',
    })

    const data = await backendRes.json()

    // Crear respuesta
    const response = NextResponse.json(data, { status: backendRes.status })

    // Si el backend envía cookies, re-setearlas en el dominio de Vercel
    const setCookieHeader = backendRes.headers.get('set-cookie')
    if (setCookieHeader) {
      const cookies = parseCookies(setCookieHeader)

      const isProduction = process.env.NODE_ENV === 'production'

      if (cookies.accessToken) {
        response.cookies.set('accessToken', cookies.accessToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: 'lax',
          path: '/',
          maxAge: 5 * 60, // 5 minutos
        })
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
      if (cookies.csrfToken) {
        response.cookies.set('csrfToken', cookies.csrfToken, {
          httpOnly: false, // JS necesita leerlo
          secure: isProduction,
          sameSite: 'lax',
          path: '/',
          maxAge: 8 * 60 * 60,
        })
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
