'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { accounts, auth } from '@/lib/apiClient'
import { Button, Input } from '@/components/ui'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { AISettings } from './AISettings'
import { useCryptoStore } from '@/stores/cryptoStore'
import {
  deriveUserKey,
  encryptAccountKey,
  decryptAccountKey,
  generateKeySalt,
  generateVerificationBlob,
  encryptAccountKeyForInvitation,
} from '@/lib/crypto'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface Member {
  id: string
  email: string
  name: string
  role: string
  joined_at: string
}

interface Invitation {
  id: string
  email: string
  token: string
  status: string
  expires_at: string
  created_at: string
}

type SettingsTab = 'account' | 'budget' | 'savings' | 'security' | 'ia'

const tabs: { id: SettingsTab; label: string; description: string }[] = [
  { id: 'account', label: 'Cuenta', description: 'Gestiona tu cuenta y miembros' },
  { id: 'ia', label: 'IA', description: 'Configura los proveedores de IA para el parsing' },
  {
    id: 'budget',
    label: 'Presupuesto',
    description: 'Establecer los límites de gastos dependiendo la categoría seleccionada',
  },
  {
    id: 'savings',
    label: 'Ahorro e Inversión',
    description: 'Qué parte destinaremos al ahorro y qué parte a Inversión',
  },
  { id: 'security', label: 'Seguridad', description: 'Aumentar la seguridad de mi cuenta' },
]

export function SettingsPanel() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()

  const activePanel = searchParams.get('panel')
  const activeTab = (searchParams.get('tab') as SettingsTab) || 'account'

  const handleTabChange = (tab: SettingsTab) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('panel', 'settings')
    params.set('tab', tab)
    router.push(`/profile?${params.toString()}`, { scroll: false })
  }

  if (activePanel !== 'settings') {
    return null
  }

  return (
    <div className="h-full max-w-[1400px]">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">Configuración</h2>
        <p className="text-sm text-muted-foreground mt-1">Gestiona los ajustes de tu cuenta</p>
      </div>

      <div className="border-b border-border mb-6">
        <nav className="flex flex-wrap gap-2 md:gap-4 md:overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-2 md:px-3 py-2 md:py-3 text-xs md:text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {activeTab === 'account' && <AccountSettings />}
        {activeTab === 'ia' && <AISettings />}
        {activeTab === 'budget' && <BudgetSettings />}
        {activeTab === 'savings' && <SavingsSettings />}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <ChangePinSection />
            {(!user?.oauth_provider || user.oauth_provider === 'local') && (
              <ChangePasswordSection />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Unified Account Settings ─────────────────────────────────────────────────

function AccountSettings() {
  const { account, accounts: allAccounts, user, switchAccount } = useAuth()
  const queryClient = useQueryClient()

  // Members state
  const [members, setMembers] = useState<Member[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)

  // Invitations state
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [isInviting, setIsInviting] = useState(false)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  // Rename state
  const [isRenaming, setIsRenaming] = useState(false)

  // Remove member state
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null)
  const [isRemovingMember, setIsRemovingMember] = useState(false)

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [deletePin, setDeletePin] = useState('')
  const [deletePinError, setDeletePinError] = useState('')
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)

  const isOwner = account?.role === 'owner'
  const canDeleteAccount = isOwner && allAccounts.length > 1

  useEffect(() => {
    if (account?.id) {
      loadMembers()
      loadInvitations()
    }
  }, [account?.id])

  // ─── Data Loading ──────────────────────────────

  const loadMembers = async () => {
    if (!account?.id) return
    setIsLoadingMembers(true)
    try {
      const { members: membersData } = await accounts.getMembers(account.id)
      setMembers(membersData)
    } catch (error) {
      console.error('Error loading members:', error)
    } finally {
      setIsLoadingMembers(false)
    }
  }

  const loadInvitations = async () => {
    if (!account?.id) return
    setIsLoadingInvitations(true)
    try {
      const { invitations: invitationsData } = await accounts.getInvitations(account.id)
      setInvitations(invitationsData.filter((inv) => inv.status === 'pending'))
    } catch (error) {
      console.error('Error loading invitations:', error)
    } finally {
      setIsLoadingInvitations(false)
    }
  }

  // ─── Handlers ──────────────────────────────────

  const handleSaveName = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsRenaming(true)

    const formData = new FormData(e.currentTarget)
    const newName = formData.get('name') as string

    try {
      await accounts.update(account!.id, { name: newName })
      toast.success('Nombre de cuenta actualizado correctamente')
      setTimeout(() => window.location.reload(), 1000)
    } catch (error) {
      toast.error('Error al actualizar el nombre', {
        description: (error as Error).message,
      })
    } finally {
      setIsRenaming(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim() || !account?.id) return

    setIsInviting(true)
    try {
      const cryptoStore = useCryptoStore.getState()
      const accountKey = cryptoStore.getAccountKey(account.id)

      if (!accountKey) {
        toast.error('Tu cuenta está bloqueada. Desbloquéala para invitar miembros.')
        setIsInviting(false)
        return
      }

      // Paso 1: Crear invitación (sin encrypted key aún)
      const { invitation, inviteLink } = await accounts.createInvitation(
        account.id,
        inviteEmail.trim()
      )

      // Paso 2: Cifrar AK con el token de la invitación (el token ES el secret)
      const encryptedKey = await encryptAccountKeyForInvitation(accountKey, invitation.token)

      // Paso 3: Guardar la encrypted key en la invitación
      await accounts.saveInvitationKey(account.id, invitation.id, encryptedKey)

      toast.success('Invitación creada correctamente')

      // El link normal ya incluye todo lo necesario (el token es la clave)
      await navigator.clipboard.writeText(`${window.location.origin}${inviteLink}`)
      toast.info('Enlace copiado al portapapeles')

      setInviteEmail('')
      loadInvitations()
    } catch (error: unknown) {
      const apiError = error as { message?: string }
      toast.error('Error al crear la invitación', {
        description: apiError.message,
      })
    } finally {
      setIsInviting(false)
    }
  }

  const handleCopyLink = async (token: string) => {
    const link = `${window.location.origin}/invite/${token}`
    await navigator.clipboard.writeText(link)
    setCopiedLink(token)
    setTimeout(() => setCopiedLink(null), 2000)
  }

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!account?.id) return
    try {
      await accounts.revokeInvitation(account.id, invitationId)
      toast.success('Invitación revocada')
      loadInvitations()
    } catch (error) {
      toast.error('Error al revocar la invitación')
      console.error('Error revoking invitation:', error)
    }
  }

  const handleRemoveMember = async () => {
    if (!account?.id || !memberToRemove) return

    setIsRemovingMember(true)
    try {
      await accounts.removeMember(account.id, memberToRemove.id)
      toast.success(`${memberToRemove.name} ha sido expulsado de la cuenta`)
      setMemberToRemove(null)
      loadMembers()
    } catch (error) {
      toast.error('Error al expulsar al miembro', {
        description: (error as Error).message,
      })
    } finally {
      setIsRemovingMember(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!account?.id || deleteConfirmName !== account.name || !deletePin) return

    setIsDeletingAccount(true)
    setDeletePinError('')

    try {
      // Verificar PIN antes de eliminar
      const keysData = await auth.getKeys()
      const { key_salt, encrypted_keys } = keysData

      if (encrypted_keys && encrypted_keys.length > 0) {
        const userKey = await deriveUserKey(deletePin, key_salt)
        try {
          await decryptAccountKey(encrypted_keys[0].encrypted_key, userKey)
        } catch {
          setDeletePinError('PIN incorrecto')
          setIsDeletingAccount(false)
          return
        }
      }

      await accounts.delete(account.id)

      // Limpiar la account key del cryptoStore
      const cryptoStore = useCryptoStore.getState()
      const newAccountKeys = new Map(cryptoStore.accountKeys)
      newAccountKeys.delete(account.id)
      useCryptoStore.setState({ accountKeys: newAccountKeys })

      // Invalidar cache de cuentas
      await queryClient.invalidateQueries({ queryKey: ['auth', 'accounts'] })
      await queryClient.refetchQueries({ queryKey: ['auth', 'accounts'] })

      // Cambiar a otra cuenta
      const remaining = allAccounts.filter((a) => a.id !== account.id)
      if (remaining.length > 0) {
        await switchAccount(remaining[0].id)
      }

      toast.success('Cuenta eliminada correctamente')
      setShowDeleteModal(false)
      setDeleteConfirmName('')
      setDeletePin('')
    } catch (error) {
      toast.error('Error al eliminar la cuenta', {
        description: (error as Error).message,
      })
    } finally {
      setIsDeletingAccount(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ─── Header: Cuenta activa ─── */}
      <div className="bg-card rounded-lg border border-border px-4 py-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-lg font-bold shrink-0">
          {account?.name?.charAt(0).toUpperCase() || '?'}
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-foreground truncate">
            {account?.name || 'Sin cuenta'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isOwner ? 'Propietario' : 'Miembro'}
            {members.length > 0 &&
              ` · ${members.length} ${members.length === 1 ? 'miembro' : 'miembros'}`}
          </p>
        </div>
      </div>

      {/* ─── Sección 1: Nombre de la cuenta ─── */}
      <div className="bg-card rounded-lg border border-border">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Nombre de la cuenta</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Cambia el nombre de tu cuenta</p>
        </div>
        <div className="p-4">
          <form onSubmit={handleSaveName} className="space-y-4 max-w-lg">
            <Input
              id="accountName"
              type="text"
              label="Nombre de la cuenta"
              name="name"
              defaultValue={account?.name || ''}
              required
            />
            <Button type="submit" disabled={isRenaming}>
              {isRenaming ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </form>
        </div>
      </div>

      {/* ─── Sección 2: Miembros ─── */}
      <div className="bg-card rounded-lg border border-border">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Miembros de la cuenta</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {members.length} {members.length === 1 ? 'miembro' : 'miembros'}
          </p>
        </div>

        <div className="p-4">
          {isLoadingMembers ? (
            <div className="flex items-center justify-center py-4 gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando...
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No hay miembros en esta cuenta
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        member.role === 'owner'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {member.role === 'owner' ? 'Propietario' : 'Miembro'}
                    </span>
                    {isOwner && member.role !== 'owner' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setMemberToRemove(member)}
                        className="text-xs text-destructive hover:text-destructive"
                      >
                        Expulsar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Sección 3: Invitaciones (solo owner) ─── */}
      {isOwner && (
        <div className="bg-card rounded-lg border border-border">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Invitar miembro</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Envía una invitación por email. El usuario recibirá un enlace para unirse.
            </p>
          </div>

          <div className="p-4 space-y-4">
            <form onSubmit={handleInvite} className="space-y-4 max-w-lg">
              <Input
                id="inviteEmail"
                type="email"
                label="Email del usuario"
                placeholder="juan@email.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                💡 No enviamos emails automáticamente. Copia el enlace y compártelo manualmente.
              </p>
              <Button type="submit" disabled={isInviting}>
                {isInviting ? 'Creando invitación...' : 'Crear invitación'}
              </Button>
            </form>

            {/* Invitaciones pendientes */}
            {invitations.length > 0 && (
              <div className="pt-4 border-t border-border">
                <h4 className="text-sm font-medium text-foreground mb-3">
                  Invitaciones pendientes ({invitations.length})
                </h4>
                <div className="space-y-2">
                  {invitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-muted/50 rounded-lg gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{inv.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Expira: {new Date(inv.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyLink(inv.token)}
                          className="text-xs"
                        >
                          {copiedLink === inv.token ? '✓ Copiado' : 'Copiar enlace'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeInvitation(inv.id)}
                          className="text-xs text-destructive hover:text-destructive"
                        >
                          Revocar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Sección 4: Zona de peligro (solo owner) ─── */}
      {isOwner && (
        <div className="bg-card rounded-lg border border-destructive/30">
          <div className="px-4 py-3 border-b border-destructive/30">
            <h3 className="text-sm font-semibold text-destructive">Zona de peligro</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Acciones irreversibles sobre esta cuenta
            </p>
          </div>
          <div className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Eliminar cuenta</p>
                <p className="text-xs text-muted-foreground">
                  Se eliminarán todas las transacciones, categorías, miembros e invitaciones.
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                disabled={!canDeleteAccount}
                onClick={() => setShowDeleteModal(true)}
                className="shrink-0"
              >
                Eliminar cuenta
              </Button>
            </div>
            {!canDeleteAccount && allAccounts.length <= 1 && (
              <p className="text-xs text-muted-foreground mt-2">
                No puedes eliminar tu única cuenta. Crea otra cuenta antes de eliminar esta.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─── Modal: Confirmar expulsión de miembro ─── */}
      <ConfirmDialog
        open={!!memberToRemove}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
        title="Expulsar miembro"
        description={
          memberToRemove
            ? `¿Expulsar a "${memberToRemove.name}" (${memberToRemove.email}) de la cuenta "${account?.name}"? El miembro perderá acceso a todas las transacciones.`
            : ''
        }
        confirmLabel="Expulsar"
        onConfirm={handleRemoveMember}
        variant="danger"
        isLoading={isRemovingMember}
      />

      {/* ─── Modal: Confirmar eliminación de cuenta ─── */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          if (!isDeletingAccount) {
            setShowDeleteModal(false)
            setDeleteConfirmName('')
            setDeletePin('')
            setDeletePinError('')
          }
        }}
        title="Eliminar cuenta"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Esta acción es irreversible. Se eliminarán todas las transacciones, categorías, miembros
            e invitaciones de{' '}
            <strong className="text-foreground">&ldquo;{account?.name}&rdquo;</strong>.
          </p>

          <div className="space-y-3">
            <div>
              <p className="text-sm text-foreground mb-1.5">
                Escribe <strong>{account?.name}</strong> para confirmar:
              </p>
              <Input
                id="deleteConfirmName"
                type="text"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder={account?.name || ''}
                autoComplete="off"
              />
              {deleteConfirmName !== '' && deleteConfirmName !== account?.name && (
                <p className="text-xs text-destructive mt-1">El nombre no coincide</p>
              )}
            </div>

            <div>
              <p className="text-sm text-foreground mb-1.5">Introduce tu PIN de cifrado:</p>
              <Input
                id="deletePin"
                type="password"
                value={deletePin}
                onChange={(e) => {
                  setDeletePin(e.target.value.replace(/\D/g, '').slice(0, 8))
                  setDeletePinError('')
                }}
                placeholder="••••••"
                autoComplete="off"
                inputMode="numeric"
              />
              {deletePinError && <p className="text-xs text-destructive mt-1">{deletePinError}</p>}
            </div>
          </div>
        </div>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowDeleteModal(false)
              setDeleteConfirmName('')
              setDeletePin('')
              setDeletePinError('')
            }}
            disabled={isDeletingAccount}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteAccount}
            disabled={deleteConfirmName !== account?.name || !deletePin || isDeletingAccount}
            isLoading={isDeletingAccount}
          >
            Eliminar cuenta
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}

function BudgetSettings() {
  return (
    <div className="bg-white dark:bg-[#161b22] rounded-lg border border-gray-200 dark:border-[#30363d]">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-[#30363d]">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Presupuesto</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Establecer los límites de gastos dependiendo la categoría seleccionada
        </p>
      </div>
      <div className="p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Próximamente...</p>
      </div>
    </div>
  )
}

function SavingsSettings() {
  return (
    <div className="bg-white dark:bg-[#161b22] rounded-lg border border-gray-200 dark:border-[#30363d]">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-[#30363d]">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Ahorro e Inversión</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Qué parte destinaremos al ahorro y qué parte a Inversión
        </p>
      </div>
      <div className="p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Próximamente...</p>
      </div>
    </div>
  )
}

function ChangePinSection() {
  const router = useRouter()
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const validatePin = (pin: string): string | null => {
    if (pin.length < 6) return 'El PIN debe tener al menos 6 dígitos'
    if (pin.length > 8) return 'El PIN debe tener máximo 8 dígitos'
    if (!/^\d+$/.test(pin)) return 'El PIN solo puede contener números'
    return null
  }

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    const pinError = validatePin(newPin)
    if (pinError) {
      setMessage({ type: 'error', text: pinError })
      return
    }

    if (newPin !== confirmPin) {
      setMessage({ type: 'error', text: 'Los PINs no coinciden' })
      return
    }

    setIsLoading(true)

    try {
      const keysData = await auth.getKeys()
      const { key_salt: currentKeySalt, encrypted_keys } = keysData

      if (!encrypted_keys || encrypted_keys.length === 0) {
        setMessage({ type: 'error', text: 'No hay claves de cifrado configuradas' })
        setIsLoading(false)
        return
      }

      const currentUK = await deriveUserKey(currentPin, currentKeySalt)

      try {
        await decryptAccountKey(encrypted_keys[0].encrypted_key, currentUK)
      } catch {
        setMessage({ type: 'error', text: 'PIN o contraseña actual incorrectos' })
        setIsLoading(false)
        return
      }

      const newKeySalt = generateKeySalt()
      const newUK = await deriveUserKey(newPin, newKeySalt)

      const verificationBlob = await generateVerificationBlob(newUK)

      const reEncryptedKeys: Array<{ accountId: string; encryptedKey: string }> = []

      for (const key of encrypted_keys) {
        const decryptedAK = await decryptAccountKey(key.encrypted_key, currentUK)
        const reEncryptedAK = await encryptAccountKey(decryptedAK, newUK)
        reEncryptedKeys.push({
          accountId: key.account_id,
          encryptedKey: reEncryptedAK,
        })
      }

      await auth.changePin(currentPin, newPin, newKeySalt, verificationBlob, reEncryptedKeys)

      useCryptoStore.getState().lock()

      setMessage({
        type: 'success',
        text: 'PIN cambiado correctamente. Redirigiendo a login...',
      })

      setTimeout(() => router.push('/login'), 2000)
    } catch (error) {
      const err = error as Error
      setMessage({ type: 'error', text: err.message || 'Error al cambiar el PIN' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Cambiar PIN de cifrado</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          El PIN protege tus datos cifrados. Se te pedirá cada vez que inicies sesión o recargues la
          página.
        </p>
      </div>

      <div className="p-4">
        {message && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleChangePin} className="space-y-4">
          <Input
            id="currentPin"
            type="password"
            label="PIN o contraseña actual"
            value={currentPin}
            onChange={(e) => setCurrentPin(e.target.value)}
            required
            autoComplete="current-password"
          />

          <Input
            id="newPin"
            type="password"
            label="Nuevo PIN (6-8 dígitos)"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
            required
            inputMode="numeric"
            maxLength={8}
            placeholder="••••••"
          />

          <Input
            id="confirmPin"
            type="password"
            label="Confirmar nuevo PIN"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
            required
            inputMode="numeric"
            maxLength={8}
            placeholder="••••••"
          />

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              <strong>Importante:</strong> Al cambiar tu PIN, se re-cifrarán todas tus claves de
              cuenta, se cerrará tu sesión y deberás volver a iniciar sesión con el nuevo PIN.
            </p>
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Cambiando PIN...' : 'Cambiar PIN'}
          </Button>
        </form>
      </div>
    </div>
  )
}

function ChangePasswordSection() {
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden' })
      return
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'La nueva contraseña debe tener al menos 6 caracteres' })
      return
    }

    setIsLoading(true)

    try {
      const keysData = await auth.getKeys()
      const { key_salt: currentKeySalt, verification_blob, encrypted_keys } = keysData

      // Check if the password is the encryption source (no separate PIN set)
      let passwordIsEncryptionSource = false

      if (encrypted_keys && encrypted_keys.length > 0 && currentKeySalt) {
        const currentUK = await deriveUserKey(currentPassword, currentKeySalt)

        if (verification_blob) {
          // If blob exists, verify password against it
          const { verifyUserKey } = await import('@/lib/crypto')
          passwordIsEncryptionSource = await verifyUserKey(verification_blob, currentUK)
        } else {
          // No blob = legacy user, password is encryption source
          // Try to decrypt first account key to confirm
          try {
            await decryptAccountKey(encrypted_keys[0].encrypted_key, currentUK)
            passwordIsEncryptionSource = true
          } catch {
            passwordIsEncryptionSource = false
          }
        }
      }

      if (passwordIsEncryptionSource && encrypted_keys && encrypted_keys.length > 0) {
        // Password IS the encryption source → re-encrypt keys with new password
        const newKeySalt = generateKeySalt()

        const currentUK = await deriveUserKey(currentPassword, currentKeySalt)
        const newUK = await deriveUserKey(newPassword, newKeySalt)

        const verificationBlob = await generateVerificationBlob(newUK)

        const reEncryptedKeys: Array<{ accountId: string; encryptedKey: string }> = []

        for (const key of encrypted_keys) {
          try {
            const decryptedAK = await decryptAccountKey(key.encrypted_key, currentUK)
            const reEncryptedAK = await encryptAccountKey(decryptedAK, newUK)
            reEncryptedKeys.push({
              accountId: key.account_id,
              encryptedKey: reEncryptedAK,
            })
          } catch (decryptError) {
            console.error('Error re-encrypting key for account:', key.account_id, decryptError)
            setMessage({
              type: 'error',
              text: 'Error al re-cifrar las claves. Verifica que la contraseña actual es correcta.',
            })
            setIsLoading(false)
            return
          }
        }

        await auth.changePassword(currentPassword, newPassword, newKeySalt, reEncryptedKeys)

        // Also save the new verification blob
        try {
          await auth.saveVerificationBlob(verificationBlob)
        } catch {
          // Non-critical, blob will be generated on next PIN change
        }
      } else {
        // Password is NOT the encryption source (user has a separate PIN)
        // Only change the auth password, don't touch encryption
        await auth.changePassword(currentPassword, newPassword)
      }

      useCryptoStore.getState().lock()

      setMessage({
        type: 'success',
        text: 'Contraseña cambiada correctamente. Redirigiendo a login...',
      })

      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (error) {
      const err = error as Error
      setMessage({ type: 'error', text: err.message || 'Error al cambiar la contraseña' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">
          Cambiar contraseña de inicio de sesión
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Actualiza tu contraseña de login. Si tienes un PIN de cifrado configurado, no se verá
          afectado.
        </p>
      </div>

      <div className="p-4">
        {message && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            id="currentPassword"
            type="password"
            label="Contraseña actual"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          <Input
            id="newPassword"
            type="password"
            label="Nueva contraseña"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={6}
          />

          <Input
            id="confirmPassword"
            type="password"
            label="Confirmar nueva contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              <strong>Importante:</strong> Al cambiar tu contraseña, se cerrarán todas tus sesiones
              y deberás volver a iniciar sesión.
            </p>
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Cambiando contraseña...' : 'Cambiar contraseña'}
          </Button>
        </form>
      </div>
    </div>
  )
}
