'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { ThemeToggle } from '@/components/ui'
import { User, Users, TrendingUp, X, Smartphone, Monitor, ArrowRight, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function HomePage() {
  const [showMobile, setShowMobile] = useState(false)
  const [showAccounts, setShowAccounts] = useState(false)

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
    <div className="min-h-[100dvh] lg:h-[100dvh] lg:overflow-hidden bg-background text-foreground transition-colors duration-500">
      {/* Subtle color accents in background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className={cn(
          "absolute -top-40 -left-40 w-80 h-80 rounded-full blur-[100px] transition-all duration-1000",
          showAccounts ? "bg-violet-500/20" : "bg-emerald-500/20 dark:bg-emerald-500/10"
        )} />
        <div className={cn(
          "absolute -bottom-40 -right-40 w-80 h-80 rounded-full blur-[100px] transition-all duration-1000",
          showAccounts ? "bg-blue-500/20" : "bg-blue-500/20 dark:bg-blue-500/10"
        )} />
      </div>

      {/* Main Grid */}
      <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr,1.2fr] gap-0">

        {/* LEFT PANEL - Content */}
        <div className="relative flex flex-col justify-between p-6 sm:p-8 lg:p-12 min-h-[100dvh] lg:min-h-0">

          {/* Header */}
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-lg shadow-emerald-500/20">
                  <span className="text-white font-bold text-sm">HA</span>
                </div>
                <span className="font-semibold text-lg tracking-tight hidden sm:block group-hover:tracking-wide transition-all duration-300">
                  Home Account
                </span>
              </Link>
              <div className="h-4 w-px bg-border/50 hidden sm:block" />
              <ThemeToggle />
            </div>
          </header>

          {/* Main Content */}
          <div className="flex-1 flex flex-col justify-center py-12 lg:py-0">
            <div className="space-y-8 flex flex-col items-center text-center">
              {/* Tagline with color accent */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full border border-emerald-500/20 overflow-hidden">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 tracking-wide uppercase">
                  Finanzas del hogar
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-[clamp(2.5rem,8vw,4.5rem)] font-bold leading-[0.95] tracking-tight">
                <span className="inline-block transition-transform duration-300 cursor-default hover:scale-105">
                  Control total
                </span>
                <br />
                <span className="bg-gradient-to-r from-emerald-500 to-blue-500 bg-clip-text text-transparent inline-block hover:from-blue-500 hover:to-emerald-500 transition-all duration-500 cursor-default hover:scale-105">
                  de tu economía
                </span>
              </h1>

              {/* Description */}
              <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
                Gestiona gastos, ingresos e inversiones de tu familia
                en un solo lugar. Simple y privado.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
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

            {/* Múltiples cuentas button */}
            <button
              onMouseEnter={() => setShowAccounts(true)}
              onMouseLeave={() => setShowAccounts(false)}
              className={cn(
                "flex lg:hidden items-center gap-2 text-sm px-3 py-1.5 rounded-full transition-all duration-300",
                showAccounts 
                  ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" 
                  : "text-muted-foreground hover:text-blue-500"
              )}
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

          {/* Dashboard/Accounts Preview container */}
          <div className={cn(
            "relative transition-all duration-700 ease-out",
            showMobile
              ? 'w-[300px] h-[620px]'
              : 'w-full max-w-2xl lg:max-w-none lg:w-[95%] lg:h-[85%]'
          )}>
            {/* Shadow layer */}
            <div className={cn(
              "absolute inset-0 rounded-2xl blur-xl transition-all duration-700 bg-gradient-to-br",
              showAccounts ? "from-violet-500/20 to-blue-500/20" : "from-emerald-500/20 to-blue-500/20",
              showMobile ? 'scale-110' : 'translate-x-4 translate-y-4'
            )} />

            {/* Main container mockup */}
            <div className={cn(
              "relative bg-card border border-border shadow-2xl overflow-hidden transition-all duration-700 h-full",
              showMobile ? 'rounded-[2.5rem]' : 'rounded-2xl'
            )}>
              {/* Chrome Header */}
              <div className={cn(
                "flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50 transition-all duration-500",
                showMobile ? 'justify-center rounded-t-[2.5rem]' : ''
              )}>
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
                          {showAccounts ? 'homeaccount.app/accounts' : 'homeaccount.app/dashboard'}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Content Area - Screenshots or Accounts List */}
              <div className={cn(
                "relative transition-all duration-700 h-full",
                showMobile ? 'h-[calc(100%-52px)]' : 'lg:h-[calc(100%-48px)]'
              )}>
                {/* 1. ACCOUNTS VIEW (Show when showAccounts is true) */}
                <div className={cn(
                  "absolute inset-0 z-20 bg-background/95 backdrop-blur-sm p-8 flex flex-col transition-all duration-500",
                  showAccounts ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
                )}>
                  <div className="mb-8">
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-violet-500 bg-clip-text text-transparent">Tipos de cuenta</h3>
                    <p className="text-muted-foreground mt-2">Gestiona múltiples perfiles financieros de forma independiente</p>
                  </div>
                  
                  <div className="grid gap-4">
                    {accountTypes.map((account, index) => (
                      <div
                        key={index}
                        className={cn(
                          "group flex items-center gap-6 p-5 rounded-2xl border border-border bg-card transition-all duration-300",
                          account.borderColor,
                          "hover:shadow-lg hover:-translate-y-1"
                        )}
                      >
                        <div className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3",
                          account.color
                        )}>
                          <account.icon className="w-7 h-7" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-foreground">
                            {account.title}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {account.description}
                          </p>
                        </div>
                        <Link 
                          href="/login"
                          className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all"
                        >
                          <ArrowRight className="w-5 h-5" />
                        </Link>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto pt-8 border-t border-border flex items-center justify-center gap-2 text-xs text-muted-foreground italic">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    Cambia entre cuentas al instante desde un solo login
                  </div>
                </div>

                {/* 2. SCREENSHOTS (Visible when not in accounts view) */}
                <div className={cn(
                  "relative h-full transition-all duration-500",
                  showAccounts ? "opacity-0 scale-95 blur-sm" : "opacity-100 scale-100 blur-0"
                )}>
                  {/* Desktop image */}
                  <Image
                    src="/hero-desktop.png"
                    alt="Dashboard de Home Account"
                    fill
                    className={cn(
                      "object-cover object-top transition-all duration-500",
                      showMobile ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                    )}
                    priority
                  />
                  {/* Mobile image */}
                  <Image
                    src="/hero-mobile.png"
                    alt="App móvil de Home Account"
                    fill
                    className={cn(
                      "object-contain object-center transition-all duration-500",
                      showMobile ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                    )}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Floating pill - Responsive Mode */}
          <button
            onClick={() => setShowMobile(!showMobile)}
            onMouseEnter={() => {
              setShowMobile(true)
              setShowAccounts(false)
            }}
            onMouseLeave={() => setShowMobile(false)}
            className={cn(
              "hidden lg:flex items-center gap-2 absolute top-8 right-8 rounded-full px-4 py-2.5 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer border",
              showMobile
                ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white border-transparent'
                : 'bg-card border-border hover:border-emerald-500'
            )}
          >
            {showMobile ? (
              <Monitor className="w-4 h-4 translate-y-[-1px]" />
            ) : (
              <Smartphone className="w-4 h-4 translate-y-[-1px]" />
            )}
            <span className="text-sm font-medium">Modo responsive</span>
          </button>

          {/* Floating pill - Multiple accounts */}
          <button
             onMouseEnter={() => {
               setShowAccounts(true)
               setShowMobile(false)
             }}
             onMouseLeave={() => setShowAccounts(false)}
             className={cn(
               "hidden lg:flex items-center gap-2 absolute top-8 left-8 border rounded-full px-4 py-2.5 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer group",
               showAccounts
                 ? 'bg-gradient-to-r from-blue-500 to-violet-500 text-white border-transparent'
                 : 'bg-card border-border hover:border-blue-500'
             )}
          >
            <Users className={cn(
              "w-4 h-4 transition-transform duration-300 group-hover:rotate-12",
              showAccounts ? "text-white" : "text-blue-500"
            )} />
            <span className="text-sm font-medium">Múltiples cuentas</span>
          </button>
        </div>
      </div>
    </div>
  )
}



