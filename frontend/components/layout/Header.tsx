'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { ProfileDropdown } from './ProfileDropdown'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

interface HeaderProps {
  title?: string
  description?: string
}

export function Header({ title, description }: HeaderProps) {
  const pathname = usePathname()

  const generateBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean)
    let currentPath = ''
    return paths.map((path, index) => {
      currentPath += `/${path}`
      const label = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ')
      return {
        label,
        href: currentPath,
        isLast: index === paths.length - 1,
      }
    })
  }

  const breadcrumbs = generateBreadcrumbs()
  const pageTitle = title || breadcrumbs[breadcrumbs.length - 1]?.label || 'Dashboard'

  return (
    <header className="flex items-center justify-between mb-6 pb-4 border-b border-border">
      {/* Left: Breadcrumb + Title */}
      <div className="flex flex-col gap-1">
        {/* Breadcrumb - Desktop */}
        <nav className="hidden md:flex items-center gap-1 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.href} className="flex items-center gap-1">
              {index > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              {crumb.isLast ? (
                <span className="text-foreground font-medium">{crumb.label}</span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* Title */}
        <h1 className="text-xl md:text-2xl font-semibold text-foreground">{pageTitle}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 md:gap-3">
        <ThemeToggle />
        <ProfileDropdown />
      </div>
    </header>
  )
}
