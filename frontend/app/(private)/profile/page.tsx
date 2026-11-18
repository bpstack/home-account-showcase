'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, ShieldAlert } from 'lucide-react'
import { SettingsPanel } from '@/components/profile'

/** Asks for the recovery phrase until it is set: without it, a forgotten PIN loses the data. */
function RecoveryNotice() {
  const [verified, setVerified] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/proxy/auth/keys', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setVerified(data.success ? (data.bip39_verified ?? false) : false))
      .catch(() => setVerified(false))
  }, [])

  if (verified !== false) return null
  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4 sm:flex-row sm:items-center"
    >
      <ShieldAlert className="h-5 w-5 flex-shrink-0 text-warning" aria-hidden="true" />
      <p className="flex-1 text-sm text-text-primary">
        Guarda tu frase de recuperación: sin ella, si olvidas el PIN no podrás recuperar tus datos.
      </p>
      <Link
        href="/setup-recovery"
        className="inline-flex h-9 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Guardarla ahora
      </Link>
    </div>
  )
}

/** Settings in one column; switching accounts, leaving one and signing out live in the header menu. */
export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <p className="flex items-center justify-center gap-2 py-12 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Cargando
        </p>
      }
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <RecoveryNotice />
        <SettingsPanel />
      </div>
    </Suspense>
  )
}
