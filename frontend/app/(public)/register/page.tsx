'use client'

import { useState, Suspense } from 'react'
import React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { ApiError } from '@/lib/apiClient'
import { validateRegister } from '@/validators/auth-validators'
import { Eye, EyeOff, ArrowLeft, Mail, Lock, User, Wallet, Check } from 'lucide-react'

function RegisterForm() {
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect')
  // Si viene de una invitación, no crear cuenta por defecto
  const isFromInvite = redirect?.startsWith('/invite/')

  // Para OAuth, necesitamos la URL base sin /api
  const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(
    /\/api$/,
    ''
  )

  const { register } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [accountName, setAccountName] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})

    const validation = validateRegister({
      name,
      email,
      password,
      confirmPassword,
      accountName: accountName || undefined,
    })

    if (!validation.success) {
      setFieldErrors(validation.errors)
      return
    }

    setIsLoading(true)

    try {
      await register(email, password, name, accountName || undefined, {
        skipDefaultAccount: isFromInvite,
        redirectTo: redirect || undefined,
      })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Error al conectar con el servidor')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Password strength indicator
  const getPasswordStrength = () => {
    if (!password) return { level: 0, text: '', color: '' }
    if (password.length < 6) return { level: 1, text: 'Muy débil', color: 'bg-red-500' }
    if (password.length < 8) return { level: 2, text: 'Débil', color: 'bg-orange-500' }
    if (password.length < 10 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
      return { level: 3, text: 'Buena', color: 'bg-yellow-500' }
    }
    if (
      password.length >= 10 &&
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^A-Za-z0-9]/.test(password)
    ) {
      return { level: 4, text: 'Fuerte', color: 'bg-emerald-500' }
    }
    return { level: 2, text: 'Débil', color: 'bg-orange-500' }
  }

  const passwordStrength = getPasswordStrength()
  const passwordsMatch = password && confirmPassword && password === confirmPassword

  return (
    <div className="min-h-[100dvh] bg-background text-foreground relative overflow-hidden sm:p-4">
      {/* Background effects */}
      <div className="fixed inset-0 -z-10">
        {/* Gradient orbs */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/20 dark:bg-blue-500/10 rounded-full blur-[120px] animate-pulse" />
        <div
          className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-emerald-500/20 dark:bg-emerald-500/10 rounded-full blur-[120px] animate-pulse"
          style={{ animationDelay: '1s' }}
        />

        {/* Grid pattern */}
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
          href="/"
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
      <main className="min-h-[100dvh] flex items-center justify-center p-6 py-24">
        <div className="w-full max-w-md sm:max-w-sm">
          {/* Card with glow */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-emerald-500/10 rounded-3xl blur-xl scale-105" />

            <div className="relative bg-card/80 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-2xl">
              {/* Welcome text */}
              <div className="text-center mb-6">
                <h1 className="text-2xl sm:text-xl font-bold tracking-tight mb-2">Crear cuenta</h1>
                <p className="text-muted-foreground">Empieza a controlar tus finanzas hoy</p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Error message */}
                {error && (
                  <div className="p-4 text-sm bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 animate-in slide-in-from-top-2 duration-300">
                    {error}
                  </div>
                )}

                {/* Name field */}
                <div className="space-y-1.5">
                  <label htmlFor="name" className="text-sm font-medium">
                    Tu nombre
                  </label>
                  <div
                    className={`relative transition-all duration-300 ${focusedField === 'name' ? 'scale-[1.02]' : ''}`}
                  >
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <User
                        className={`w-4 h-4 transition-colors duration-300 ${focusedField === 'name' ? 'text-emerald-500' : ''}`}
                      />
                    </div>
                    <input
                      id="name"
                      type="text"
                      placeholder="Juan Pérez"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value)
                        if (fieldErrors.name) {
                          setFieldErrors((prev) => ({ ...prev, name: '' }))
                        }
                      }}
                      onFocus={() => setFocusedField('name')}
                      onBlur={() => setFocusedField(null)}
                      required
                      className={`w-full h-11 pl-11 pr-4 bg-muted/50 border-2 rounded-xl outline-none transition-all duration-300 ${
                        fieldErrors.name
                          ? 'border-red-500 bg-red-500/5'
                          : focusedField === 'name'
                            ? 'border-emerald-500 bg-background shadow-lg shadow-emerald-500/10'
                            : 'border-transparent hover:border-border'
                      }`}
                    />
                  </div>
                  {fieldErrors.name && (
                    <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>
                  )}
                </div>

                {/* Account name field */}
                <div className="space-y-1.5">
                  <label htmlFor="accountName" className="text-sm font-medium">
                    Nombre de la cuenta{' '}
                    <span className="text-muted-foreground font-normal">(opcional)</span>
                  </label>
                  <div
                    className={`relative transition-all duration-300 ${focusedField === 'accountName' ? 'scale-[1.02]' : ''}`}
                  >
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Wallet
                        className={`w-4 h-4 transition-colors duration-300 ${focusedField === 'accountName' ? 'text-violet-500' : ''}`}
                      />
                    </div>
                    <input
                      id="accountName"
                      type="text"
                      placeholder="Mi economía familiar"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      onFocus={() => setFocusedField('accountName')}
                      onBlur={() => setFocusedField(null)}
                      className={`w-full h-11 pl-11 pr-4 bg-muted/50 border-2 rounded-xl outline-none transition-all duration-300 ${
                        fieldErrors.accountName
                          ? 'border-red-500 bg-red-500/5'
                          : focusedField === 'accountName'
                            ? 'border-violet-500 bg-background shadow-lg shadow-violet-500/10'
                            : 'border-transparent hover:border-border'
                      }`}
                    />
                  </div>
                  {fieldErrors.accountName && (
                    <p className="text-xs text-red-500 mt-1">{fieldErrors.accountName}</p>
                  )}
                </div>

                {/* Email field */}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email
                  </label>
                  <div
                    className={`relative transition-all duration-300 ${focusedField === 'email' ? 'scale-[1.02]' : ''}`}
                  >
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Mail
                        className={`w-4 h-4 transition-colors duration-300 ${focusedField === 'email' ? 'text-blue-500' : ''}`}
                      />
                    </div>
                    <input
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (fieldErrors.email) {
                          setFieldErrors((prev) => ({ ...prev, email: '' }))
                        }
                      }}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      required
                      className={`w-full h-11 pl-11 pr-4 bg-muted/50 border-2 rounded-xl outline-none transition-all duration-300 ${
                        fieldErrors.email
                          ? 'border-red-500 bg-red-500/5'
                          : focusedField === 'email'
                            ? 'border-blue-500 bg-background shadow-lg shadow-blue-500/10'
                            : 'border-transparent hover:border-border'
                      }`}
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>
                  )}
                </div>

                {/* Password field */}
                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-sm font-medium">
                    Contraseña
                  </label>
                  <div
                    className={`relative transition-all duration-300 ${focusedField === 'password' ? 'scale-[1.02]' : ''}`}
                  >
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Lock
                        className={`w-4 h-4 transition-colors duration-300 ${focusedField === 'password' ? 'text-emerald-500' : ''}`}
                      />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (fieldErrors.password) {
                          setFieldErrors((prev) => ({ ...prev, password: '' }))
                        }
                      }}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      required
                      className={`w-full h-11 pl-11 pr-12 bg-muted/50 border-2 rounded-xl outline-none transition-all duration-300 ${
                        fieldErrors.password
                          ? 'border-red-500 bg-red-500/5'
                          : focusedField === 'password'
                            ? 'border-emerald-500 bg-background shadow-lg shadow-emerald-500/10'
                            : 'border-transparent hover:border-border'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>
                  )}
                  {/* Password strength */}
                  {password && !fieldErrors.password && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden flex gap-0.5">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`flex-1 rounded-full transition-all duration-300 ${
                              level <= passwordStrength.level
                                ? passwordStrength.color
                                : 'bg-transparent'
                            }`}
                          />
                        ))}
                      </div>
                      <span
                        className={`text-xs font-medium ${passwordStrength.color.replace('bg-', 'text-')}`}
                      >
                        {passwordStrength.text}
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm password field */}
                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="text-sm font-medium">
                    Confirmar contraseña
                  </label>
                  <div
                    className={`relative transition-all duration-300 ${focusedField === 'confirmPassword' ? 'scale-[1.02]' : ''}`}
                  >
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Lock
                        className={`w-4 h-4 transition-colors duration-300 ${
                          focusedField === 'confirmPassword'
                            ? 'text-blue-500'
                            : passwordsMatch
                              ? 'text-emerald-500'
                              : ''
                        }`}
                      />
                    </div>
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        if (fieldErrors.confirmPassword) {
                          setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }))
                        }
                      }}
                      onFocus={() => setFocusedField('confirmPassword')}
                      onBlur={() => setFocusedField(null)}
                      required
                      className={`w-full h-11 pl-11 pr-12 bg-muted/50 border-2 rounded-xl outline-none transition-all duration-300 ${
                        fieldErrors.confirmPassword
                          ? 'border-red-500 bg-red-500/5'
                          : focusedField === 'confirmPassword'
                            ? 'border-blue-500 bg-background shadow-lg shadow-blue-500/10'
                            : passwordsMatch
                              ? 'border-emerald-500/50'
                              : 'border-transparent hover:border-border'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {fieldErrors.confirmPassword ? (
                        <EyeOff className="w-4 h-4 text-red-500" />
                      ) : passwordsMatch ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">{fieldErrors.confirmPassword}</p>
                  )}
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative w-full h-12 bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 mt-2 sm:h-10"
                >
                  <span
                    className={`flex items-center justify-center gap-2 transition-all duration-300 ${isLoading ? 'opacity-0' : ''}`}
                  >
                    Crear cuenta
                    <svg
                      className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </span>
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                </button>

                {/* Terms */}
                <p className="text-xs text-center text-muted-foreground mt-4">
                  Al crear una cuenta, aceptas nuestros{' '}
                  <Link href="/terms" className="text-emerald-500 hover:underline">
                    Términos de servicio
                  </Link>{' '}
                  y{' '}
                  <Link href="/privacy" className="text-emerald-500 hover:underline">
                    Política de privacidad
                  </Link>
                </p>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-3 text-muted-foreground">o continúa con</span>
                </div>
              </div>

              {/* Social login */}
              <div className="grid grid-cols-2 gap-3">
                <a
                  href={`${API_BASE}/api/auth/google`}
                  onClick={() => {
                    if (redirect) {
                      sessionStorage.setItem('oauth_redirect', redirect)
                    }
                  }}
                  className="flex items-center justify-center gap-2 h-11 border-2 border-border rounded-xl font-medium hover:border-foreground hover:bg-muted/50 transition-all duration-300"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </a>
                <a
                  href={`${API_BASE}/api/auth/github`}
                  onClick={() => {
                    if (redirect) {
                      sessionStorage.setItem('oauth_redirect', redirect)
                    }
                  }}
                  className="flex items-center justify-center gap-2 h-11 border-2 border-border rounded-xl font-medium hover:border-foreground hover:bg-muted/50 transition-all duration-300"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  GitHub
                </a>
              </div>

              {/* Login link */}
              <p className="mt-6 text-center text-sm text-muted-foreground">
                ¿Ya tienes cuenta?{' '}
                <Link
                  href="/login"
                  className="font-semibold text-blue-500 hover:text-blue-600 transition-colors"
                >
                  Inicia sesión
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterSkeleton />}>
      <RegisterForm />
    </Suspense>
  )
}

function RegisterSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  )
}
