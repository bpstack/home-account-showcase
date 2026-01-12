'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { User, Settings, LogOut, ChevronDown, Building2, ExternalLink } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { accounts } from '@/lib/apiClient'

const AUTH_QUERY_KEYS = {
  accounts: ['auth', 'accounts'] as const,
}

export function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, account, accounts: allAccounts, switchAccount, logout } = useAuth()

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

  const handleLeaveAccount = async () => {
    if (!account) return
    if (!confirm('¿Estás seguro de que quieres abandonar esta cuenta? Perderás acceso a todos los datos.')) {
      return
    }

    setIsLeaving(true)
    try {
      await accounts.leaveAccount(account.id)
      await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.accounts })
      await queryClient.invalidateQueries({ queryKey: ['transactions'] })
      await queryClient.invalidateQueries({ queryKey: ['categories'] })
      router.push('/dashboard')
      setIsAccountMenuOpen(false)
      setIsOpen(false)
    } catch (error) {
      alert('Error al abandonar la cuenta: ' + (error as Error).message)
    } finally {
      setIsLeaving(false)
    }
  }

  const currentAccount = allAccounts.find((a) => a.id === account?.id) || account

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-lg transition-colors duration-200 hover:bg-layer-2 border border-transparent hover:border-layer-3"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-accent to-purple-600 text-white text-sm font-semibold">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="hidden md:flex flex-col items-start">
          <span className="text-base font-medium text-text-primary leading-none">{currentAccount?.name || 'Sin cuenta'}</span>
          <span className="text-sm text-text-secondary leading-none mt-0.5">{account?.role === 'owner' ? 'Propietario' : 'Miembro'}</span>
        </div>
        <ChevronDown
          className={`hidden md:block h-4 w-4 text-text-secondary transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-lg bg-layer-1 shadow-xl border border-layer-3 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-layer-3 bg-layer-2/50">
            <p className="text-base font-medium text-text-primary">{user.name}</p>
            <p className="text-sm text-text-secondary truncate">{user.email}</p>
          </div>

          {allAccounts.length > 1 && (
            <div className="border-b border-layer-3">
              <div className="relative" ref={accountMenuRef}>
                <button
                  onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 text-base text-text-primary hover:bg-layer-2 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-accent" />
                    <span className="font-medium">{currentAccount?.name}</span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-text-secondary transition-transform duration-200 ${
                      isAccountMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isAccountMenuOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-layer-2 border border-layer-3 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                    {allAccounts.map((acc) => (
                      <button
                        key={acc.id}
                        onClick={() => handleSwitchAccount(acc.id)}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-text-primary hover:bg-layer-3 transition-colors"
                      >
                        <span>{acc.name}</span>
                        <span className="text-sm text-text-secondary">
                          {acc.role === 'owner' ? 'Owner' : 'Member'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="py-1">
            <button
              onClick={() => navigateTo('/profile')}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-layer-2 transition-colors"
            >
              <User className="h-4 w-4 text-text-secondary" />
              <span>Mi Perfil</span>
            </button>

            <button
              onClick={() => navigateTo('/profile?panel=settings')}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-layer-2 transition-colors"
            >
              <Settings className="h-4 w-4 text-text-secondary" />
              <span>Configuración</span>
            </button>
          </div>

          {account?.role !== 'owner' && (
            <div className="border-t border-layer-3 py-1">
              <button
                onClick={handleLeaveAccount}
                disabled={isLeaving}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
              >
                <ExternalLink className="h-4 w-4" />
                <span>{isLeaving ? 'Abandonando...' : 'Abandonar cuenta'}</span>
              </button>
            </div>
          )}

          <div className="border-t border-layer-3 py-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger hover:bg-danger/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
