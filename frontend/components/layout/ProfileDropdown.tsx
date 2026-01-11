'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, Settings, LogOut, ChevronDown, CreditCard, PieChart, Tags } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

export function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { user, account, logout } = useAuth()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200 hover:bg-layer-2"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-accent to-purple-600 text-white text-sm font-semibold">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-text-primary">{user.name}</p>
          {account && (
            <p className="text-xs text-text-secondary">{account.name}</p>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-text-secondary transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-lg bg-layer-1 shadow-lg border border-layer-3 z-50 overflow-hidden">
          {/* User info */}
          <div className="px-4 py-3 border-b border-layer-3">
            <p className="text-sm font-medium text-text-primary">{user.name}</p>
            <p className="text-xs text-text-secondary truncate">{user.email}</p>
            {account && (
              <p className="text-xs text-accent mt-1">{account.name}</p>
            )}
          </div>

          {/* Quick links */}
          <div className="py-1">
            <button
              onClick={() => navigateTo('/dashboard')}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-text-primary hover:bg-layer-2 transition-colors"
            >
              <PieChart className="h-4 w-4 text-text-secondary" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => navigateTo('/transactions')}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-text-primary hover:bg-layer-2 transition-colors"
            >
              <CreditCard className="h-4 w-4 text-text-secondary" />
              <span>Transacciones</span>
            </button>

            <button
              onClick={() => navigateTo('/categories')}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-text-primary hover:bg-layer-2 transition-colors"
            >
              <Tags className="h-4 w-4 text-text-secondary" />
              <span>Categorías</span>
            </button>
          </div>

          {/* Theme toggle */}
          <div className="border-t border-layer-3 px-4 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Tema</span>
              <ThemeToggle />
            </div>
          </div>

          {/* Logout */}
          <div className="border-t border-layer-3 py-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
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
