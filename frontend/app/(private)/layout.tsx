'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Menu, X, ChevronRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useCryptoStore } from '@/stores/cryptoStore'
import { useAuthStore } from '@/stores/authStore'
import { Sidebar, ProfileDropdown } from '@/components/layout'
import { ThemeToggle } from '@/components/ui'

const UNLOCK_PATH = '/unlock'
const SETUP_PIN_PATH = '/setup-pin'

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [redirected, setRedirected] = useState(false)

  // Subscribe to crypto store to react to unlock changes
  const isUnlocked = useCryptoStore((s) => s.isUnlocked)
  const hasSeparatePin = useAuthStore((s) => s.hasSeparatePin)

  const shouldRedirectToLogin = useCallback(() => {
    const cryptoStore = useCryptoStore.getState()
    const isCryptoReady = cryptoStore.isUnlocked
    if (pathname === UNLOCK_PATH || pathname === SETUP_PIN_PATH) return false
    if (!isCryptoReady && pathname !== '/login') return false
    return !isLoading && !isAuthenticated && !redirected
  }, [isLoading, isAuthenticated, pathname, redirected])

  useEffect(() => {
    // isUnlocked = User Key derived in memory (password was entered)
    // accountKeysSize > 0 is expected for normal users, but users with no accounts
    // would have 0 keys even after unlock — so we only require isUnlocked
    const isCryptoReady = isUnlocked

    // Redirect to unlock (or setup-pin) if crypto is locked
    if (user && !isCryptoReady && pathname !== UNLOCK_PATH) {
      const dest = hasSeparatePin ? UNLOCK_PATH : SETUP_PIN_PATH
      router.replace(`${dest}?from=${encodeURIComponent(pathname)}`)
      return
    }

    // Redirect back after unlock
    if (user && isCryptoReady && pathname === UNLOCK_PATH) {
      const params = new URLSearchParams(window.location.search)
      const redirectTo = params.get('from') || '/dashboard'
      router.replace(redirectTo)
      return
    }

    // Redirect to login if not authenticated
    if (shouldRedirectToLogin()) {
      setRedirected(true)
      router.push('/login')
    }
  }, [user, router, pathname, shouldRedirectToLogin, isUnlocked, hasSeparatePin])

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

  // Don't show private layout on unlock page
  if (pathname === UNLOCK_PATH) {
    return <>{children}</>
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2 text-text-secondary hover:text-text-primary"
        >
          <X className="h-5 w-5" />
        </button>
        <Sidebar onNavigate={sidebarOpen ? () => setSidebarOpen(false) : undefined} />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header - mismo color que el logo del sidebar */}
        <header className="h-16 border-b border-layer-3 bg-background flex items-center justify-between px-4 md:px-6 flex-shrink-0">
          {/* Left: Mobile menu + Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-text-secondary hover:text-text-primary hover:bg-layer-2 rounded-lg transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Breadcrumb - Desktop */}
            <nav className="hidden md:flex items-center gap-1">
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.href} className="flex items-center gap-1">
                  {index > 0 && <ChevronRight className="h-4 w-4 text-text-secondary" />}
                  {crumb.isLast ? (
                    <span className="text-sm font-medium text-text-primary">{crumb.label}</span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </div>
              ))}
            </nav>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <ProfileDropdown />
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  )
}
