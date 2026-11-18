'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isActive, mobileNav } from './navigation'

interface MobileNavProps {
  /** Opens the drawer with the full navigation (Inversión, Configuración…) */
  onOpenMenu: () => void
}

const itemClass =
  'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'

/** Bottom navigation for phones and tablets; the sidebar takes over from lg up. */
export function MobileNav({ onOpenMenu }: MobileNavProps) {
  const pathname = usePathname()
  const panel = useSearchParams().get('panel')
  // Pages kept in the drawer (Inversión, Configuración) light up "Más"
  const inDrawer = !mobileNav.some((item) => isActive(item, pathname, panel))

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-layer-3 bg-layer-1 pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {mobileNav.map((item) => {
        const active = isActive(item, pathname, panel)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(itemClass, active ? 'text-accent' : 'text-text-secondary')}
          >
            <item.icon aria-hidden="true" className="h-5 w-5" />
            {item.name}
          </Link>
        )
      })}
      <button
        type="button"
        onClick={onOpenMenu}
        aria-current={inDrawer ? 'page' : undefined}
        className={cn(itemClass, inDrawer ? 'text-accent' : 'text-text-secondary')}
      >
        <Menu aria-hidden="true" className="h-5 w-5" />
        Más
      </button>
    </nav>
  )
}
