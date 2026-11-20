import Link from 'next/link'
import { ButtonLink } from '@/components/ui'
import { AuthShell } from '@/components/auth'

export default function VerifySentPage() {
  return (
    <AuthShell
      title="Revisa tu email"
      description="Te hemos enviado un enlace para confirmar tu cuenta."
    >
      <p className="text-sm text-muted-foreground">
        Si no lo ves, mira en la carpeta de spam. El enlace caduca en 24 horas.
      </p>

      <ButtonLink href="/login" className="mt-6 h-11 w-full sm:h-10">
        Ya lo he confirmado: iniciar sesión
      </ButtonLink>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿No te ha llegado?{' '}
        <Link
          href="/resend-verification"
          className="rounded-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Reenviar
        </Link>
      </p>
    </AuthShell>
  )
}
