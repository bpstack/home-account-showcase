'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ProfileSidebar, SettingsPanel } from '@/components/profile'

function ProfileSkeleton() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  )
}

function ProfileContent() {
  const searchParams = useSearchParams()
  const activePanel = searchParams.get('panel')

  return (
    <div className="h-full min-h-screen bg-background">
      <div className="h-full flex flex-col lg:flex-row gap-6 p-4 md:p-6">
        <aside className="w-full lg:w-72 xl:w-80 flex-shrink-0">
          <ProfileSidebar />
        </aside>

        {activePanel === 'settings' && (
          <main className="flex-1 min-w-0">
            <SettingsPanel />
          </main>
        )}
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
