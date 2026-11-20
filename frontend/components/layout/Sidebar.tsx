'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isActive, mainNav, settingsNav, type NavItem } from './navigation'

type SidebarProps = {
  onNavigate?: () => void
}

function SidebarLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem
  active: boolean
  onNavigate?: () => void
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'border-accent bg-layer-2 font-medium text-text-primary'
          : 'border-transparent text-text-secondary hover:bg-layer-2 hover:text-text-primary'
      )}
    >
      <item.icon
        aria-hidden="true"
        className={cn('h-[18px] w-[18px]', active ? 'text-accent' : 'text-text-secondary')}
      />
      {item.name}
    </Link>
  )
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const panel = useSearchParams().get('panel')

  return (
    <div className="flex h-full flex-col border-r border-layer-3 bg-layer-1">
      <div className="flex h-14 items-center gap-2 border-b border-layer-3 px-5">
        <Wallet aria-hidden="true" className="h-6 w-6 text-accent" />
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="text-base font-medium text-text-primary"
        >
          Home Account
        </Link>
      </div>

      <nav aria-label="Principal" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {mainNav.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActive(item, pathname, panel)}
            onNavigate={onNavigate}
          />
        ))}
        <div className="my-3 border-t border-layer-3" />
        <SidebarLink
          item={settingsNav}
          active={isActive(settingsNav, pathname, panel)}
          onNavigate={onNavigate}
        />
      </nav>
    </div>
  )
}
