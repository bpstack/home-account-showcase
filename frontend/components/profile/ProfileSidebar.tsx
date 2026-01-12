'use client'

import { useAuth } from '@/hooks/useAuth'

export function ProfileSidebar() {
  const { user, account } = useAuth()

  if (!user) return null

  return (
    <div className="bg-white dark:bg-[#161b22] rounded-lg border border-gray-200 dark:border-[#30363d] p-6">
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
  )
}
