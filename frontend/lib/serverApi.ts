// lib/serverApi.ts - API Client para Server Components
// Usa cookies() de next/headers para autenticación

import { cookies } from 'next/headers'

const API_URL = process.env.API_URL || 'http://localhost:3001/api'

export class ServerApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
    this.name = 'ServerApiError'
  }
}

/**
 * Fetch autenticado para Server Components
 * Lee el accessToken de las cookies y lo envía al backend
 */
export async function serverFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('accessToken')?.value

  if (!accessToken) {
    throw new ServerApiError(401, 'No autenticado')
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Cookie: `accessToken=${accessToken}`,
      ...options?.headers,
    },
    // Datos de usuario siempre frescos (no cache)
    cache: 'no-store',
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new ServerApiError(response.status, data.error || 'Error del servidor')
  }

  return response.json()
}

/**
 * Verificar si el usuario está autenticado (para RSC)
 * No lanza error, solo retorna boolean
 */
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  return !!cookieStore.get('accessToken')?.value
}

/**
 * Obtener el ID de la cuenta seleccionada desde cookie
 */
export async function getSelectedAccountId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('selectedAccountId')?.value || null
}
