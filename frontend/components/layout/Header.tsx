'use client'

import { ProfileDropdown } from './ProfileDropdown'

interface HeaderProps {
  title: string
  description?: string
}

export function Header({ title, description }: HeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
        {description && (
          <p className="text-text-secondary">{description}</p>
        )}
      </div>
      <ProfileDropdown />
    </header>
  )
}
