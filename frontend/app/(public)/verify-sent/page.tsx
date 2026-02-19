import Link from 'next/link'
import { ArrowLeft, Mail } from 'lucide-react'

export default function VerifySentPage() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground relative overflow-hidden sm:p-4">
      {/* Background effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/20 dark:bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 dark:bg-blue-500/10 rounded-full blur-[120px] animate-pulse"
          style={{ animationDelay: '1s' }}
        />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 p-6 flex items-center justify-between max-w-7xl mx-auto">
        <Link
          href="/login"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-sm font-medium">Volver</span>
        </Link>
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-lg shadow-emerald-500/20">
            <span className="text-white font-bold text-sm">HA</span>
          </div>
        </Link>
      </header>

      {/* Main content */}
      <main className="min-h-[100dvh] flex items-center justify-center p-6 pt-20">
        <div className="w-full max-w-md sm:max-w-sm">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-blue-500/10 rounded-3xl blur-xl scale-105" />
            <div className="relative bg-card/80 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-2xl text-center">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="w-8 h-8 text-emerald-500" />
              </div>

              <h1 className="text-2xl sm:text-xl font-bold tracking-tight mb-3">Revisa tu email</h1>
              <p className="text-muted-foreground mb-6">
                Te hemos enviado un enlace de verificación a tu correo electrónico.
              </p>

              <div className="bg-muted/50 border border-border rounded-xl p-4 mb-8 text-sm text-left">
                <p className="font-medium text-foreground mb-2">No olvides:</p>
                <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                  <li>Revisar tu carpeta de spam</li>
                  <li>El enlace expira en 24 horas</li>
                </ul>
              </div>

              <Link
                href="/resend-verification"
                className="group w-full h-12 bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-[1.02] flex items-center justify-center mb-4 sm:h-10"
              >
                No recibí el email
              </Link>

              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-emerald-500 transition-colors"
              >
                Ya verifiqué, ir a iniciar sesión
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
