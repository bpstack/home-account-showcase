'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ProfileSidebar, SettingsPanel } from '@/components/profile'
import { Shield } from 'lucide-react'

function ProfileSkeleton() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  )
}

function ProfileContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activePanel = searchParams.get('panel')
  const [bip39Verified, setBip39Verified] = useState<boolean | null>(null)

  useEffect(() => {
    const fetchKeys = async () => {
      try {
        const res = await fetch('/api/proxy/auth/keys', { credentials: 'include' })
        const data = await res.json()
        if (data.success) {
          setBip39Verified(data.bip39_verified ?? false)
        }
      } catch {
        setBip39Verified(false)
      }
    }
    fetchKeys()
  }, [])

  return (
    <div className="h-full min-h-screen bg-background">
      {/* BIP39 recovery banner */}
      {bip39Verified === false && (
        <div className="p-4 bg-amber-500/10 border-b border-amber-500/20">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Shield className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  Configura tu frase de recuperación para no perder tus datos si olvidas tu PIN.
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/setup-recovery')}
              className="px-4 py-2 text-sm font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
            >
              Configurar ahora
            </button>
          </div>
        </div>
      )}

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
