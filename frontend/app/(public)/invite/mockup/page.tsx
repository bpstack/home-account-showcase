'use client'

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MOCKUP: Página de invitación /invite/[token]
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Pre-visualización de cómo se verá la página cuando un usuario recibe una invitación.
 *
 * Casos mostrados:
 * - Usuario NO logueado → Botones login/register
 * - Usuario YA logueado → Botón aceptar
 * - Token expirado → Mensaje de error
 *
 * Para ver: http://localhost:3000/invite/mockup
 *
 * NOTA: Eliminar después de implementar la funcionalidad real.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState } from 'react'
import { Button } from '@/components/ui'
import Link from 'next/link'

// Simular diferentes estados
type MockState = 'not-logged' | 'logged' | 'expired' | 'accepted'

const MOCK_INVITATION = {
  accountName: 'Familia García',
  ownerName: 'Diego',
  ownerEmail: 'diego@example.com',
  expiresAt: '2026-02-01T12:00:00',
}

export default function InviteMockupPage() {
  const [mockState, setMockState] = useState<MockState>('not-logged')
  const [isAccepting, setIsAccepting] = useState(false)

  const handleAccept = () => {
    setIsAccepting(true)
    setTimeout(() => {
      setIsAccepting(false)
      setMockState('accepted')
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Barra de control del mockup */}
      <div className="bg-yellow-400 text-yellow-900 px-4 py-2 flex items-center justify-center gap-4 text-sm">
        <span className="font-bold">MOCKUP</span>
        <span>Simular estado:</span>
        <select
          value={mockState}
          onChange={(e) => setMockState(e.target.value as MockState)}
          className="px-2 py-1 rounded border border-yellow-600 bg-yellow-300"
        >
          <option value="not-logged">No logueado</option>
          <option value="logged">Logueado</option>
          <option value="expired">Token expirado</option>
          <option value="accepted">Aceptada</option>
        </select>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {mockState === 'expired' ? (
            <ExpiredInvitation />
          ) : mockState === 'accepted' ? (
            <AcceptedInvitation />
          ) : (
            <ValidInvitation
              isLoggedIn={mockState === 'logged'}
              onAccept={handleAccept}
              isAccepting={isAccepting}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function ValidInvitation({
  isLoggedIn,
  onAccept,
  isAccepting,
}: {
  isLoggedIn: boolean
  onAccept: () => void
  isAccepting: boolean
}) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-lg overflow-hidden">
      {/* Header con icono */}
      <div className="bg-gradient-to-br from-accent to-purple-600 px-6 py-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
          <span className="text-3xl">✉️</span>
        </div>
        <h1 className="text-xl font-bold text-white">¡Has sido invitado!</h1>
      </div>

      {/* Contenido */}
      <div className="p-6 space-y-6">
        {/* Info de la cuenta */}
        <div className="text-center">
          <p className="text-muted-foreground mb-2">Te han invitado a unirte a</p>
          <div className="inline-flex items-center gap-3 px-4 py-3 bg-muted/50 rounded-lg">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center text-white font-bold text-lg">
              {MOCK_INVITATION.accountName.charAt(0)}
            </div>
            <div className="text-left">
              <p className="font-semibold text-foreground">{MOCK_INVITATION.accountName}</p>
              <p className="text-xs text-muted-foreground">por {MOCK_INVITATION.ownerName}</p>
            </div>
          </div>
        </div>

        {/* Acciones según estado de login */}
        {isLoggedIn ? (
          <div className="space-y-3">
            <Button className="w-full" size="lg" onClick={onAccept} disabled={isAccepting}>
              {isAccepting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Aceptando...
                </>
              ) : (
                'Aceptar invitación'
              )}
            </Button>
            <Button variant="ghost" className="w-full">
              Rechazar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">
              Para aceptar, inicia sesión o regístrate.
            </p>
            <div className="space-y-3">
              <Link
                href="/register?redirect=/invite/mockup"
                className="flex items-center justify-center w-full h-12 px-6 text-base font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                Registrarme
              </Link>
              <Link
                href="/login?redirect=/invite/mockup"
                className="flex items-center justify-center w-full h-12 px-6 text-base font-medium text-foreground border border-border rounded-md hover:bg-muted transition-colors"
              >
                Ya tengo cuenta
              </Link>
            </div>
            <p className="text-xs text-center text-muted-foreground italic">
              💡 Al registrarte desde aquí, entrarás directamente a esta cuenta (no se crea cuenta
              personal).
            </p>
          </div>
        )}

        {/* Expiración */}
        <p className="text-xs text-center text-muted-foreground">
          Esta invitación expira el {new Date(MOCK_INVITATION.expiresAt).toLocaleDateString()} a las{' '}
          {new Date(MOCK_INVITATION.expiresAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  )
}

function ExpiredInvitation() {
  return (
    <div className="bg-card rounded-xl border border-border shadow-lg overflow-hidden">
      {/* Header con icono de error */}
      <div className="bg-gradient-to-br from-red-500 to-red-600 px-6 py-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
          <span className="text-3xl">⏰</span>
        </div>
        <h1 className="text-xl font-bold text-white">Invitación expirada</h1>
      </div>

      {/* Contenido */}
      <div className="p-6 space-y-6 text-center">
        <p className="text-muted-foreground">
          Esta invitación ya no es válida. Puede haber expirado o sido revocada.
        </p>
        <p className="text-sm text-muted-foreground">
          Pide al propietario de la cuenta que te envíe una nueva invitación.
        </p>
        <Link
          href="/"
          className="flex items-center justify-center w-full h-10 px-4 text-sm font-medium text-foreground border border-border rounded-md hover:bg-muted transition-colors"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  )
}

function AcceptedInvitation() {
  return (
    <div className="bg-card rounded-xl border border-border shadow-lg overflow-hidden">
      {/* Header con icono de éxito */}
      <div className="bg-gradient-to-br from-green-500 to-green-600 px-6 py-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
          <span className="text-3xl">✓</span>
        </div>
        <h1 className="text-xl font-bold text-white">¡Bienvenido!</h1>
      </div>

      {/* Contenido */}
      <div className="p-6 space-y-6 text-center">
        <p className="text-foreground">
          Te has unido a <strong>{MOCK_INVITATION.accountName}</strong>
        </p>
        <p className="text-sm text-muted-foreground">
          Ahora puedes ver las transacciones, categorías y todo lo compartido en esta cuenta.
        </p>
        <Link
          href="/dashboard"
          className="flex items-center justify-center w-full h-12 px-6 text-base font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          Ir al Dashboard
        </Link>
      </div>
    </div>
  )
}
