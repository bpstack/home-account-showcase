import { NextRequest, NextResponse } from 'next/server'
import { BACKEND_URL, isAllowedOrigin, applySession, sessionFromBackend } from '../config'

export async function POST(req: NextRequest) {
  // Validar origen
  const origin = req.headers.get('origin')
  if (!isAllowedOrigin(origin)) {
    return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 })
  }

  try {
    const body = await req.json()

    // Proxy al backend
    const backendRes = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    })

    const data = await backendRes.json()

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data.error || 'Error de autenticación' },
        { status: backendRes.status }
      )
    }

    // User and encryption data, without the tokens (those only travel as httpOnly cookies).
    // verification_blob and pin_v2 decide how login() unlocks: without them a PIN v2 user was
    // tried with the password as the key, and the login PIN step never appeared.
    const response = NextResponse.json({
      success: true,
      user: data.user,
      csrfToken: data.csrfToken,
      key_salt: data.key_salt,
      verification_blob: data.verification_blob,
      encrypted_keys: data.encrypted_keys,
      pin_v2: data.pin_v2,
    })

    applySession(response, sessionFromBackend(backendRes))

    return response
  } catch (error) {
    console.error('Login proxy error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
