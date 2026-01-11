'use client'

import { Sidebar } from '@/components/layout'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export default function PrivateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

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
    <div className="min-h-screen bg-background">
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-layer-1 border border-layer-3 rounded-lg shadow-lg"
      >
        <Menu className="h-6 w-6 text-text-primary" />
      </button>

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-layer-1 border-r border-layer-3 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2"
        >
          <X className="h-6 w-6 text-text-primary" />
        </button>
        <Sidebar />
      </aside>

      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="lg:ml-64 min-h-screen p-4 md:p-6 pt-16 lg:pt-6">
        <div className="max-w-[1400px]">
          {children}
        </div>
      </main>
    </div>
  )
}
