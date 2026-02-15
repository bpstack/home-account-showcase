'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      const registerSW = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
          })

          console.log('[SW] Service Worker registrado correctamente:', registration)

          setInterval(
            () => {
              registration.update()
            },
            60 * 60 * 1000
          )

          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing

            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[SW] Nueva versión disponible')

                  window.dispatchEvent(
                    new CustomEvent('swUpdateAvailable', {
                      detail: { registration },
                    })
                  )
                }
              })
            }
          })
        } catch (error) {
          console.error('[SW] Error al registrar Service Worker:', error)
        }
      }

      registerSW()
    }
  }, [])

  return null
}
