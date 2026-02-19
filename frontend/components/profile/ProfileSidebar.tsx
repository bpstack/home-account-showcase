'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { Settings, ChevronRight } from 'lucide-react'

export function ProfileSidebar() {
  const { user, account } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activePanel = searchParams.get('panel')

  if (!user) return null

  const handleNavigate = (panel: string | null) => {
    if (panel) {
      router.push(`/profile?panel=${panel}`, { scroll: false })
    } else {
      router.push('/profile', { scroll: false })
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center text-white text-2xl font-bold mb-4">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">{user.name}</h3>
          <p className="text-sm text-muted-foreground mb-4">{user.email}</p>
          <div className="w-full px-4 py-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Cuenta</p>
            <p className="text-sm font-medium text-foreground">{account?.name || 'Sin cuenta'}</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <NavButton
          icon={
            <div
              className={cn(
                'p-2 rounded-md',
                activePanel === 'settings'
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              )}
            >
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
        active ? 'bg-primary/5' : 'hover:bg-muted/50'
      )}
    >
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className={cn('text-sm font-medium', active ? 'text-primary' : 'text-foreground')}>
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
