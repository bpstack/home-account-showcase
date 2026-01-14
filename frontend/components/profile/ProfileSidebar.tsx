'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { users } from '@/lib/apiClient'
import { Settings, ChevronRight, User, Lock, Check, X, Eye, EyeOff, AlertCircle } from 'lucide-react'

export function ProfileSidebar() {
  const { user, account } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activePanel = searchParams.get('panel')

  const [isEditingName, setIsEditingName] = useState(false)
  const [isEditingPassword, setIsEditingPassword] = useState(false)

  const [newName, setNewName] = useState('')
  const [namePassword, setNamePassword] = useState('')
  const [nameLoading, setNameLoading] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [nameSuccess, setNameSuccess] = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  if (!user) return null

  const handleNavigate = (panel: string | null) => {
    if (panel) {
      router.push(`/profile?panel=${panel}`, { scroll: false })
    } else {
      router.push('/profile', { scroll: false })
    }
  }

  const handleStartEditName = () => {
    setIsEditingName(true)
    setNewName(user.name)
    setNamePassword('')
    setNameError(null)
    setNameSuccess(null)
  }

  const handleCancelEditName = () => {
    setIsEditingName(false)
    setNewName('')
    setNamePassword('')
    setNameError(null)
    setNameSuccess(null)
  }

  const handleSaveName = async () => {
    if (!newName.trim()) {
      setNameError('El nombre es requerido')
      return
    }

    if (!namePassword) {
      setNameError('Ingresa tu contraseña actual')
      return
    }

    setNameLoading(true)
    setNameError(null)

    try {
      await users.update(user.id, { name: newName.trim() })
      setNameSuccess('Nombre actualizado correctamente')
      setIsEditingName(false)
      setNewName('')
      setNamePassword('')
      setTimeout(() => setNameSuccess(null), 3000)
    } catch (error: unknown) {
      const apiError = error as { message?: string }
      setNameError(apiError.message || 'Error al actualizar')
    } finally {
      setNameLoading(false)
    }
  }

  const handleStartEditPassword = () => {
    setIsEditingPassword(true)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError(null)
  }

  const handleCancelEditPassword = () => {
    setIsEditingPassword(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError(null)
  }

  const handleSavePassword = async () => {
    if (!currentPassword) {
      setPasswordError('Ingresa tu contraseña actual')
      return
    }

    if (!newPassword) {
      setPasswordError('Ingresa la nueva contraseña')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('Mínimo 6 caracteres')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden')
      return
    }

    setPasswordLoading(true)
    setPasswordError(null)

    try {
      await users.changePassword(user.id, currentPassword, newPassword)
      router.push('/login?message=password_changed')
    } catch (error: unknown) {
      const apiError = error as { message?: string }
      setPasswordError(apiError.message || 'Error al cambiar contraseña')
      setPasswordLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-[#161b22] rounded-lg border border-gray-200 dark:border-[#30363d] p-4">
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center text-white text-2xl font-bold mb-4">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {user.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{user.email}</p>
          <div className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cuenta</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {account?.name || 'Sin cuenta'}
            </p>
          </div>
        </div>
      </div>

      {nameSuccess && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
          <p className="text-xs text-green-700 dark:text-green-400">{nameSuccess}</p>
        </div>
      )}

      <div className="bg-white dark:bg-[#161b22] rounded-lg border border-gray-200 dark:border-[#30363d] overflow-hidden">
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Nombre
              </span>
            </div>
            {!isEditingName && (
              <button
                onClick={handleStartEditName}
                className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
          </div>

          {!isEditingName ? (
            <p className="text-sm text-gray-900 dark:text-white">{user.name}</p>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Nuevo nombre
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-[#30363d] rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={nameLoading}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Contraseña actual
                </label>
                <input
                  type="password"
                  value={namePassword}
                  onChange={(e) => setNamePassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-[#30363d] rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={nameLoading}
                />
              </div>

              {nameError && (
                <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{nameError}</span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleSaveName}
                  disabled={nameLoading}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors"
                >
                  {nameLoading ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  onClick={handleCancelEditName}
                  disabled={nameLoading}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-[#30363d] hover:bg-gray-50 dark:hover:bg-[#21262d] rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-[#161b22] rounded-lg border border-gray-200 dark:border-[#30363d] overflow-hidden">
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Contraseña
              </span>
            </div>
            {!isEditingPassword && (
              <button
                onClick={handleStartEditPassword}
                className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
          </div>

          {!isEditingPassword ? (
            <p className="text-sm text-gray-900 dark:text-white">••••••••</p>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Contraseña actual
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 text-sm bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-[#30363d] rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={passwordLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 text-sm bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-[#30363d] rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={passwordLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 text-sm bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-[#30363d] rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={passwordLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {passwordError && (
                <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleSavePassword}
                  disabled={passwordLoading}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors"
                >
                  {passwordLoading ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  onClick={handleCancelEditPassword}
                  disabled={passwordLoading}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-[#30363d] hover:bg-gray-50 dark:hover:bg-[#21262d] rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-[#161b22] rounded-lg border border-gray-200 dark:border-[#30363d] overflow-hidden">
        <NavButton
          icon={
            <div className={cn(
              'p-2 rounded-md',
              activePanel === 'settings'
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
            )}>
              <Settings className="w-4 h-4" />
            </div>
          }
          label="Configuración"
          description="Gestiona tu cuenta"
          active={activePanel === 'settings'}
          onClick={() => handleNavigate('settings')}
        />
      </div>
    </div>
  )
}

function NavButton({
  icon,
  label,
  description,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  description: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-between p-3 transition-colors text-left',
        active ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-100 dark:hover:bg-[#21262d]'
      )}
    >
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className={cn(
            'text-sm font-medium',
            active ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-white'
          )}>
            {label}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>
      <ChevronRight
        className={cn(
          'w-4 h-4',
          active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
        )}
      />
    </button>
  )
}
