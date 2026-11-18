'use client'

import Link from 'next/link'
import { Button } from '@/components/ui'

interface EmptyAccountStateProps {
  onAddTransaction: () => void
}

/** A new account: say what is missing and offer the two ways to start. */
export function EmptyAccountState({ onAddTransaction }: EmptyAccountStateProps) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h2 className="text-lg font-medium text-text-primary">Aún no hay transacciones</h2>
      <p className="mt-2 text-sm text-text-secondary">
        Importa el extracto de tu banco o añade la primera a mano. El resumen se rellena solo.
      </p>
      <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
        <Link
          href="/import"
          className="inline-flex h-10 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Importar un extracto
        </Link>
        <Button variant="outline" onClick={onAddTransaction}>
          Añadir una a mano
        </Button>
      </div>
    </div>
  )
}
