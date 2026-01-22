'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Receipt, Tags, Upload, Settings, Wallet } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const mainLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Balance', href: '/balance', icon: Wallet },
  { name: 'Transacciones', href: '/transactions', icon: Receipt },
  { name: 'Categorías', href: '/categories', icon: Tags },
]

export function Sidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const panel = searchParams.get('panel')

  const renderLink = (item: { name: string; href: string; icon: any }) => {
    const isActive = pathname === item.href

    return (
      <Link
        key={item.name}
        href={item.href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-muted text-blue-600 dark:text-blue-400 border-l-4 border-blue-600 dark:border-blue-400'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground border-l-4 border-transparent'
        )}
      >
        <item.icon
          className={cn(
            'h-5 w-5',
            isActive ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'
          )}
        />
        <span>{item.name}</span>
      </Link>
    )
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center gap-2 px-6 h-16 bg-background border-b border-border">
        <Wallet className="h-7 w-7 text-blue-600 dark:text-blue-400" />
        <span className="text-lg font-semibold text-foreground">Home Account</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="flex flex-col gap-1">{mainLinks.map((item) => renderLink(item))}</div>

        <div className="border-t border-border my-3" />

        <div className="flex flex-col gap-1">
          <Link
            href="/profile?panel=settings"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
              panel === 'settings'
                ? 'bg-muted text-blue-600 dark:text-blue-400 border-l-4 border-blue-600 dark:border-blue-400'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground border-l-4 border-transparent'
            )}
          >
            <Settings
              className={cn(
                'h-5 w-5',
                panel === 'settings' ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'
              )}
            />
            <span>Configuración</span>
          </Link>
          {renderLink({ name: 'Importar', href: '/import', icon: Upload })}
        </div>
      </nav>
    </div>
  )
}
