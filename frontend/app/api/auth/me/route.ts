import { NextRequest, NextResponse } from 'next/server'
import { BACKEND_URL, isAllowedOrigin, accessTokenCookieOptions } from '../config'

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin')
  if (!isAllowedOrigin(origin)) {
    return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 })
  }

  try {
    let accessToken = req.cookies.get('accessToken')?.value
    const refreshToken = req.cookies.get('refreshToken')?.value
    let newAccessToken: string | null = null

    // Si no hay accessToken pero sí refreshToken, intentar refresh
    if (!accessToken && refreshToken) {
      const refreshResult = await tryRefresh(refreshToken)
      if (refreshResult.success && refreshResult.accessToken) {
        accessToken = refreshResult.accessToken
        newAccessToken = refreshResult.accessToken
      }
    }

    if (!accessToken) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Proxy al backend con el access token
    const backendRes = await fetch(`${BACKEND_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `accessToken=${accessToken}`,
      },
      cache: 'no-store',
    })

    const data = await backendRes.json()

    // Si el backend dice que el token expiró, intentar refresh
    if (backendRes.status === 401 && refreshToken && !newAccessToken) {
      const refreshResult = await tryRefresh(refreshToken)
      if (refreshResult.success && refreshResult.accessToken) {
        // Retry con el nuevo token
        const retryRes = await fetch(`${BACKEND_URL}/auth/me`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Cookie: `accessToken=${refreshResult.accessToken}`,
          },
          cache: 'no-store',
        })

        const retryData = await retryRes.json()

        if (retryRes.ok) {
          const response = NextResponse.json({
            success: true,
            user: retryData.user,
          })
          response.cookies.set('accessToken', refreshResult.accessToken, accessTokenCookieOptions)
          return response
        }
      }

      // Refresh falló - limpiar cookies
      const response = NextResponse.json({ error: 'Sesión expirada' }, { status: 401 })
      response.cookies.delete('accessToken')
      response.cookies.delete('refreshToken')
      return response
    }

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data.error || 'No autenticado' },
        { status: backendRes.status }
      )
    }

    const response = NextResponse.json({
      success: true,
      user: data.user,
    })

    // Si obtuvimos un nuevo accessToken durante el refresh inicial, setearlo
    if (newAccessToken) {
      response.cookies.set('accessToken', newAccessToken, accessTokenCookieOptions)
    }

    return response
  } catch (error) {
    console.error('Me proxy error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// Helper para intentar refresh del token
async function tryRefresh(refreshToken: string): Promise<{ success: boolean; accessToken?: string }> {
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

    // Extraer nuevo access token de la respuesta del backend
    const setCookieHeader = refreshRes.headers.get('set-cookie')
    if (setCookieHeader) {
      const match = setCookieHeader.match(/accessToken=([^;]+)/)
      if (match) {
        return { success: true, accessToken: match[1] }
      }
    }

    return { success: false }
  } catch {
    return { success: false }
  }
}
