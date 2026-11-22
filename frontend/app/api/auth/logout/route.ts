import { NextRequest, NextResponse } from 'next/server'
import { BACKEND_URL, isAllowedOrigin } from '../config'

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  if (!isAllowedOrigin(origin)) {
    return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 })
  }

  try {
    // The backend ends the session of the refresh token, or of the access token if that is the
    // only one left; nothing else is needed
    const refreshToken = req.cookies.get('refreshToken')?.value
    const accessToken = req.cookies.get('accessToken')?.value
    const cookie = [
      refreshToken && `refreshToken=${refreshToken}`,
      accessToken && `accessToken=${accessToken}`,
    ]
      .filter(Boolean)
      .join('; ')

    if (cookie) {
      await fetch(`${BACKEND_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        cache: 'no-store',
      }).catch(() => {
        // The cookies are cleared anyway; the session ends on its own at its expiry
      })
    }

    // Crear respuesta limpiando cookies
    const response = NextResponse.json({
      success: true,
      message: 'Sesión cerrada correctamente',
    })

    // Limpiar todas las cookies de auth
    response.cookies.delete('accessToken')
    response.cookies.delete('refreshToken')
    response.cookies.delete('csrfToken')
    response.cookies.delete('selectedAccountId')

    return response
  } catch (error) {
    console.error('Logout proxy error:', error)
    // Aún así limpiar cookies en caso de error
    const response = NextResponse.json({
      success: true,
      message: 'Sesión cerrada',
    })
    response.cookies.delete('accessToken')
    response.cookies.delete('refreshToken')
    response.cookies.delete('csrfToken')
    response.cookies.delete('selectedAccountId')
    return response
  }
}
