'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useCryptoStore } from '@/stores/cryptoStore'
import { useAuthStore } from '@/stores/authStore'
import { Sidebar, ProfileDropdown, MobileNav } from '@/components/layout'
import { pageTitle } from '@/components/layout/navigation'
import { ThemeToggle } from '@/components/ui'
import { loadUserKey, clearUserKey } from '@/lib/keyVault'
import { internalPath } from '@/lib/internalPath'
import { auth } from '@/lib/apiClient'
import { verifyUserKey } from '@/lib/crypto'

const UNLOCK_PATH = '/unlock'
const SETUP_PIN_PATH = '/setup-pin'

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [redirected, setRedirected] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const restoreAttempted = useRef(false)
  // The redirect effect runs in the same commit as the restore effect, before `restoring` is set:
  // a ref is visible to it at once, so /unlock never flashes while the key is being restored.
  const restoreInFlight = useRef(false)

  // Subscribe to crypto store to react to unlock changes
  const isUnlocked = useCryptoStore((s) => s.isUnlocked)
  const hasSeparatePin = useAuthStore((s) => s.hasSeparatePin)

  // Try to restore the UserKey from IndexedDB on app startup
  useEffect(() => {
    if (!user || isUnlocked || restoreAttempted.current) return
    restoreAttempted.current = true
    restoreInFlight.current = true

    const restoreKey = async () => {
      setRestoring(true)
      try {
        // Load the key from IndexedDB
        const key = await loadUserKey(user.id)
        if (!key) {
          return
        }

        // Fetch the encrypted keys and verification blob from the server
        const { verification_blob, encrypted_keys } = await auth.getKeys()
        if (!verification_blob || !encrypted_keys || encrypted_keys.length === 0) {
          await clearUserKey()
          return
        }

        // Verify the key matches the verification blob
        const isValid = await verifyUserKey(verification_blob, key)
        if (!isValid) {
          await clearUserKey()
          return
        }

        // Key is valid: set it in the store and unlock accounts
        const cryptoStore = useCryptoStore.getState()
        cryptoStore.setUserKey(key)
        await cryptoStore.unlockAccounts(
          encrypted_keys.map((k) => ({
            accountId: k.account_id,
            encryptedKey: k.encrypted_key,
            keyVersion: k.key_version,
          }))
        )
      } catch {
        // Any error: clear the key and fall through to normal flow
        await clearUserKey()
      } finally {
        restoreInFlight.current = false
        setRestoring(false)
      }
    }

    restoreKey()
  }, [user, isUnlocked])

  // A user with a session but locked crypto is sent to /unlock by the effect below before this
  // runs, so this only has to handle the case with no session at all.
  const shouldRedirectToLogin = useCallback(() => {
    if (pathname === UNLOCK_PATH || pathname === SETUP_PIN_PATH) return false
    return !isLoading && !isAuthenticated && !redirected
  }, [isLoading, isAuthenticated, pathname, redirected])

  useEffect(() => {
    // Don't redirect while trying to restore the key from IndexedDB
    if (restoring || restoreInFlight.current) return

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

    // Redirect to setup-pin if crypto is unlocked but user hasn't set up a separate PIN
    if (user && isCryptoReady && !hasSeparatePin && pathname !== SETUP_PIN_PATH) {
      router.replace(`${SETUP_PIN_PATH}?from=${encodeURIComponent(pathname)}`)
      return
    }

    // Redirect back after unlock
    if (user && isCryptoReady && pathname === UNLOCK_PATH) {
      const params = new URLSearchParams(window.location.search)
      const redirectTo = internalPath(params.get('from')) ?? '/dashboard'
      router.replace(redirectTo)
      return
    }

    // Redirect to login if not authenticated
    if (shouldRedirectToLogin()) {
      setRedirected(true)
      router.push('/login')
    }
  }, [user, router, pathname, shouldRedirectToLogin, isUnlocked, hasSeparatePin, restoring])

  // Don't show private layout on unlock page
  if (pathname === UNLOCK_PATH) {
    return <>{children}</>
  }

  if (isLoading || restoring) {
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
    <div className="flex h-screen bg-layer-2">
      {/* Drawer overlay (below lg) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar: static from lg up, a drawer below */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 transform transition-transform duration-200 ease-out motion-reduce:transition-none lg:static lg:z-auto lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Cerrar menú"
          className="absolute right-3 top-3 rounded-md p-2 text-text-secondary hover:text-text-primary lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
        <Sidebar onNavigate={sidebarOpen ? () => setSidebarOpen(false) : undefined} />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-layer-3 bg-layer-1 px-4 md:px-6">
          <h1 className="text-base font-medium text-text-primary">{pageTitle(pathname)}</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <ProfileDropdown />
          </div>
        </header>

        {/* Bottom padding leaves room for the mobile bar */}
        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-24 lg:pb-6">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>

      <MobileNav onOpenMenu={() => setSidebarOpen(true)} />
    </div>
  )
}
