'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'

/**
 * Shown when ServiceWorkerRegister finds a new version installed and waiting (that is, after a
 * deploy). "Actualizar" activates it and reloads once the new version is in control.
 */
export default function UpdateNotification() {
  const [visible, setVisible] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    const show = () => setVisible(true)
    window.addEventListener('swUpdateAvailable', show)
    return () => window.removeEventListener('swUpdateAvailable', show)
  }, [])

  const handleUpdate = async () => {
    setUpdating(true)
    const registration = await navigator.serviceWorker?.getRegistration()
    const waiting = registration?.waiting
    if (!waiting) {
      window.location.reload()
      return
    }
    // Reload only when the new worker has taken control; reloading right away kept the old one
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), {
      once: true,
    })
    waiting.postMessage({ type: 'SKIP_WAITING' })
  }

  if (!visible) return null

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-20 z-50 flex items-center gap-3 rounded-lg border border-layer-3 bg-layer-1 px-4 py-3 shadow-lg sm:left-auto sm:right-6 sm:w-auto lg:bottom-6"
    >
      <span className="text-sm text-text-primary">Hay una versión nueva de la app.</span>
      <button
        type="button"
        onClick={handleUpdate}
        disabled={updating}
        className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-sm font-medium text-accent-foreground disabled:opacity-60"
      >
        <RefreshCw className={`h-4 w-4 ${updating ? 'animate-spin' : ''}`} aria-hidden="true" />
        Actualizar
      </button>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Cerrar aviso"
        className="rounded-md p-1 text-text-secondary hover:text-text-primary"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
