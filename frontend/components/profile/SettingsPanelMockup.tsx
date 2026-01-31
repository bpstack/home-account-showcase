'use client'

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MOCKUP: Pre-visualización del diseño de Settings
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Este componente es un MOCKUP con datos simulados para visualizar cómo quedarán
 * las nuevas funcionalidades antes de implementarlas.
 *
 * Funcionalidades mostradas:
 * - Tab "Cuenta": Nombre + Crear cuentas adicionales (máx 3)
 * - Tab "Miembros": Invitar + Invitaciones pendientes + Lista de miembros
 *
 * Para ver: http://localhost:3000/profile?panel=mockup
 *
 * NOTA: Eliminar este archivo después de implementar las funcionalidades reales.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState } from 'react'
import { Button, Input } from '@/components/ui'

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════════

const MOCK_USER = {
  id: 'user-001',
  name: 'Diego',
  email: 'diego@example.com',
}

const MOCK_ACCOUNTS = [
  { id: 'acc-001', name: 'Personal', role: 'owner' },
  { id: 'acc-002', name: 'Familia', role: 'owner' },
  // El usuario puede crear 1 más (máximo 3 como owner)
]

const MOCK_CURRENT_ACCOUNT = {
  id: 'acc-001',
  name: 'Personal',
  owner_id: 'user-001',
}

const MOCK_MEMBERS = [
  {
    id: 'user-001',
    name: 'Diego',
    email: 'diego@example.com',
    role: 'owner',
    joined_at: '2024-01-15',
  },
  {
    id: 'user-002',
    name: 'María',
    email: 'maria@example.com',
    role: 'member',
    joined_at: '2024-02-20',
  },
]

const MOCK_PENDING_INVITATIONS = [
  {
    id: 'inv-001',
    email: 'carlos@example.com',
    status: 'pending' as const,
    expires_at: '2026-02-01T12:00:00',
    created_at: '2026-01-31T12:00:00',
    token: 'abc123xyz789',
  },
  {
    id: 'inv-002',
    email: 'ana@example.com',
    status: 'expired' as const,
    expires_at: '2026-01-30T12:00:00',
    created_at: '2026-01-29T12:00:00',
    token: 'def456uvw321',
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type SettingsTab = 'account' | 'members'
type MockRole = 'owner' | 'member'

interface Invitation {
  id: string
  email: string
  status: 'pending' | 'expired' | 'accepted' | 'revoked'
  expires_at: string
  created_at: string
  token: string
}

interface MockConfig {
  role: MockRole
  ownedAccountsCount: 1 | 2 | 3
  hasPendingInvitations: boolean
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function SettingsPanelMockup() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('account')
  const [mockConfig, setMockConfig] = useState<MockConfig>({
    role: 'owner',
    ownedAccountsCount: 2,
    hasPendingInvitations: true,
  })

  const tabs = [
    { id: 'account' as const, label: 'Cuenta', description: 'Gestiona tu cuenta y crea nuevas' },
    { id: 'members' as const, label: 'Miembros', description: 'Invita y gestiona miembros' },
  ]

  return (
    <div className="h-full max-w-[1400px]">
      {/* Panel de control del MOCKUP */}
      <div className="mb-4 p-3 bg-yellow-400 text-yellow-900 rounded-lg">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="font-bold">🎨 MOCKUP</span>
          <div className="flex items-center gap-2">
            <label>Rol:</label>
            <select
              value={mockConfig.role}
              onChange={(e) => setMockConfig({ ...mockConfig, role: e.target.value as MockRole })}
              className="px-2 py-1 rounded border border-yellow-600 bg-yellow-300"
            >
              <option value="owner">Owner</option>
              <option value="member">Member</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label>Cuentas propias:</label>
            <select
              value={mockConfig.ownedAccountsCount}
              onChange={(e) =>
                setMockConfig({
                  ...mockConfig,
                  ownedAccountsCount: parseInt(e.target.value) as 1 | 2 | 3,
                })
              }
              className="px-2 py-1 rounded border border-yellow-600 bg-yellow-300"
            >
              <option value="1">1 (puede crear 2 más)</option>
              <option value="2">2 (puede crear 1 más)</option>
              <option value="3">3 (límite alcanzado)</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label>
              <input
                type="checkbox"
                checked={mockConfig.hasPendingInvitations}
                onChange={(e) =>
                  setMockConfig({ ...mockConfig, hasPendingInvitations: e.target.checked })
                }
                className="mr-1"
              />
              Invitaciones pendientes
            </label>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-foreground">Configuración</h2>
          <span className="px-2 py-0.5 text-xs font-bold bg-yellow-400 text-yellow-900 rounded">
            MOCKUP
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Pre-visualización del nuevo diseño (datos simulados)
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-6">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
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

      {/* Content */}
      <div>
        {activeTab === 'account' && (
          <MockAccountSettings ownedCount={mockConfig.ownedAccountsCount} />
        )}
        {activeTab === 'members' && (
          <MockMembersSettings
            isOwner={mockConfig.role === 'owner'}
            hasPendingInvitations={mockConfig.hasPendingInvitations}
          />
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: CUENTA
// ═══════════════════════════════════════════════════════════════════════════════

function MockAccountSettings({ ownedCount }: { ownedCount: number }) {
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Generar cuentas según configuración
  const mockOwnedAccounts = Array.from({ length: ownedCount }, (_, i) => ({
    id: `acc-00${i + 1}`,
    name: i === 0 ? 'Personal' : i === 1 ? 'Familia' : 'Proyecto X',
    role: 'owner',
  }))

  const canCreateMore = ownedCount < 3

  return (
    <div className="space-y-6">
      {/* Sección: Nombre de la cuenta actual */}
      <div className="bg-card rounded-lg border border-border">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Nombre de la cuenta</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cambia el nombre de tu cuenta actual
          </p>
        </div>
        <div className="p-4">
          <form className="space-y-4">
            <Input
              id="accountName"
              type="text"
              label="Nombre de la cuenta"
              defaultValue={MOCK_CURRENT_ACCOUNT.name}
            />
            <Button type="button">Guardar cambios</Button>
          </form>
        </div>
      </div>

      {/* Sección: Mis cuentas (NUEVO) */}
      <div className="bg-card rounded-lg border border-border">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Mis cuentas</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cuentas donde eres propietario ({ownedCount}/3)
            </p>
          </div>
          {canCreateMore && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCreateModal(true)}
            >
              + Nueva cuenta
            </Button>
          )}
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {mockOwnedAccounts.map((account, index) => (
              <div
                key={account.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  index === 0 ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center text-white font-semibold">
                    {account.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{account.name}</p>
                    <p className="text-xs text-muted-foreground">Propietario</p>
                  </div>
                </div>
                {index === 0 ? (
                  <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded">
                    Actual
                  </span>
                ) : (
                  <Button type="button" variant="ghost" size="sm">
                    Cambiar
                  </Button>
                )}
              </div>
            ))}

            {/* Slot vacío para mostrar que puede crear más */}
            {canCreateMore && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <span className="text-2xl text-muted-foreground">+</span>
                <span className="text-sm text-muted-foreground">
                  Crear cuenta ({3 - ownedCount} disponibles)
                </span>
              </button>
            )}

            {!canCreateMore && (
              <p className="text-xs text-center text-muted-foreground py-2">
                Has alcanzado el límite de 3 cuentas como propietario
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Modal crear cuenta (simulado) */}
      {showCreateModal && <MockCreateAccountModal onClose={() => setShowCreateModal(false)} />}
    </div>
  )
}

function MockCreateAccountModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg border border-border w-full max-w-md mx-4">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Crear nueva cuenta</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Las cuentas te permiten separar tus finanzas (personal, familia, etc.)
          </p>
        </div>
        <div className="p-4 space-y-4">
          <Input
            id="newAccountName"
            type="text"
            label="Nombre de la cuenta"
            placeholder="Ej: Familia, Proyecto X, Amigos..."
          />
          <p className="text-xs text-muted-foreground">
            Si dejas vacío, se usará: "Cuenta de {MOCK_USER.name}"
          </p>
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="button" onClick={onClose}>
              Crear cuenta
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: MIEMBROS
// ═══════════════════════════════════════════════════════════════════════════════

function MockMembersSettings({
  isOwner,
  hasPendingInvitations,
}: {
  isOwner: boolean
  hasPendingInvitations: boolean
}) {
  const [showInviteLink, setShowInviteLink] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)

  const handleInvite = () => {
    // Simular creación de invitación
    const fakeToken = 'mock-' + Math.random().toString(36).substring(7)
    const link = `http://localhost:3000/invite/${fakeToken}`
    setShowInviteLink(link)
  }

  const handleCopyLink = () => {
    if (showInviteLink) {
      navigator.clipboard.writeText(showInviteLink)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  // Mensaje cuando es member
  if (!isOwner) {
    return (
      <div className="space-y-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Solo lectura:</strong> Como miembro, puedes ver los miembros de la cuenta pero
            no puedes invitar ni remover usuarios. Solo el propietario puede hacerlo.
          </p>
        </div>

        {/* Lista de miembros (solo lectura) */}
        <div className="bg-card rounded-lg border border-border">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Miembros de la cuenta</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{MOCK_MEMBERS.length} miembros</p>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {MOCK_MEMBERS.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center text-white font-semibold">
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
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Sección: Invitar miembro (NUEVO - solo owner) */}
      <div className="bg-card rounded-lg border border-border">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Invitar miembro</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Genera un link de invitación para compartir manualmente.
          </p>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex gap-3">
            <Input
              id="inviteEmail"
              type="email"
              label="Email del invitado (referencia)"
              placeholder="usuario@email.com"
              className="flex-1"
            />
            <div className="flex items-end">
              <Button type="button" onClick={handleInvite}>
                Generar link
              </Button>
            </div>
          </div>

          {/* Link generado (simulado) */}
          {showInviteLink && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
                ✓ Invitación creada. Comparte este link:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={showInviteLink}
                  className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-800 border rounded-lg"
                />
                <Button type="button" variant="outline" size="sm" onClick={handleCopyLink}>
                  {copiedLink ? '✓ Copiado' : 'Copiar'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                El link expira en 24 horas. Compártelo por WhatsApp, email, etc.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sección: Invitaciones pendientes (NUEVO - solo owner) */}
      {hasPendingInvitations && (
        <div className="bg-card rounded-lg border border-border">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Invitaciones pendientes</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {MOCK_PENDING_INVITATIONS.filter((i) => i.status === 'pending').length} invitaciones
              activas
            </p>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {MOCK_PENDING_INVITATIONS.map((invitation) => (
                <MockInvitationRow key={invitation.id} invitation={invitation} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sección: Miembros actuales */}
      <div className="bg-card rounded-lg border border-border">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Miembros de la cuenta</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {MOCK_MEMBERS.length} {MOCK_MEMBERS.length === 1 ? 'miembro' : 'miembros'}
          </p>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {MOCK_MEMBERS.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center text-white font-semibold">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {member.name}
                      {member.id === MOCK_USER.id && (
                        <span className="ml-2 text-xs text-muted-foreground">(tú)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      member.role === 'owner'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {member.role === 'owner' ? 'Propietario' : 'Miembro'}
                  </span>
                  {/* Botón remover (solo owner puede remover members) */}
                  {isOwner && member.role !== 'owner' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600"
                    >
                      Remover
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function MockInvitationRow({ invitation }: { invitation: Invitation }) {
  const [copied, setCopied] = useState(false)
  const isExpired = invitation.status === 'expired' || new Date(invitation.expires_at) < new Date()
  const expiresAt = new Date(invitation.expires_at)
  const inviteLink = `http://localhost:3000/invite/${invitation.token}`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className={`p-3 rounded-lg border ${
        isExpired
          ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
          : 'bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isExpired ? 'bg-red-100 dark:bg-red-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'
            }`}
          >
            <span className="text-lg">{isExpired ? '⏰' : '✉️'}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{invitation.email}</p>
            <p className="text-xs text-muted-foreground">
              {isExpired
                ? `Expiró el ${expiresAt.toLocaleDateString()}`
                : `Expira el ${expiresAt.toLocaleDateString()} a las ${expiresAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              isExpired
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
            }`}
          >
            {isExpired ? 'Expirada' : 'Pendiente'}
          </span>
          {isExpired ? (
            <Button type="button" variant="outline" size="sm">
              Regenerar
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-600"
            >
              Revocar
            </Button>
          )}
        </div>
      </div>

      {/* Link de invitación - solo para pendientes */}
      {!isExpired && (
        <div className="mt-2 pt-2 border-t border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={inviteLink}
              className="flex-1 px-2 py-1 text-xs bg-white dark:bg-gray-800 border rounded font-mono text-muted-foreground"
            />
            <Button type="button" variant="outline" size="sm" onClick={handleCopyLink}>
              {copied ? '✓' : 'Copiar'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
