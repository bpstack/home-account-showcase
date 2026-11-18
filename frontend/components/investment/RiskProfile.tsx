'use client'

import { Button } from '@/components/ui'
import type { InvestmentProfile } from '@/lib/api/investment'

export const PROFILE_LABELS: Record<InvestmentProfile['riskProfile'], string> = {
  conservative: 'Conservador',
  balanced: 'Equilibrado',
  dynamic: 'Dinámico',
}

const PROFILE_HINTS: Record<InvestmentProfile['riskProfile'], string> = {
  conservative: 'Prefieres seguridad: menos riesgo y menos rentabilidad esperada.',
  balanced: 'Buscas un equilibrio entre riesgo y rentabilidad.',
  dynamic: 'Aceptas más riesgo a cambio de más rentabilidad esperada.',
}

interface RiskProfileProps {
  profile: InvestmentProfile | null | undefined
  /** Opens the test, to take it or to take it again */
  onTakeTest: () => void
}

/** The investor profile in one line, and the way to (re)take its test. */
export function RiskProfile({ profile, onTakeTest }: RiskProfileProps) {
  return (
    <section aria-labelledby="risk-profile">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="risk-profile" className="text-sm font-medium text-text-primary">
          Tu perfil
        </h2>
        {profile && (
          <Button variant="ghost" size="sm" onClick={onTakeTest}>
            Repetir test
          </Button>
        )}
      </div>
      {profile ? (
        <>
          <p className="text-base font-medium text-text-primary">
            {PROFILE_LABELS[profile.riskProfile] ?? profile.riskProfile}
            <span className="font-normal text-text-secondary">
              {' '}
              · {profile.horizonYears} años de horizonte
            </span>
          </p>
          <p className="mt-1 text-sm text-text-secondary">{PROFILE_HINTS[profile.riskProfile]}</p>
        </>
      ) : (
        <p className="text-sm text-text-secondary">Aún no has hecho el test.</p>
      )}
    </section>
  )
}
