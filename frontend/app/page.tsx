'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { ThemeToggle } from '@/components/ui'
import { User, Users, TrendingUp, X, Smartphone, Monitor } from 'lucide-react'

export default function HomePage() {
  const [showMobile, setShowMobile] = useState(false)
  const [showAccountsModal, setShowAccountsModal] = useState(false)

  const accountTypes = [
    {
      icon: User,
      title: 'Cuenta Individual',
      description: 'Control personal de tus finanzas',
      color: 'bg-blue-500/10 text-blue-500',
      borderColor: 'hover:border-blue-500',
    },
    {
      icon: Users,
      title: 'Cuenta Familiar',
      description: 'Gestión compartida del hogar',
      color: 'bg-emerald-500/10 text-emerald-500',
      borderColor: 'hover:border-emerald-500',
    },
    {
      icon: TrendingUp,
      title: 'Cuenta Inversión',
      description: 'Seguimiento de tu portfolio',
      color: 'bg-violet-500/10 text-violet-500',
      borderColor: 'hover:border-violet-500',
    },
  ]

  return (
    <div className="min-h-[100dvh] lg:h-[100dvh] lg:overflow-hidden bg-background text-foreground">
      {/* Subtle color accents in background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-emerald-500/20 dark:bg-emerald-500/10 rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-blue-500/20 dark:bg-blue-500/10 rounded-full blur-[100px]" />
      </div>

      {/* Main Grid */}
      <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr,1.2fr] gap-0">

        {/* LEFT PANEL - Content */}
        <div className="relative flex flex-col justify-between p-6 sm:p-8 lg:p-12 min-h-[100dvh] lg:min-h-0">

          {/* Header */}
          <header className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-lg shadow-emerald-500/20">
                <span className="text-white font-bold text-sm">HA</span>
              </div>
              <span className="font-semibold text-lg tracking-tight hidden sm:block group-hover:tracking-wide transition-all duration-300">
                Home Account
              </span>
            </Link>
            <ThemeToggle />
          </header>

          {/* Main Content */}
          <div className="flex-1 flex flex-col justify-center py-12 lg:py-0">
            <div className="space-y-6">
              {/* Tagline with color accent */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 tracking-wide uppercase">
                  Finanzas del hogar
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-[clamp(2.5rem,8vw,4.5rem)] font-bold leading-[0.95] tracking-tight">
                <span className="inline-block hover:translate-x-2 transition-transform duration-300 cursor-default">
                  Control total
                </span>
                <br />
                <span className="bg-gradient-to-r from-emerald-500 to-blue-500 bg-clip-text text-transparent inline-block hover:from-blue-500 hover:to-emerald-500 transition-all duration-500 cursor-default">
                  de tu economía
                </span>
              </h1>

              {/* Description */}
              <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
                Gestiona gastos, ingresos e inversiones de tu familia
                en un solo lugar. Simple y privado.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/login"
                  className="group relative inline-flex items-center justify-center h-12 px-6 bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-105"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Comenzar gratis
                    <svg
                      className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </span>
                </Link>
                <Link
                  href="/dashboard"
                  className="group inline-flex items-center justify-center h-12 px-6 border-2 border-border font-semibold rounded-lg transition-all duration-300 hover:border-emerald-500 hover:text-emerald-500"
                >
                  <span className="transition-transform duration-300 group-hover:scale-105">
                    Ver demo
                  </span>
                </Link>
              </div>

            </div>
          </div>

          {/* Footer Stats + Múltiples cuentas */}
          <div className="flex items-center justify-between pt-5 border-t border-border">
            {/* Stats */}
            <div className="flex items-center gap-6 sm:gap-10">
              {[
                { value: '100%', label: 'Gratuito', color: 'text-emerald-500' },
                { value: 'Local', label: 'Privado', color: 'text-blue-500' },
                { value: 'PWA', label: 'Multiplataforma', color: 'text-violet-500' },
              ].map((stat, index) => (
                <div key={index} className="flex items-center gap-6 sm:gap-10">
                  {index > 0 && <div className="w-px h-6 bg-border -ml-6 sm:-ml-10" />}
                  <div className="group cursor-default">
                    <p className={`text-base sm:text-lg font-bold transition-all duration-300 group-hover:scale-105 origin-left ${stat.color}`}>
                      {stat.value}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Múltiples cuentas */}
            <button
              onClick={() => setShowAccountsModal(true)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-blue-500 transition-colors"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Múltiples cuentas</span>
              <span className="sm:hidden">Cuentas</span>
            </button>
          </div>
        </div>

        {/* RIGHT PANEL - Visual */}
        <div className="relative bg-gradient-to-br from-emerald-500/5 via-transparent to-blue-500/5 p-6 sm:p-8 lg:p-0 flex items-center justify-center overflow-hidden">
          {/* Animated gradient orbs */}
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-500/20 dark:bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/20 dark:bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                              linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />

          {/* Dashboard Preview */}
          <div className={`relative transition-all duration-700 ease-out ${
            showMobile
              ? 'w-[300px] h-[620px]'
              : 'w-full max-w-2xl lg:max-w-none lg:w-[95%] lg:h-[85%]'
          }`}>
            {/* Shadow layer */}
            <div className={`absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-2xl blur-xl transition-all duration-700 ${
              showMobile ? 'scale-110' : 'translate-x-4 translate-y-4'
            }`} />

            {/* Main container */}
            <div className={`relative bg-card border border-border shadow-2xl overflow-hidden transition-all duration-700 h-full ${
              showMobile ? 'rounded-[2.5rem]' : 'rounded-2xl'
            }`}>
              {/* Chrome */}
              <div className={`flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50 transition-all duration-500 ${
                showMobile ? 'justify-center rounded-t-[2.5rem]' : ''
              }`}>
                {showMobile ? (
                  <div className="w-24 h-6 bg-foreground/90 rounded-full" />
                ) : (
                  <>
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400 hover:bg-red-500 transition-colors cursor-pointer" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400 hover:bg-yellow-500 transition-colors cursor-pointer" />
                      <div className="w-3 h-3 rounded-full bg-green-400 hover:bg-green-500 transition-colors cursor-pointer" />
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="max-w-xs mx-auto h-6 bg-background rounded-md flex items-center justify-center">
                        <span className="text-[10px] text-muted-foreground font-mono">
                          homeaccount.app/dashboard
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Screenshot */}
              <div className={`relative transition-all duration-700 ${
                showMobile ? 'h-[calc(100%-52px)]' : 'aspect-[16/10] lg:aspect-auto lg:h-[calc(100%-44px)]'
              }`}>
                {/* Desktop image */}
                <Image
                  src="/hero-desktop.png"
                  alt="Dashboard de Home Account"
                  fill
                  className={`object-cover object-top transition-all duration-500 ${
                    showMobile ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                  }`}
                  priority
                />
                {/* Mobile image - centered and contained */}
                <Image
                  src="/hero-mobile.png"
                  alt="App móvil de Home Account"
                  fill
                  className={`object-contain object-center transition-all duration-500 ${
                    showMobile ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Floating pill - Responsive Mode */}
          <button
            onClick={() => setShowMobile(!showMobile)}
            onMouseEnter={() => setShowMobile(true)}
            onMouseLeave={() => setShowMobile(false)}
            className={`hidden lg:flex items-center gap-2 absolute top-8 right-8 rounded-full px-4 py-2.5 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer border ${
              showMobile
                ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white border-transparent'
                : 'bg-card border-border hover:border-emerald-500'
            }`}
          >
            {showMobile ? (
              <Smartphone className="w-4 h-4" />
            ) : (
              <Monitor className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">Modo responsive</span>
          </button>

          {/* Floating pill - Multiple accounts */}
          <button
            onClick={() => setShowAccountsModal(true)}
            className="hidden lg:flex items-center gap-2 absolute bottom-8 left-8 bg-card border border-border rounded-full px-4 py-2.5 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-blue-500 cursor-pointer group"
          >
            <Users className="w-4 h-4 text-blue-500 transition-transform duration-300 group-hover:rotate-12" />
            <span className="text-sm font-medium">Múltiples cuentas</span>
            <span className="w-5 h-5 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
              3
            </span>
          </button>
        </div>
      </div>

      {/* Accounts Modal */}
      {showAccountsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowAccountsModal(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200" />

          {/* Modal */}
          <div
            className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-violet-500" />

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h3 className="text-xl font-bold">Tipos de cuenta</h3>
                <p className="text-sm text-muted-foreground mt-1">Elige cómo quieres gestionar tus finanzas</p>
              </div>
              <button
                onClick={() => setShowAccountsModal(false)}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-all duration-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Account options */}
            <div className="p-4 space-y-3">
              {accountTypes.map((account, index) => (
                <Link
                  key={index}
                  href="/login"
                  className={`group flex items-center gap-4 p-4 rounded-xl border border-border ${account.borderColor} hover:bg-muted/50 transition-all duration-300`}
                >
                  <div className={`w-12 h-12 rounded-xl ${account.color} flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                    <account.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold group-hover:text-foreground transition-colors">
                      {account.title}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {account.description}
                    </p>
                  </div>
                  <svg
                    className="w-5 h-5 text-muted-foreground transition-all duration-300 group-hover:text-foreground group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 pt-0">
              <p className="text-xs text-center text-muted-foreground">
                Puedes cambiar o añadir cuentas en cualquier momento
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
