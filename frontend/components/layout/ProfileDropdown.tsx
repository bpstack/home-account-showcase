'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import {
  User,
  LogOut,
  ChevronDown,
  Building2,
  ExternalLink,
  Plus,
  Loader2,
  Check,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { accounts } from '@/lib/apiClient'
import { toast } from 'sonner'
import { Modal, ModalFooter, Button } from '@/components/ui'
import { useCryptoStore } from '@/stores/cryptoStore'

const MAX_OWNED_ACCOUNTS = 3

const AUTH_QUERY_KEYS = {
  accounts: ['auth', 'accounts'] as const,
}

export function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false)
  const [newAccountName, setNewAccountName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const queryClient = useQueryClient()
  const {
    user,
    account,
    accounts: allAccounts,
    switchAccount,
    logout,
    isSwitchingAccount,
  } = useAuth()

  // Contar cuentas donde el usuario es owner
  const ownedAccountsCount = allAccounts.filter((a) => a.role === 'owner').length
  const canCreateMore = ownedAccountsCount < MAX_OWNED_ACCOUNTS

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setIsAccountMenuOpen(false)
      }
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  if (!user) return null

  const handleLogout = () => {
    logout()
  }

  const navigateTo = (path: string) => {
    setIsOpen(false)
    router.push(path)
  }

  const handleSwitchAccount = async (accountId: string) => {
    await switchAccount(accountId)
    setIsAccountMenuOpen(false)
    setIsOpen(false)
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAccountName.trim()) return

    setIsCreating(true)
    setCreateError('')

    try {
      // Verificar que el usuario está desbloqueado
      const cryptoStore = useCryptoStore.getState()
      if (!cryptoStore.userKey) {
        setCreateError(
          'Error: No se pudo obtener la clave de usuario. Intenta cerrar sesión y volver a entrar.'
        )
        setIsCreating(false)
        return
      }

      // Crear cuenta primero (necesitamos el ID)
      // Generar encrypted key usando el store
      const tempAccountId = 'temp-' + Date.now()
      const encryptedAccountKey = await cryptoStore.createAccountKey(tempAccountId)

      const result = await accounts.create(newAccountName.trim(), encryptedAccountKey)

      // Mover la key del temp ID al ID real
      const tempKey = cryptoStore.accountKeys.get(tempAccountId)
      if (tempKey) {
        const newAccountKeys = new Map(cryptoStore.accountKeys)
        newAccountKeys.delete(tempAccountId)
        newAccountKeys.set(result.account.id, tempKey)
        useCryptoStore.setState({ accountKeys: newAccountKeys })
      }

      // Invalidar y esperar a que la lista de cuentas se actualice
      await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.accounts })
      await queryClient.refetchQueries({ queryKey: AUTH_QUERY_KEYS.accounts })

      // Cambiar a la nueva cuenta (ahora usa API Route, sin race condition)
      await switchAccount(result.account.id)

      setIsCreateModalOpen(false)
      setNewAccountName('')
      setIsOpen(false)
      toast.success('Cuenta creada correctamente')
    } catch (error) {
      setCreateError((error as Error).message || 'Error al crear la cuenta')
      toast.error('Error al crear la cuenta', {
        description: (error as Error).message,
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleLeaveAccount = async () => {
    if (!account) return

    setIsLeaving(true)
    try {
      await accounts.leaveAccount(account.id)
      await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.accounts })
      await queryClient.invalidateQueries({ queryKey: ['transactions'] })
      await queryClient.invalidateQueries({ queryKey: ['categories'] })
      router.push('/dashboard')
      setIsAccountMenuOpen(false)
      setIsOpen(false)
      toast.success('Has abandonado la cuenta correctamente')
    } catch (error) {
      toast.error('Error al abandonar la cuenta', {
        description: (error as Error).message,
      })
    } finally {
      setIsLeaving(false)
    }
  }

  const currentAccount = allAccounts.find((a) => a.id === account?.id) || account

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-lg transition-colors duration-200 hover:bg-muted border border-transparent hover:border-border"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white text-sm font-semibold">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="hidden md:flex flex-col items-start">
          <span className="text-base font-medium text-foreground leading-none">
            {currentAccount?.name || 'Sin cuenta'}
          </span>
          <span className="text-sm text-muted-foreground leading-none mt-0.5">
            {account?.role === 'owner' ? 'Propietario' : 'Miembro'}
          </span>
        </div>
        <ChevronDown
          className={`hidden md:block h-4 w-4 text-muted-foreground transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-lg bg-card shadow-xl border border-border z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/50">
            <p className="text-base font-medium text-foreground">{user.name}</p>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          </div>

          {allAccounts.length > 1 && (
            <div className="border-b border-border">
              <div className="relative" ref={accountMenuRef}>
                <button
                  onClick={() => !isSwitchingAccount && setIsAccountMenuOpen(!isAccountMenuOpen)}
                  disabled={isSwitchingAccount}
                  className="w-full flex items-center justify-between px-4 py-3 text-base text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-2">
                    {isSwitchingAccount ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    )}
                    <span className="font-medium">{currentAccount?.name}</span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                      isAccountMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isAccountMenuOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                    {allAccounts.map((acc) => {
                      const isActive = acc.id === currentAccount?.id
                      return (
                        <button
                          key={acc.id}
                          onClick={() => handleSwitchAccount(acc.id)}
                          disabled={isSwitchingAccount || isActive}
                          className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                            isActive
                              ? 'bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium cursor-default'
                              : 'text-foreground hover:bg-muted'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{acc.name}</span>
                            {isActive && <Check className="h-3 w-3" />}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {acc.role === 'owner' ? 'Propietario' : 'Miembro'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="py-1">
            <button
              onClick={() => navigateTo('/profile')}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Mi Perfil</span>
            </button>
            {canCreateMore ? (
              <button
                onClick={() => {
                  setIsCreateModalOpen(true)
                  setIsOpen(false)
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <Plus className="h-4 w-4 text-green-600" />
                <span>Nueva cuenta</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {ownedAccountsCount}/{MAX_OWNED_ACCOUNTS}
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground">
                <Plus className="h-4 w-4" />
                <span>Nueva cuenta</span>
                <span className="ml-auto text-xs">
                  {ownedAccountsCount}/{MAX_OWNED_ACCOUNTS} (máx)
                </span>
              </div>
            )}
          </div>

          {account?.role !== 'owner' && (
            <div className="border-t border-border py-1">
              <button
                onClick={() => setIsLeaveModalOpen(true)}
                disabled={isLeaving}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Abandonar cuenta</span>
              </button>
            </div>
          )}

          <div className="border-t border-border py-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal para crear nueva cuenta */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setNewAccountName('')
          setCreateError('')
        }}
        title="Crear nueva cuenta"
        size="sm"
      >
        <form onSubmit={handleCreateAccount}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Nombre de la cuenta
              </label>
              <input
                type="text"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                placeholder={`Cuenta de ${user?.name || 'Usuario'}`}
                className="w-full h-11 px-4 py-2 text-sm rounded-md border bg-layer-1 text-text-primary border-layer-3 focus:outline-none focus:ring-2 focus:ring-accent"
                autoFocus
              />
              <p className="text-xs text-text-secondary mt-1">
                Ej: Personal, Familia, Amigos, Proyecto...
              </p>
            </div>

            {createError && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                <p className="text-sm text-destructive">{createError}</p>
              </div>
            )}
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateModalOpen(false)
                setNewAccountName('')
                setCreateError('')
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating || !newAccountName.trim()}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear cuenta'
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Modal de confirmación para abandonar cuenta */}
      <Modal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        title="Abandonar cuenta"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            ¿Estás seguro de que quieres abandonar la cuenta{' '}
            <span className="font-medium text-foreground">"{account?.name}"</span>?
          </p>
          <p className="text-sm text-muted-foreground">
            Ya no tendrás acceso a esta cuenta y sus datos.
          </p>
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={() => setIsLeaveModalOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              setIsLeaveModalOpen(false)
              await handleLeaveAccount()
            }}
            disabled={isLeaving}
          >
            {isLeaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Abandonando...
              </>
            ) : (
              'Abandonar cuenta'
            )}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
