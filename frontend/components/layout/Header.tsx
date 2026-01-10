'use client'

import { mockUser } from '@/lib/mock/data'
import { User } from 'lucide-react'

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
      <div className="flex items-center gap-3">
        <div className="hidden sm:block text-right">
          <p className="text-sm font-medium text-text-primary">{mockUser.name}</p>
          <p className="text-xs text-text-secondary">{mockUser.email}</p>
        </div>
        <div className="h-10 w-10 rounded-full bg-layer-2 flex items-center justify-center">
          <User className="h-5 w-5 text-text-secondary" />
        </div>
      </div>
    </header>
  )
}
