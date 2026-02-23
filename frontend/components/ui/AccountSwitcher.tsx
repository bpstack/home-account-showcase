'use client'

import { Check } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

interface AccountSwitcherProps {
  onSwitch?: () => void
  variant?: 'list' | 'compact'
}

export function AccountSwitcher({ onSwitch, variant = 'list' }: AccountSwitcherProps) {
  const { account, accounts: allAccounts, switchAccount, isSwitchingAccount } = useAuth()

  const handleSwitch = async (accountId: string) => {
    await switchAccount(accountId)
    onSwitch?.()
  }

  if (allAccounts.length <= 1) return null

  return (
    <div className={cn(variant === 'list' && 'flex flex-col gap-1')}>
      {allAccounts.map((acc) => {
        const isActive = acc.id === account?.id
        return (
          <button
            key={acc.id}
            onClick={() => !isActive && handleSwitch(acc.id)}
            disabled={isSwitchingAccount || isActive}
            className={cn(
              'w-full flex items-center justify-between text-sm transition-colors',
              variant === 'list' ? 'px-3 py-2 rounded-lg' : 'px-4 py-2.5',
              isActive
                ? 'bg-primary/10 text-primary font-medium cursor-default'
                : 'text-foreground hover:bg-muted'
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              {variant === 'list' && (
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {acc.name?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
              <span className="truncate">{acc.name}</span>
              {isActive && <Check className="w-3 h-3 shrink-0" />}
            </div>
            <span className="text-xs text-muted-foreground shrink-0 ml-2">
              {acc.role === 'owner' ? 'Propietario' : 'Miembro'}
            </span>
          </button>
        )
      })}
    </div>
  )
}
