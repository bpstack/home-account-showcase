import { NextRequest, NextResponse } from 'next/server'
import { BACKEND_URL, isAllowedOrigin } from '../config'

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  if (!isAllowedOrigin(origin)) {
    return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 })
  }

  try {
    // Obtener cookies actuales para enviar al backend
    const accessToken = req.cookies.get('accessToken')?.value
    const refreshToken = req.cookies.get('refreshToken')?.value
    const csrfToken = req.cookies.get('csrfToken')?.value

    // Notificar al backend (opcional, pero buena práctica)
    await fetch(`${BACKEND_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken || '',
        Cookie: [accessToken ? `accessToken=${accessToken}` : '', refreshToken ? `refreshToken=${refreshToken}` : '']
          .filter(Boolean)
          .join('; '),
      },
      cache: 'no-store',
    }).catch(() => {
      // Ignorar errores del backend en logout
    })

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
