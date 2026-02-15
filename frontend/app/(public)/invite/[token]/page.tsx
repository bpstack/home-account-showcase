'use client'

/**
 * Página de invitación /invite/[token]
 *
 * Muestra la invitación y permite:
 * - Si NO logueado → Botones login/register con redirect
 * - Si YA logueado → Botón aceptar
 * - Si token expirado/inválido → Mensaje de error
 */

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import Link from 'next/link'
import { invitations, accounts } from '@/lib/apiClient'
import { useAuth } from '@/hooks/useAuth'
import { decryptAccountKeyFromInvitation, encryptAccountKey } from '@/lib/crypto'
import { useCryptoStore } from '@/stores/cryptoStore'
import { toast } from 'sonner'

type InvitationState = 'loading' | 'valid' | 'expired' | 'not-found' | 'accepted' | 'error'

interface InvitationData {
  status: string
  account_id: string
  account_name: string
  invited_by_name: string
  expires_at: string
  encrypted_key: string | null
}

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const { isAuthenticated } = useAuth()
  const [state, setState] = useState<InvitationState>('loading')
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [isAccepting, setIsAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isUnlocked = useCryptoStore((s) => s.isUnlocked)

  // Cargar invitación al montar y re-evaluar cuando cambia auth/crypto
  useEffect(() => {
    loadInvitation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAuthenticated, isUnlocked])

  const loadInvitation = async () => {
    try {
      const data = await invitations.getByToken(token)

      if (data.isExpired) {
        setState('expired')
        return
      }

      setInvitation(data.invitation)

      // Si la invitación ya fue aceptada, intentar completar la transferencia crypto
      // (caso: el usuario aceptó pero crypto estaba locked, vuelve después de unlock)
      if (data.invitation.status === 'accepted') {
        await tryCompleteCryptoTransfer(data.invitation)
        return
      }

      setState('valid')
    } catch (err: any) {
      if (err.status === 404) {
        setState('not-found')
      } else {
        setState('error')
        setError(err.message || 'Error al cargar la invitación')
      }
    }
  }

  /**
   * Intenta completar la transferencia de Account Key para una invitación ya aceptada.
   * Esto cubre el caso donde el accept se hizo pero crypto estaba locked.
   */
  const tryCompleteCryptoTransfer = async (inv: InvitationData) => {
    if (!inv.encrypted_key || !isAuthenticated) {
      // Sin encrypted_key o sin auth, simplemente redirigir al dashboard
      setState('accepted')
      router.push('/dashboard')
      return
    }

    const cryptoStore = useCryptoStore.getState()

    if (!cryptoStore.isUnlocked) {
      // Aún no está unlocked, redirigir a unlock
      router.push(`/unlock?from=/invite/${token}`)
      return
    }

    // Verificar si ya tenemos la key para esta cuenta
    if (cryptoStore.isAccountUnlocked(inv.account_id)) {
      setState('accepted')
      setTimeout(() => router.push('/dashboard'), 500)
      return
    }

    try {
      const userKey = cryptoStore.userKey
      if (!userKey) throw new Error('UserKey no disponible')

      const accountKey = await decryptAccountKeyFromInvitation(inv.encrypted_key, token)
      const encryptedForUser = await encryptAccountKey(accountKey, userKey)
      await accounts.saveAccountKey(inv.account_id, encryptedForUser)
      await cryptoStore.unlockAccount(inv.account_id, encryptedForUser, 1)

      toast.success('¡Cifrado configurado correctamente!')
    } catch (_err) {
      toast.error('No se pudo configurar el cifrado. Tendrás acceso limitado.')
    }

    setState('accepted')
    setTimeout(() => router.push('/dashboard'), 1000)
  }

  const handleAccept = async () => {
    if (!invitation) return

    setIsAccepting(true)
    setError(null)

    try {
      // IMPORTANTE: Verificar crypto ANTES de aceptar la invitación
      // Si aceptamos primero y luego el crypto no está listo, la invitación
      // queda aceptada pero sin transferir la Account Key
      if (invitation.encrypted_key) {
        const cryptoStore = useCryptoStore.getState()

        if (!cryptoStore.isUnlocked) {
          // Necesita desbloquear crypto primero - NO aceptar aún
          setIsAccepting(false)
          router.push(`/unlock?from=/invite/${token}`)
          return
        }
      }

      const acceptResult = await invitations.accept(token)

      // Transferir Account Key si está disponible
      // El token de la URL es la clave de cifrado
      // Nota: Ya verificamos isUnlocked arriba, así que cryptoStore está listo
      if (invitation.encrypted_key) {
        try {
          const cryptoStore = useCryptoStore.getState()
          const userKey = cryptoStore.userKey

          if (!userKey) {
            throw new Error('UserKey no disponible')
          }

          // Descifrar AK usando el token de la URL como secret
          const accountKey = await decryptAccountKeyFromInvitation(invitation.encrypted_key, token)

          // Cifrar AK con la User Key del invitado
          const encryptedForUser = await encryptAccountKey(accountKey, userKey)

          // Guardar en BD
          await accounts.saveAccountKey(acceptResult.account.id, encryptedForUser)

          // Registrar en memoria para esta sesión
          await cryptoStore.unlockAccount(acceptResult.account.id, encryptedForUser, 1)
        } catch (_decryptError) {
          toast.error('No se pudo configurar el cifrado de la cuenta. Tendrás acceso limitado.')
        }
      }

      setState('accepted')
      toast.success('¡Bienvenido a la cuenta!')
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Error al aceptar la invitación')
      setIsAccepting(false)
    }
  }

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {state === 'not-found' && <NotFoundInvitation />}
        {state === 'expired' && <ExpiredInvitation />}
        {state === 'error' && <ErrorInvitation error={error} />}
        {state === 'accepted' && invitation && (
          <AcceptedInvitation accountName={invitation.account_name} />
        )}
        {state === 'valid' && invitation && (
          <ValidInvitation
            invitation={invitation}
            isLoggedIn={isAuthenticated}
            token={token}
            onAccept={handleAccept}
            isAccepting={isAccepting}
            error={error}
            hasEncryptedKey={!!invitation.encrypted_key}
          />
        )}
      </div>
    </div>
  )
}

function ValidInvitation({
  invitation,
  isLoggedIn,
  token,
  onAccept,
  isAccepting,
  error,
  hasEncryptedKey,
}: {
  invitation: InvitationData
  isLoggedIn: boolean
  token: string
  onAccept: () => void
  isAccepting: boolean
  error: string | null
  hasEncryptedKey: boolean
}) {
  const expiresAt = new Date(invitation.expires_at)

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
              {invitation.account_name.charAt(0)}
            </div>
            <div className="text-left">
              <p className="font-semibold text-foreground">{invitation.account_name}</p>
              <p className="text-xs text-muted-foreground">por {invitation.invited_by_name}</p>
            </div>
          </div>
        </div>

        {/* Warning si no hay clave cifrada */}
        {!hasEncryptedKey && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center">
            <p className="text-sm text-amber-600 dark:text-amber-400">
              ⚠️ Esta invitación no incluye cifrado. El propietario debe re-invitarte para acceso
              completo a los datos.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

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
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">
              Para aceptar, inicia sesión o regístrate.
            </p>
            <div className="space-y-3">
              <Link
                href={`/register?redirect=/invite/${token}`}
                className="flex items-center justify-center w-full h-12 px-6 text-base font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                Registrarme
              </Link>
              <Link
                href={`/login?redirect=/invite/${token}`}
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
          Esta invitación expira el {expiresAt.toLocaleDateString()} a las{' '}
          {expiresAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

function ExpiredInvitation() {
  return (
    <div className="bg-card rounded-xl border border-border shadow-lg overflow-hidden">
      <div className="bg-gradient-to-br from-red-500 to-red-600 px-6 py-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
          <span className="text-3xl">⏰</span>
        </div>
        <h1 className="text-xl font-bold text-white">Invitación expirada</h1>
      </div>

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

function NotFoundInvitation() {
  return (
    <div className="bg-card rounded-xl border border-border shadow-lg overflow-hidden">
      <div className="bg-gradient-to-br from-gray-500 to-gray-600 px-6 py-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
          <span className="text-3xl">🔍</span>
        </div>
        <h1 className="text-xl font-bold text-white">Invitación no encontrada</h1>
      </div>

      <div className="p-6 space-y-6 text-center">
        <p className="text-muted-foreground">
          No pudimos encontrar esta invitación. El enlace puede ser incorrecto.
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

function ErrorInvitation({ error }: { error: string | null }) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-lg overflow-hidden">
      <div className="bg-gradient-to-br from-red-500 to-red-600 px-6 py-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
          <span className="text-3xl">❌</span>
        </div>
        <h1 className="text-xl font-bold text-white">Error</h1>
      </div>

      <div className="p-6 space-y-6 text-center">
        <p className="text-muted-foreground">{error || 'Ocurrió un error inesperado.'}</p>
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

function AcceptedInvitation({ accountName }: { accountName: string }) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-lg overflow-hidden">
      <div className="bg-gradient-to-br from-green-500 to-green-600 px-6 py-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
          <span className="text-3xl">✓</span>
        </div>
        <h1 className="text-xl font-bold text-white">¡Bienvenido!</h1>
      </div>

      <div className="p-6 space-y-6 text-center">
        <p className="text-foreground">
          Te has unido a <strong>{accountName}</strong>
        </p>
        <p className="text-sm text-muted-foreground">Redirigiendo al dashboard...</p>
        <div className="animate-spin text-2xl">⏳</div>
      </div>
    </div>
  )
}
