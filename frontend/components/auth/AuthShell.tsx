import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ThemeToggle } from '@/components/ui'
import { cn } from '@/lib/utils'

interface AuthShellProps {
  title: string
  description?: ReactNode
  /** A link back in the header, e.g. `{ href: '/', label: 'Inicio' }`. */
  back?: { href: string; label: string }
  /** A wider column, for content that does not fit the form width (the recovery phrase). */
  wide?: boolean
  /**
   * Renders the theme switch. Pages under `app/(public)` get it from their layout; the unlock
   * page lives outside it and asks for it here.
   */
  themeToggle?: boolean
  children: ReactNode
}

/**
 * The frame of the sign-in screens: a slim header, the brand from the home page and one centred
 * column. Flat on mobile; a bordered panel from `sm` up.
 */
export function AuthShell({
  title,
  description,
  back,
  wide = false,
  themeToggle = false,
  children,
}: AuthShellProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <header className="flex h-[72px] shrink-0 items-center justify-between px-4 sm:px-6">
        {back ? (
          <Link
            href={back.href}
            className="inline-flex h-10 items-center gap-2 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {back.label}
          </Link>
        ) : (
          <span />
        )}
        {themeToggle && <ThemeToggle />}
      </header>

      <main className="flex flex-1 justify-center px-4 pb-12 pt-2 sm:items-center sm:px-6">
        <div
          className={cn(
            'w-full sm:rounded-lg sm:border sm:border-border sm:bg-card sm:p-8',
            wide ? 'max-w-md' : 'max-w-sm'
          )}
        >
          <div className="mb-8 flex items-center gap-3">
            {/* The brand mark of the home page: the one gradient left in the app (owner's call). */}
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-blue-500 text-sm font-bold text-white"
            >
              HA
            </span>
            <span className="font-medium">Home Account</span>
          </div>

          <h1 className="text-xl font-medium">{title}</h1>
          {description && <div className="mt-1 text-sm text-muted-foreground">{description}</div>}

          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  )
}
