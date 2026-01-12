'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ProfileSidebar, SettingsPanel } from '@/components/profile'

function ProfileSkeleton() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" />
    </div>
  )
}

function ProfileContent() {
  const searchParams = useSearchParams()
  const activePanel = searchParams.get('panel')

  return (
    <div className="h-full min-h-screen bg-layer-1">
      <div className="h-full flex flex-col lg:flex-row gap-6 p-4 md:p-6">
        <aside className="w-full lg:w-72 xl:w-80 flex-shrink-0">
          <ProfileSidebar />
        </aside>

        <main className="flex-1 min-w-0">
          {activePanel === 'settings' ? <SettingsPanel /> : null}

          {!activePanel && (
            <div className="hidden lg:flex flex-1 items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-layer-2 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-text-secondary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-text-primary mb-1">
                  Selecciona una opción
                </h3>
                <p className="text-xs text-text-secondary">
                  Usa el menú de la derecha para ver la configuración
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent />
    </Suspense>
  )
}
