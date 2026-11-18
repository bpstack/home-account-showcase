'use client'

import { useEffect, useState, useCallback } from 'react'
import { Download, Share, X } from 'lucide-react'
import { Button, Sheet } from '@/components/ui'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean
  getInstalledRelatedApps?: () => Promise<{ platform: string; url?: string; id?: string }[]>
}

interface WindowWithMSStream extends Window {
  MSStream?: unknown
}

const STORAGE_KEY_DISMISSED = 'home-account-install-prompt-dismissed'
const STORAGE_KEY_IOS_SHOWN = 'home-account-ios-instructions-shown'
const STORAGE_KEY_INSTALLED = 'home-account-already-installed'

function isRunningAsStandalone(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  if ((window.navigator as NavigatorWithStandalone).standalone === true) return true
  if (window.matchMedia('(display-mode: fullscreen)').matches) return true
  if (window.matchMedia('(display-mode: minimal-ui)').matches) return true
  return false
}

function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent.toLowerCase()
  const isIOS = /iphone|ipad|ipod/.test(ua)
  const notMSStream = !(window as WindowWithMSStream).MSStream
  return isIOS && notMSStream
}

async function checkInstalledRelatedApps(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as NavigatorWithStandalone
  if (!nav.getInstalledRelatedApps) return false

  try {
    const relatedApps = await nav.getInstalledRelatedApps()
    return relatedApps.length > 0
  } catch {
    return false
  }
}

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(true) // Start true to prevent flash

  const isIOS = isIOSDevice()

  const checkInstallationStatus = useCallback(async () => {
    // If running as standalone app, it's definitely installed
    if (isRunningAsStandalone()) {
      localStorage.setItem(STORAGE_KEY_INSTALLED, 'true')
      return true
    }

    // Check localStorage for previous installation
    if (localStorage.getItem(STORAGE_KEY_INSTALLED) === 'true') {
      return true
    }

    // Use getInstalledRelatedApps API if available (Chrome/Edge)
    const hasRelatedApp = await checkInstalledRelatedApps()
    if (hasRelatedApp) {
      localStorage.setItem(STORAGE_KEY_INSTALLED, 'true')
      return true
    }

    return false
  }, [])

  /* -------- initial check -------- */
  useEffect(() => {
    const init = async () => {
      const installed = await checkInstallationStatus()
      setIsInstalled(installed)

      if (installed) {
        setShowPrompt(false)
        return
      }

      // Check if user previously dismissed the prompt
      const dismissed = localStorage.getItem(STORAGE_KEY_DISMISSED)
      if (dismissed && !isIOS) {
        setShowPrompt(false)
        return
      }

      // For iOS, show after delay; for others, wait for beforeinstallprompt
      if (isIOS) {
        const iosShown = localStorage.getItem(STORAGE_KEY_IOS_SHOWN)
        if (!iosShown) {
          setTimeout(() => setShowPrompt(true), 3000)
        }
      }
    }

    init()
  }, [isIOS, checkInstallationStatus])

  useEffect(() => {
    if (isIOS || isInstalled) return

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Only show if not dismissed and not installed
      const dismissed = localStorage.getItem(STORAGE_KEY_DISMISSED)
      if (!dismissed) {
        setShowPrompt(true)
      }
    }

    const handleAppInstalled = () => {
      localStorage.setItem(STORAGE_KEY_INSTALLED, 'true')
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
    }

    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        localStorage.setItem(STORAGE_KEY_INSTALLED, 'true')
        setIsInstalled(true)
        setShowPrompt(false)
      }
    }

    if (mediaQuery.matches) {
      localStorage.setItem(STORAGE_KEY_INSTALLED, 'true')
      setIsInstalled(true)
      setShowPrompt(false)
    }

    mediaQuery.addEventListener('change', handleMediaChange)
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      mediaQuery.removeEventListener('change', handleMediaChange)
    }
  }, [isIOS, isInstalled])

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true)
      localStorage.setItem(STORAGE_KEY_IOS_SHOWN, 'true')
      return
    }

    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      localStorage.setItem(STORAGE_KEY_INSTALLED, 'true')
    }

    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  // Stable: Sheet re-runs its focus effect whenever onClose changes.
  const handleClose = useCallback(() => {
    if (isIOS) {
      setShowIOSInstructions(false)
      localStorage.setItem(STORAGE_KEY_IOS_SHOWN, 'true')
    } else {
      // Save dismissal for non-iOS so prompt doesn't reappear
      localStorage.setItem(STORAGE_KEY_DISMISSED, 'true')
    }
    setShowPrompt(false)
  }, [isIOS])

  // Don't render anything if installed
  if (isInstalled) {
    return null
  }

  if (!showPrompt) {
    return null
  }

  const stepNumber =
    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium'
  const pillButton =
    'flex h-11 items-center hover:bg-accent-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-foreground'

  return (
    <>
      {/* Above the mobile tab bar (about 56 px); bottom-left corner on desktop. */}
      <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 z-50 flex items-center rounded-full bg-accent text-accent-foreground shadow-lg lg:bottom-6 lg:left-6">
        <button
          type="button"
          onClick={handleInstallClick}
          className={`${pillButton} gap-2 rounded-l-full pl-4 pr-3 text-sm font-medium`}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Instalar app
        </button>
        <span className="h-5 w-px bg-accent-foreground/30" aria-hidden="true" />
        <button
          type="button"
          onClick={handleClose}
          aria-label="No mostrar más"
          className={`${pillButton} w-11 justify-center rounded-r-full`}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <Sheet
        open={showIOSInstructions}
        onClose={handleClose}
        title="Instalar en iPhone o iPad"
        footer={
          <Button onClick={handleClose} className="h-11 w-full sm:h-10">
            Entendido
          </Button>
        }
      >
        <ol className="space-y-4 text-sm">
          <li className="flex items-start gap-3">
            <span className={stepNumber}>1</span>
            <span className="pt-0.5">
              En Safari, pulsa <Share className="inline h-4 w-4" aria-hidden="true" />{' '}
              <strong className="font-medium">Compartir</strong> en la barra inferior.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className={stepNumber}>2</span>
            <span className="pt-0.5">
              Baja y toca <strong className="font-medium">Añadir a pantalla de inicio</strong>.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className={stepNumber}>3</span>
            <span className="pt-0.5">
              Pulsa <strong className="font-medium">Añadir</strong>, arriba a la derecha.
            </span>
          </li>
        </ol>
      </Sheet>
    </>
  )
}
