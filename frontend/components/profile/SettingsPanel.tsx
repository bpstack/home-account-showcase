'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { accounts } from '@/lib/apiClient'
import { Button, Input } from '@/components/ui'
import { AISettings } from './AISettings'

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

type SettingsTab = 'account' | 'members' | 'budget' | 'savings' | 'security' | 'ia'

const tabs: { id: SettingsTab; label: string; description: string }[] = [
  { id: 'account', label: 'Cuenta', description: 'Gestiona tu cuenta' },
  { id: 'members', label: 'Miembros', description: 'Administra los miembros de tu cuenta' },
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
        {activeTab === 'members' && <MembersSettings />}
        {activeTab === 'ia' && <AISettings />}
        {activeTab === 'budget' && <BudgetSettings />}
        {activeTab === 'savings' && <SavingsSettings />}
        {activeTab === 'security' && <SecuritySettings />}
      </div>
    </div>
  )
}

function AccountSettings() {
  const { account } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSaveName = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    const formData = new FormData(e.currentTarget)
    const newName = formData.get('name') as string

    try {
      await accounts.update(account!.id, { name: newName })
      setMessage({ type: 'success', text: 'Nombre actualizado correctamente' })
      setTimeout(() => window.location.reload(), 1000)
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al actualizar el nombre' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Nombre de la cuenta</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Cambia el nombre de tu cuenta</p>
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
        <form onSubmit={handleSaveName} className="space-y-4">
          <Input
            id="accountName"
            type="text"
            label="Nombre de la cuenta"
            name="name"
            defaultValue={account?.name || ''}
            required
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </form>
      </div>
    </div>
  )
}

function MembersSettings() {
  const { account } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [isInviting, setIsInviting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  useEffect(() => {
    if (account?.id) {
      loadMembers()
      loadInvitations()
    }
  }, [account?.id])

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

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim() || !account?.id) return

    setIsInviting(true)
    setMessage(null)

    try {
      const { inviteLink } = await accounts.createInvitation(account.id, inviteEmail.trim())
      setMessage({
        type: 'success',
        text: `Invitación creada. Comparte este enlace: ${window.location.origin}${inviteLink}`,
      })
      setInviteEmail('')
      loadInvitations()
    } catch (error: unknown) {
      const apiError = error as { message?: string }
      setMessage({
        type: 'error',
        text: apiError.message || 'Error al crear invitación',
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
      loadInvitations()
    } catch (error) {
      console.error('Error revoking invitation:', error)
    }
  }

  // Verificar si el usuario actual es owner
  const currentMember = members.find((m) => m.role === 'owner')
  const isOwner = currentMember !== undefined

  return (
    <div className="space-y-6">
      {/* Invitar miembro - solo visible para owner */}
      {isOwner && (
        <div className="bg-card rounded-lg border border-border">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Invitar miembro</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Envía una invitación por email. El usuario recibirá un enlace para unirse.
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
            <form onSubmit={handleInvite} className="space-y-4">
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
          </div>
        </div>
      )}

      {/* Invitaciones pendientes - solo visible para owner */}
      {isOwner && invitations.length > 0 && (
        <div className="bg-card rounded-lg border border-border">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Invitaciones pendientes</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {invitations.length} {invitations.length === 1 ? 'invitación' : 'invitaciones'} sin
              aceptar
            </p>
          </div>

          <div className="p-4 space-y-3">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Expira: {new Date(inv.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
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
                    className="text-xs text-red-500 hover:text-red-600"
                  >
                    Revocar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de miembros */}
      <div className="bg-card rounded-lg border border-border">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Miembros de la cuenta</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {members.length} {members.length === 1 ? 'miembro' : 'miembros'}
          </p>
        </div>

        <div className="p-4">
          {isLoadingMembers ? (
            <div className="text-center py-4 text-sm text-gray-500">Cargando...</div>
          ) : members.length === 0 ? (
            <div className="text-center py-4 text-sm text-gray-500">
              No hay miembros en esta cuenta
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      member.role === 'owner'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {member.role === 'owner' ? 'Propietario' : 'Miembro'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
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

function SecuritySettings() {
  return (
    <div className="bg-white dark:bg-[#161b22] rounded-lg border border-gray-200 dark:border-[#30363d]">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-[#30363d]">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Seguridad</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Aumentar la seguridad de mi cuenta
        </p>
      </div>
      <div className="p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Próximamente...</p>
      </div>
    </div>
  )
}
