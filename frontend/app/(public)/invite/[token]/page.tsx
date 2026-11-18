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
import { Button, ButtonLink } from '@/components/ui'
import { AuthShell, FormAlert } from '@/components/auth'
import { invitations, accounts } from '@/lib/apiClient'
import { useAuth } from '@/hooks/useAuth'
import { decryptAccountKeyFromInvitation, encryptAccountKey } from '@/lib/crypto'
import { useCryptoStore } from '@/stores/cryptoStore'
import { toast } from 'sonner'

const FULL_CLASS = 'h-11 w-full sm:h-10'

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

  // Cargar invitación al montar y re-evaluar cuando cambia auth/crypto
  useEffect(() => {
    loadInvitation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAuthenticated, isUnlocked])

  if (state === 'loading') {
    return <AuthShell title="Cargando la invitación…">{null}</AuthShell>
  }

  if (state === 'accepted' && invitation) {
    return (
      <AuthShell
        title={`Te has unido a ${invitation.account_name}`}
        description="Te llevamos a tu resumen…"
      >
        {null}
      </AuthShell>
    )
  }

  if (state === 'valid' && invitation) {
    return (
      <ValidInvitation
        invitation={invitation}
        isLoggedIn={isAuthenticated}
        token={token}
        onAccept={handleAccept}
        isAccepting={isAccepting}
        error={error}
      />
    )
  }

  const failure =
    state === 'expired'
      ? {
          title: 'Invitación caducada',
          description:
            'Ha caducado o la han revocado. Pide al propietario de la cuenta que te envíe otra.',
        }
      : state === 'not-found'
        ? {
            title: 'Invitación no encontrada',
            description: 'No existe una invitación con este enlace. Puede que esté mal copiado.',
          }
        : {
            title: 'No se pudo cargar la invitación',
            description: error || 'Ha ocurrido un error inesperado.',
          }

  return (
    <AuthShell title={failure.title} description={failure.description}>
      <ButtonLink href="/" className={FULL_CLASS}>
        Ir al inicio
      </ButtonLink>
    </AuthShell>
  )
}

function ValidInvitation({
  invitation,
  isLoggedIn,
  token,
  onAccept,
  isAccepting,
  error,
}: {
  invitation: InvitationData
  isLoggedIn: boolean
  token: string
  onAccept: () => void
  isAccepting: boolean
  error: string | null
}) {
  const expiresAt = new Date(invitation.expires_at)

  return (
    <AuthShell
      title="Te han invitado a una cuenta"
      description={
        <>
          {invitation.invited_by_name} te invita a unirte a{' '}
          <span className="font-medium text-foreground">{invitation.account_name}</span>.
        </>
      }
    >
      <div className="space-y-4">
        {!invitation.encrypted_key && (
          <p className="rounded-md border border-border p-3 text-sm text-muted-foreground">
            Esta invitación no incluye la clave de cifrado: pide al propietario que te invite otra
            vez para ver los datos.
          </p>
        )}

        {error && <FormAlert>{error}</FormAlert>}

        {isLoggedIn ? (
          <Button onClick={onAccept} isLoading={isAccepting} className={FULL_CLASS}>
            Aceptar invitación
          </Button>
        ) : (
          <>
            <ButtonLink href={`/register?redirect=/invite/${token}`} className={FULL_CLASS}>
              Crear cuenta
            </ButtonLink>
            <ButtonLink
              href={`/login?redirect=/invite/${token}`}
              variant="outline"
              className={FULL_CLASS}
            >
              Ya tengo cuenta
            </ButtonLink>
            <p className="text-xs text-muted-foreground">
              Si te registras desde aquí, entras directamente en esta cuenta y no se crea una
              personal.
            </p>
          </>
        )}

        <p className="text-xs text-muted-foreground">
          Caduca el {expiresAt.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} a las{' '}
          {expiresAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}.
        </p>
      </div>
    </AuthShell>
  )
}
