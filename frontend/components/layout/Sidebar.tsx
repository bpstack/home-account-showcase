'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ui'
import {
  LayoutDashboard,
  Receipt,
  Tags,
  Upload,
  Settings,
  LogOut,
  Wallet,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Balance', href: '/balance', icon: Wallet },
  { name: 'Transacciones', href: '/transactions', icon: Receipt },
  { name: 'Categorías', href: '/categories', icon: Tags },
  { name: 'Importar', href: '/import', icon: Upload },
  { name: 'Configuración', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-layer-1 border-r border-layer-3">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex items-center gap-2 px-6 py-5 border-b border-layer-3">
          <Wallet className="h-8 w-8 text-accent" />
          <span className="text-xl font-semibold text-text-primary">Home Account</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent text-white'
                    : 'text-text-secondary hover:bg-layer-2 hover:text-text-primary'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-layer-3 space-y-2">
          <div className="flex items-center justify-between px-3">
            <span className="text-sm text-text-secondary">Tema</span>
            <ThemeToggle />
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-text-secondary hover:bg-layer-2 hover:text-danger transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Cerrar sesión
          </button>
        </div>
      </div>
    </aside>
  )
}
