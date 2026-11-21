'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import {
  generateBIP39Mnemonic,
  generateSalt,
  deriveRecoveryKey,
  deriveUserKeyExtractable,
  generateRecoveryBlob,
  verifyUserKey,
} from '@/lib/crypto'
import { unlockUserKeyWithPin } from '@/lib/pinV2'
import { toast } from 'sonner'
import { Button, PasswordInput } from '@/components/ui'
import { FormAlert, RecoveryPhrase } from '@/components/auth'

const FULL_CLASS = 'h-11 w-full sm:h-10'

function SetupRecoveryForm() {
  const router = useRouter()

  const [phase, setPhase] = useState<'pin' | 'generating' | 'show'>('pin')
  const [currentPin, setCurrentPin] = useState('')
  const [mnemonic, setMnemonic] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (currentPin.length < 6 || currentPin.length > 8 || !/^\d+$/.test(currentPin)) {
      setError('El PIN debe tener entre 6 y 8 dígitos')
      return
    }

    setLoading(true)
    setPhase('generating')

    try {
      // Fetch key_salt from backend
      const keysRes = await fetch('/api/proxy/auth/keys', { credentials: 'include' })
      const keysData = await keysRes.json()
      if (!keysData.success || !keysData.key_salt) {
        throw new Error('No se pudo obtener la clave de cifrado')
      }

      // Raw UserKey: PIN v2 asks the server (it counts the attempt); v1 derives it from the PIN
      let userKeyRaw: Uint8Array
      if (keysData.pin_v2) {
        userKeyRaw = (await unlockUserKeyWithPin(currentPin, keysData.key_salt)).raw
      } else {
        const derived = await deriveUserKeyExtractable(currentPin, keysData.key_salt)
        if (
          keysData.verification_blob &&
          !(await verifyUserKey(keysData.verification_blob, derived.key))
        ) {
          derived.raw.fill(0)
          throw new Error('PIN incorrecto')
        }
        userKeyRaw = derived.raw
      }

      // Generate mnemonic, recovery key and recovery blob; the raw UserKey is zeroed even on error
      const words = generateBIP39Mnemonic()
      const recoverySalt = generateSalt()
      let recoveryBlob: string
      try {
        const recoveryKey = await deriveRecoveryKey(words, recoverySalt)
        recoveryBlob = await generateRecoveryBlob(userKeyRaw, recoveryKey)
      } finally {
        userKeyRaw.fill(0)
      }

      // Save to backend
      const csrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('csrfToken='))
        ?.split('=')[1]

      const res = await fetch('/api/proxy/auth/recovery-blob', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
        },
        body: JSON.stringify({ recoveryBlob, recoverySalt }),
        credentials: 'include',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al guardar frase de recuperación')
      }

      // Show mnemonic to user
      setMnemonic(words)
      setPhase('show')
    } catch (err: any) {
      setError(err.message || 'Error al generar frase de recuperación')
      setPhase('pin')
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = () => {
    router.push('/profile')
  }

  if (phase === 'generating') {
    return (
      <Column
        title="Generando la frase de recuperación…"
        description="Puede tardar unos segundos."
      />
    )
  }

  if (phase === 'show') {
    return (
      <Column
        title="Guarda tu frase de recuperación"
        description="Estas 24 palabras son la única forma de recuperar tus datos si olvidas el PIN. Guárdalas en un lugar seguro, fuera de línea."
      >
        <RecoveryPhrase mnemonic={mnemonic} />

        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(mnemonic)
            toast.success('Frase copiada al portapapeles')
          }}
          className={`mt-4 ${FULL_CLASS}`}
        >
          Copiar al portapapeles
        </Button>

        <label className="mt-6 flex items-start gap-3 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-accent"
          />
          He guardado esta frase en un lugar seguro. Entiendo que no se puede recuperar.
        </label>

        <Button onClick={handleContinue} disabled={!confirmed} className={`mt-6 ${FULL_CLASS}`}>
          Volver a configuración
        </Button>
      </Column>
    )
  }

  return (
    <Column
      title="Frase de recuperación"
      description="Introduce tu PIN para generar 24 palabras con las que recuperar tus datos si lo olvidas."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <FormAlert>{error}</FormAlert>}

        <PasswordInput
          id="currentPin"
          label="PIN actual (6 a 8 dígitos)"
          subject="PIN"
          inputMode="numeric"
          autoComplete="off"
          maxLength={8}
          value={currentPin}
          onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
          autoFocus
          className="h-11 tracking-widest sm:h-10"
        />

        <Button
          type="submit"
          isLoading={loading}
          disabled={currentPin.length < 6}
          className={FULL_CLASS}
        >
          Generar frase
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/profile')}
          className={FULL_CLASS}
        >
          Cancelar
        </Button>
      </form>
    </Column>
  )
}

/** A narrow centred column inside the app layout. */
function Column({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-md py-8">
      <h2 className="text-xl font-medium">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {children && <div className="mt-6">{children}</div>}
    </div>
  )
}

export default function SetupRecoveryPage() {
  return (
    <Suspense fallback={<Column title="Frase de recuperación" description="" />}>
      <SetupRecoveryForm />
    </Suspense>
  )
}
