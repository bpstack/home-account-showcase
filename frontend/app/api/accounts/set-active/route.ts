import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { accountId } = await request.json()

  if (!accountId || typeof accountId !== 'string') {
    return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set('selectedAccountId', accountId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 año
    sameSite: 'lax',
    // NO httpOnly - el cliente también necesita leerla para localStorage sync
  })

  return response
}
