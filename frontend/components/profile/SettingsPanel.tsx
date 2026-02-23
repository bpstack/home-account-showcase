'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { accounts, auth, users } from '@/lib/apiClient'
import { useBudgets, useCreateBudget, useUpdateBudget, useDeleteBudget } from '@/lib/queries/budget'
import { useCategories } from '@/lib/queries/categories'
import { useTransactions } from '@/lib/queries/transactions'
import { Button, Input, AccountSwitcher } from '@/components/ui'
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
import { Loader2, Pencil, UserPlus } from 'lucide-react'
import { validateBudget, validateUpdateBudget } from '@/validators/budget-validators'
import { validateUserName, validateAccountName } from '@/validators/settings-validators'

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

type SettingsTab = 'account' | 'budget' | 'security' | 'ia' | 'user'

const tabs: { id: SettingsTab; label: string; description: string }[] = [
  { id: 'user', label: 'Usuario', description: 'Gestiona tu email y preferencias' },
  { id: 'account', label: 'Cuenta', description: 'Gestiona tu cuenta y miembros' },
  { id: 'ia', label: 'IA', description: 'Configura los proveedores de IA para el parsing' },
  {
    id: 'budget',
    label: 'Presupuesto',
    description: 'Establecer los límites de gastos dependiendo la categoría seleccionada',
  },
  { id: 'security', label: 'Seguridad', description: 'Aumentar la seguridad de mi cuenta' },
]

export function SettingsPanel() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()

  const activePanel = searchParams.get('panel')
  const activeTab = (searchParams.get('tab') as SettingsTab) || 'user'

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
        {activeTab === 'user' && <UserSettings />}
        {activeTab === 'account' && <AccountSettings />}
        {activeTab === 'ia' && <AISettings />}
        {activeTab === 'budget' && <BudgetSettings />}
        {activeTab === 'security' && (
          <div className="space-y-6">
            {(!user?.oauth_provider || user.oauth_provider === 'local') && (
              <ChangePasswordSection />
            )}
            <ChangePinSection />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── User Settings ─────────────────────────────────────────────────

function UserSettings() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Name state
  const [newName, setNewName] = useState(user?.name || '')
  const [isSavingName, setIsSavingName] = useState(false)
  const [nameError, setNameError] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)

  // Email state
  const [newEmail, setNewEmail] = useState('')
  const [isChangingEmail, setIsChangingEmail] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [emailChangeMessage, setEmailChangeMessage] = useState('')
  const [emailChangeError, setEmailChangeError] = useState('')
  const [isEditingEmail, setIsEditingEmail] = useState(false)

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || newName.trim() === user.name) return

    const validation = validateUserName({ name: newName.trim() })
    if (!validation.success) {
      setNameError(validation.errors.name || 'Error de validación')
      return
    }

    setNameError('')
    setIsSavingName(true)
    try {
      await users.update(user.id, { name: newName.trim() })
      toast.success('Nombre actualizado correctamente')
      queryClient.invalidateQueries({ queryKey: ['auth', 'user'] })
      setIsEditingName(false)
    } catch (error) {
      toast.error('Error al actualizar el nombre', { description: (error as Error).message })
    } finally {
      setIsSavingName(false)
    }
  }

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail.trim()) return

    setIsChangingEmail(true)
    setEmailChangeMessage('')
    setEmailChangeError('')

    try {
      await auth.changeEmail(newEmail.trim().toLowerCase())
      setEmailChangeMessage('Se ha enviado un email de verificación a tu nuevo correo.')
      setNewEmail('')
      // Refrescar datos del usuario para que pending_email aparezca
      queryClient.invalidateQueries({ queryKey: ['auth', 'user'] })
    } catch (error) {
      setEmailChangeError((error as Error).message)
    } finally {
      setIsChangingEmail(false)
    }
  }

  const handleCancelEmailChange = async () => {
    setIsCancelling(true)
    setEmailChangeError('')
    try {
      await auth.cancelEmailChange()
      setEmailChangeMessage('')
      toast.success('Cambio de email cancelado.')
      queryClient.invalidateQueries({ queryKey: ['auth', 'user'] })
    } catch (error) {
      setEmailChangeError((error as Error).message)
    } finally {
      setIsCancelling(false)
    }
  }

  const isLocalUser = user?.oauth_provider === 'local' || !user?.oauth_provider

  return (
    <div className="space-y-6">
      {/* Name Section */}
      <div className="bg-card rounded-lg border border-border">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Nombre</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Cambia tu nombre visible</p>
        </div>
        <div className="p-4">
          {!isEditingName ? (
            <div className="flex items-center gap-3">
              <p className="text-sm text-foreground flex-1">{user?.name}</p>
              <button
                type="button"
                onClick={() => {
                  setNewName(user?.name || '')
                  setNameError('')
                  setIsEditingName(true)
                }}
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
                title="Editar nombre"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSaveName} className="space-y-4 max-w-lg">
              <Input
                id="userName"
                type="text"
                label="Nombre"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value)
                  if (nameError) setNameError('')
                }}
                error={nameError}
                required
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isSavingName || !newName.trim() || newName.trim() === user?.name}
                  isLoading={isSavingName}
                >
                  Guardar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditingName(false)
                    setNewName(user?.name || '')
                    setNameError('')
                  }}
                  disabled={isSavingName}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Email Section */}
      <div className="bg-card rounded-lg border border-border">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Correo electrónico</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Gestiona tu correo electrónico</p>
        </div>
        <div className="p-4">
          {/* Current email display */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
              <svg
                className="w-5 h-5 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user?.email}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                {isLocalUser ? 'Cuenta local' : `Vinculado con ${user?.oauth_provider}`}
                {user?.email_verified && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ Verificado
                  </span>
                )}
              </p>
            </div>
            {isLocalUser && !isEditingEmail && (
              <button
                type="button"
                onClick={() => {
                  setNewEmail('')
                  setEmailChangeMessage('')
                  setEmailChangeError('')
                  setIsEditingEmail(true)
                }}
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
                title="Cambiar correo"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Cambio de email pendiente */}
          {isLocalUser && user?.pending_email && (
            <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                Cambio de email pendiente
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                Confirmación enviada a <span className="font-semibold">{user.pending_email}</span>.
                Revisa tu bandeja de entrada y haz clic en el enlace para confirmar el cambio.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEmailChange}
                isLoading={isCancelling}
                disabled={isCancelling}
              >
                Cancelar cambio
              </Button>
            </div>
          )}

          {/* Email change form - only visible when editing */}
          {isLocalUser && isEditingEmail && (
            <form onSubmit={handleChangeEmail} className="space-y-4 max-w-lg">
              <div>
                <label htmlFor="newEmail" className="text-sm font-medium mb-2 block">
                  {user?.pending_email
                    ? 'Solicitar nuevo cambio de correo'
                    : 'Nuevo correo electrónico'}
                </label>
                <Input
                  id="newEmail"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="nuevo@email.com"
                  disabled={isChangingEmail}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Te enviaremos un enlace de verificación a tu nuevo correo.
                </p>
              </div>

              {emailChangeMessage && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-600 dark:text-emerald-400">
                  {emailChangeMessage}
                </div>
              )}

              {emailChangeError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                  {emailChangeError}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={!newEmail.trim() || isChangingEmail}
                  isLoading={isChangingEmail}
                >
                  Cambiar correo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditingEmail(false)
                    setNewEmail('')
                    setEmailChangeMessage('')
                    setEmailChangeError('')
                  }}
                  disabled={isChangingEmail}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          )}

          {user?.oauth_provider !== 'local' && user?.oauth_provider && (
            <p className="text-sm text-muted-foreground">
              El correo electrónico está vinculado a tu cuenta de {user?.oauth_provider}. Para
              cambiarlo, debes hacerlo desde tu cuenta de {user?.oauth_provider}.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Unified Account Settings ─────────────────────────────────────────────────

function AccountSettings() {
  const { account, accounts: allAccounts, switchAccount } = useAuth()
  const queryClient = useQueryClient()

  // Members state
  const [members, setMembers] = useState<Member[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)

  // Invitations state
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [_isLoadingInvitations, setIsLoadingInvitations] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [isInviting, setIsInviting] = useState(false)
  const [isInviteFormOpen, setIsInviteFormOpen] = useState(false)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  // Rename state
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameError, setRenameError] = useState('')
  const [isEditingAccountName, setIsEditingAccountName] = useState(false)
  const [accountNameValue, setAccountNameValue] = useState(account?.name || '')

  // Remove member state
  const [_removingMemberId, _setRemovingMemberId] = useState<string | null>(null)
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null)
  const [isRemovingMember, setIsRemovingMember] = useState(false)

  // Leave account state (for members)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [isLeavingAccount, setIsLeavingAccount] = useState(false)

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
      setAccountNameValue(account.name || '')
      setIsEditingAccountName(false)
      setRenameError('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleSaveAccountName = async (e: React.FormEvent) => {
    e.preventDefault()

    const validation = validateAccountName({ name: accountNameValue })
    if (!validation.success) {
      setRenameError(validation.errors.name || 'Error de validación')
      return
    }

    setRenameError('')
    setIsRenaming(true)

    try {
      await accounts.update(account!.id, { name: accountNameValue })
      toast.success('Nombre de cuenta actualizado correctamente')
      setIsEditingAccountName(false)
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

  const cleanupAfterAccountRemoval = async (accountId: string) => {
    // 1. Limpiar account key del cryptoStore
    const cryptoStore = useCryptoStore.getState()
    const newAccountKeys = new Map(cryptoStore.accountKeys)
    newAccountKeys.delete(accountId)
    useCryptoStore.setState({ accountKeys: newAccountKeys })

    // 2. Invalidar todos los caches de React Query vinculados a la cuenta
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['auth', 'accounts'] }),
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['categories'] }),
      queryClient.invalidateQueries({ queryKey: ['budgets'] }),
      queryClient.invalidateQueries({ queryKey: ['investment'] }),
    ])
    await queryClient.refetchQueries({ queryKey: ['auth', 'accounts'] })

    // 3. Limpiar stores de Zustand con localStorage persistido
    localStorage.removeItem('balance-storage')
    localStorage.removeItem('dashboard-storage')
    localStorage.removeItem('filters-storage')
    localStorage.removeItem('transactions-storage')

    // 4. Cambiar a otra cuenta
    const remaining = allAccounts.filter((a) => a.id !== accountId)
    if (remaining.length > 0) {
      await switchAccount(remaining[0].id)
    }
  }

  const handleLeaveAccount = async () => {
    if (!account?.id) return

    setIsLeavingAccount(true)
    try {
      await accounts.leaveAccount(account.id)
      await cleanupAfterAccountRemoval(account.id)

      toast.success('Has abandonado la cuenta correctamente')
      setShowLeaveConfirm(false)
    } catch (error) {
      toast.error('Error al abandonar la cuenta', {
        description: (error as Error).message,
      })
    } finally {
      setIsLeavingAccount(false)
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
      await cleanupAfterAccountRemoval(account.id)

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
      {/* ─── Header: Cuenta activa + Selector ─── */}
      <div className="bg-card rounded-lg border border-border">
        <div className="px-4 py-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-lg font-bold shrink-0">
            {account?.name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="min-w-0 flex-1">
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

        {allAccounts.length > 1 && (
          <div className="px-4 pb-4 pt-0">
            <p className="text-xs text-muted-foreground mb-2">Cambiar cuenta</p>
            <AccountSwitcher variant="list" />
          </div>
        )}
      </div>

      {/* ─── Sección 1: Nombre de la cuenta ─── */}
      <div className="bg-card rounded-lg border border-border">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Nombre de la cuenta</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Cambia el nombre de tu cuenta</p>
        </div>
        <div className="p-4">
          {!isEditingAccountName ? (
            <div className="flex items-center gap-3">
              <p className="text-sm text-foreground flex-1">{account?.name}</p>
              <button
                type="button"
                onClick={() => {
                  setAccountNameValue(account?.name || '')
                  setRenameError('')
                  setIsEditingAccountName(true)
                }}
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
                title="Editar nombre de cuenta"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSaveAccountName} className="space-y-4 max-w-lg">
              <Input
                id="accountName"
                type="text"
                label="Nombre de la cuenta"
                value={accountNameValue}
                onChange={(e) => {
                  setAccountNameValue(e.target.value)
                  if (renameError) setRenameError('')
                }}
                error={renameError}
                required
                autoFocus
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={isRenaming} isLoading={isRenaming}>
                  Guardar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditingAccountName(false)
                    setAccountNameValue(account?.name || '')
                    setRenameError('')
                  }}
                  disabled={isRenaming}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          )}
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
            {!isInviteFormOpen ? (
              <button
                type="button"
                onClick={() => {
                  setInviteEmail('')
                  setIsInviteFormOpen(true)
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary border border-dashed border-primary/40 rounded-lg hover:bg-primary/5 transition-colors w-full justify-center"
              >
                <UserPlus className="w-4 h-4" />
                Invitar miembro
              </button>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4 max-w-lg">
                <Input
                  id="inviteEmail"
                  type="email"
                  label="Email del usuario"
                  placeholder="juan@email.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  No enviamos emails. Copia el enlace y compártelo manualmente.
                </p>
                <div className="flex gap-2">
                  <Button type="submit" disabled={isInviting} isLoading={isInviting}>
                    Crear invitación
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsInviteFormOpen(false)
                      setInviteEmail('')
                    }}
                    disabled={isInviting}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            )}

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

      {/* ─── Sección 4: Zona de peligro ─── */}
      <div className="bg-card rounded-lg border border-destructive/30">
        <div className="px-4 py-3 border-b border-destructive/30">
          <h3 className="text-sm font-semibold text-destructive">Zona de peligro</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Acciones irreversibles sobre esta cuenta
          </p>
        </div>
        <div className="p-4 space-y-4">
          {isOwner ? (
            <>
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
                <p className="text-xs text-muted-foreground">
                  No puedes eliminar tu única cuenta. Crea otra cuenta antes de eliminar esta.
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Abandonar cuenta</p>
                <p className="text-xs text-muted-foreground">
                  Perderás acceso a todas las transacciones y datos de esta cuenta.
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                disabled={allAccounts.length <= 1}
                onClick={() => setShowLeaveConfirm(true)}
                className="shrink-0"
              >
                Abandonar cuenta
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Modal: Confirmar abandono de cuenta ─── */}
      <ConfirmDialog
        open={showLeaveConfirm}
        onOpenChange={(open) => !open && setShowLeaveConfirm(false)}
        title="Abandonar cuenta"
        description={`¿Abandonar la cuenta "${account?.name}"? Perderás acceso a todas las transacciones y datos. Esta acción no se puede deshacer.`}
        confirmLabel="Abandonar"
        onConfirm={handleLeaveAccount}
        variant="danger"
        isLoading={isLeavingAccount}
      />

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
  const { account } = useAuth()
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    category_id: '',
    amount: '',
    period: 'monthly' as const,
    alert_threshold: 80,
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const accountId = account?.id

  // Get budget config (limits per category)
  const { data: budgets, isLoading: budgetsLoading, refetch } = useBudgets(accountId)
  const { data: categoriesData } = useCategories(accountId || '')
  const categories = useMemo(() => categoriesData?.categories || [], [categoriesData])

  // Get decrypted transactions for the selected month to calculate spending
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endOfMonth = new Date(year, month, 0)
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(endOfMonth.getDate()).padStart(2, '0')}`

  const { data: transactionsData, isLoading: transactionsLoading } = useTransactions(
    {
      account_id: accountId || '',
      start_date: startDate,
      end_date: endDate,
      limit: 10000,
    },
    { enabled: !!accountId }
  )

  const createBudget = useCreateBudget()
  const updateBudget = useUpdateBudget()
  const deleteBudget = useDeleteBudget()

  // Calculate spending per category client-side
  const budgetsWithSpending = useMemo(() => {
    if (!budgets || !categories || !transactionsData) return []

    const transactions = transactionsData.transactions || []

    // Group transactions by category
    const spendingByCategory: Record<string, number> = {}

    transactions.forEach((tx) => {
      if (tx.amount >= 0) return // Only expenses (negative amounts)

      // Find category of this transaction (via subcategory)
      const subcategory = categories.find((c) =>
        c.subcategories?.some((sc) => sc.id === tx.subcategory_id)
      )

      if (subcategory) {
        if (!spendingByCategory[subcategory.id]) {
          spendingByCategory[subcategory.id] = 0
        }
        spendingByCategory[subcategory.id] += Math.abs(tx.amount)
      }
    })

    // Combine budgets with calculated spending
    return budgets.map((budget) => {
      const category = categories.find((c: any) => c.id === budget.category_id)
      const budgetAmount = Number(budget.amount)
      const alertThreshold = Number(budget.alert_threshold)
      const spent = spendingByCategory[budget.category_id] || 0
      const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0
      const remaining = budgetAmount - spent

      let status: 'normal' | 'warning' | 'exceeded' = 'normal'
      if (percentage > 100) {
        status = 'exceeded'
      } else if (percentage >= alertThreshold) {
        status = 'warning'
      }

      return {
        ...budget,
        amount: budgetAmount,
        alert_threshold: alertThreshold,
        categoryName: category?.name || 'Unknown',
        categoryColor: category?.color || '#888',
        spent,
        remaining,
        percentage,
        status,
      }
    })
  }, [budgets, categories, transactionsData])

  const isLoading = budgetsLoading || transactionsLoading
  const unbudgeted = categories.filter((c: any) => !budgets?.some((b) => b.category_id === c.id))

  const totalBudget = (budgetsWithSpending || []).reduce(
    (sum, b) => sum + (Number(b.amount) || 0),
    0
  )
  const totalSpent = (budgetsWithSpending || []).reduce((sum, b) => sum + (Number(b.spent) || 0), 0)
  const totalPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0

  const openNew = () => {
    setEditingId(null)
    setForm({
      category_id: unbudgeted[0]?.id || '',
      amount: '',
      period: 'monthly',
      alert_threshold: 80,
    })
    setFieldErrors({})
    setShowModal(true)
  }

  const openEdit = (b: any) => {
    setEditingId(b.id)
    setForm({
      category_id: b.category_id,
      amount: String(b.amount),
      period: b.period,
      alert_threshold: Number(b.alert_threshold),
    })
    setFieldErrors({})
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!account?.id) return

    const validation = editingId
      ? validateUpdateBudget({
          amount: form.amount,
          period: form.period,
          alert_threshold: form.alert_threshold,
        })
      : validateBudget({
          category_id: form.category_id,
          amount: form.amount,
          period: form.period,
          alert_threshold: form.alert_threshold,
        })

    if (!validation.success) {
      setFieldErrors(validation.errors)
      return
    }

    setFieldErrors({})

    try {
      if (editingId) {
        await updateBudget.mutateAsync({
          id: editingId,
          payload: {
            account_id: account.id,
            amount: parseInt(form.amount, 10),
            period: form.period,
            alert_threshold: form.alert_threshold,
          },
        })
        toast.success('Presupuesto actualizado')
      } else {
        await createBudget.mutateAsync({
          account_id: account.id,
          category_id: form.category_id,
          amount: parseInt(form.amount, 10),
          period: form.period,
          alert_threshold: form.alert_threshold,
        })
        toast.success('Presupuesto creado')
      }
      setShowModal(false)
      setEditingId(null)
      refetch()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!account?.id) return

    try {
      await deleteBudget.mutateAsync({ id, accountId: account.id })
      toast.success('Presupuesto eliminado')
      refetch()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const getBarColor = (status: string) => {
    if (status === 'exceeded') return 'bg-red-500'
    if (status === 'warning') return 'bg-amber-500'
    return 'bg-emerald-500'
  }

  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Presupuesto</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Límites de gasto por categoría</p>
      </div>

      {/* Summary */}
      {budgetsWithSpending && budgetsWithSpending.length > 0 && (
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Total presupuesto:</span>
            <span className="font-medium">€{(totalBudget || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Total gastado:</span>
            <span className={`font-medium ${totalSpent > totalBudget ? 'text-red-500' : ''}`}>
              €{(totalSpent || 0).toFixed(2)}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                totalPercentage > 100
                  ? 'bg-red-500'
                  : totalPercentage > 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(totalPercentage, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {(totalPercentage || 0).toFixed(1)}% usado
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="p-3 flex items-center gap-2 border-b border-border">
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="h-8 text-xs border border-border rounded-lg px-2 bg-background"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(0, i).toLocaleDateString('es', { month: 'long' })}
            </option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="h-8 text-xs border border-border rounded-lg px-2 bg-background"
        >
          {[2024, 2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <button
          onClick={openNew}
          disabled={unbudgeted.length === 0}
          className="ml-auto h-8 px-3 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          + Añadir
        </button>
      </div>

      {/* List */}
      <div className="p-3">
        {isLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : budgetsWithSpending.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sin presupuestos configurados
          </p>
        ) : (
          <div className="space-y-3">
            {budgetsWithSpending.map((b) => (
              <div key={b.id} className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: b.categoryColor }}
                    />
                    <span className="text-sm font-medium">{b.categoryName}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(b)}
                      className="p-1 text-muted-foreground hover:text-foreground"
                      title="Editar"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="p-1 text-muted-foreground hover:text-red-500"
                      title="Eliminar"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-1.5">
                  <div
                    className={`h-full transition-all ${getBarColor(b.status)}`}
                    style={{ width: `${Math.min(b.percentage, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    €{b.spent.toFixed(2)} / €{b.amount.toFixed(2)}
                  </span>
                  <span
                    className={
                      b.status === 'exceeded'
                        ? 'text-red-500'
                        : b.status === 'warning'
                          ? 'text-amber-500'
                          : ''
                    }
                  >
                    {b.percentage.toFixed(1)}%
                  </span>
                </div>
                {b.remaining < 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    €{Math.abs(b.remaining).toFixed(2)} sobre presupuesto
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setEditingId(null)
        }}
        title={editingId ? 'Editar presupuesto' : 'Nuevo presupuesto'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Categoría</label>
            {editingId ? (
              <p className="mt-1 h-10 px-3 flex items-center text-sm text-muted-foreground border border-border rounded-lg bg-muted/30">
                {categories.find((c: any) => c.id === form.category_id)?.name || form.category_id}
              </p>
            ) : (
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full mt-1 h-10 px-3 border border-border rounded-lg bg-background"
                required
              >
                <option value="">Seleccionar...</option>
                {unbudgeted.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Cantidad (€)</label>
            <Input
              type="number"
              step="1"
              min="1"
              max="900000"
              value={form.amount}
              onChange={(e) => {
                setForm({ ...form, amount: e.target.value })
                if (fieldErrors.amount) {
                  setFieldErrors((prev) => ({ ...prev, amount: '' }))
                }
              }}
              className={`mt-1 ${fieldErrors.amount ? 'border-red-500 focus:border-red-500' : ''}`}
              required
            />
            {fieldErrors.amount && (
              <p className="text-xs text-red-500 mt-1">{fieldErrors.amount}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Periodo</label>
            <select
              value={form.period}
              onChange={(e) => setForm({ ...form, period: e.target.value as any })}
              className="w-full mt-1 h-10 px-3 border border-border rounded-lg bg-background"
            >
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
              <option value="yearly">Anual</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Alerta al {form.alert_threshold}%</label>
            <input
              type="range"
              min="50"
              max="100"
              value={form.alert_threshold}
              onChange={(e) => setForm({ ...form, alert_threshold: Number(e.target.value) })}
              className="w-full mt-2"
            />
          </div>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false)
                setEditingId(null)
                setFieldErrors({})
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createBudget.isPending || updateBudget.isPending}>
              {(createBudget.isPending || updateBudget.isPending) && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              {editingId ? 'Guardar' : 'Crear'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
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
        setMessage({ type: 'error', text: 'PIN actual incorrecto' })
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
            label="PIN actual"
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
