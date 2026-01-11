'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Receipt, Tags, Upload, Settings, Wallet } from 'lucide-react'

const mainLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Balance', href: '/balance', icon: Wallet },
  { name: 'Transacciones', href: '/transactions', icon: Receipt },
  { name: 'Categorías', href: '/categories', icon: Tags },
]

const secondaryLinks = [
  { name: 'Importar', href: '/import', icon: Upload },
  { name: 'Configuración', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  const renderLink = (item: (typeof mainLinks)[0]) => {
    const isActive = pathname === item.href

    return (
      <Link
        key={item.name}
        href={item.href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-layer-2 text-accent dark:text-white border-l-4 border-accent'
            : 'text-text-secondary hover:bg-layer-2 hover:text-text-primary border-l-4 border-transparent'
        )}
      >
        <item.icon
          className={cn(
            'h-5 w-5',
            isActive ? 'text-accent dark:text-white' : 'text-text-secondary'
          )}
        />
        <span>{item.name}</span>
      </Link>
    )
  }

  return (
    <div className="flex h-full flex-col bg-layer-1">
      {/* Logo - mismo color que el header para continuidad */}
      <div className="flex items-center gap-2 px-6 h-16 bg-background border-b border-layer-3">
        <Wallet className="h-7 w-7 text-accent" />
        <span className="text-lg font-semibold text-text-primary">Home Account</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* Main Links */}
        <div className="flex flex-col gap-1">{mainLinks.map((item) => renderLink(item))}</div>

        {/* Separator */}
        <div className="border-t border-layer-3 my-3" />

        {/* Secondary Links */}
        <div className="flex flex-col gap-1">{secondaryLinks.map((item) => renderLink(item))}</div>
      </nav>
    </div>
  )
}
