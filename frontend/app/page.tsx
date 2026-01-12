'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { ThemeToggle } from '@/components/ui'

export default function HomePage() {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Fixed Background with Animated Grid */}
      <div className="fixed inset-0 -z-10 bg-white dark:bg-[#010409]">
        <div
          className="absolute inset-0 opacity-[0.15] dark:opacity-[0.08] transition-transform duration-300 ease-out"
          style={{
            backgroundImage: `linear-gradient(rgba(99, 102, 241, 0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(99, 102, 241, 0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
            transform: `translateY(${scrollY * 0.5}px)`,
          }}
        />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/20 dark:bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/20 dark:bg-teal-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/80 dark:bg-[#0d1117]/80 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center transform group-hover:scale-110 transition-transform">
                <span className="text-white font-bold text-lg">H</span>
              </div>
              <span className="text-xl font-semibold text-gray-900 dark:text-white hidden sm:block">
                Home Account
              </span>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-28 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div
            className="inline-block mb-4 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 transition-all duration-700 ease-out"
            style={{
              opacity: Math.max(0.5, 1 - scrollY / 400),
              transform: `translateY(${scrollY * 0.1}px)`,
            }}
          >
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              ✨ Control financeiro simplificado
            </span>
          </div>

          <h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 transition-all duration-700 ease-out"
            style={{
              transform: `translateY(${scrollY * 0.2}px)`,
              opacity: Math.max(0.2, 1 - scrollY / 600),
            }}
          >
            <span className="bg-gradient-to-r from-gray-900 via-emerald-800 to-teal-800 dark:from-white dark:via-emerald-200 dark:to-teal-200 bg-clip-text text-transparent">
              Contabilidad
            </span>
            <br />
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
              para tu hogar
            </span>
          </h1>

          <p
            className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto transition-all duration-700 ease-out"
            style={{
              transform: `translateY(${scrollY * 0.15}px)`,
              opacity: Math.max(0.2, 1 - scrollY / 600),
            }}
          >
            Controla tus gastos, ingresos y ahorros de forma sencilla.
            Tu economía familiar, bajo control.
          </p>

          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-3 transition-all duration-700 ease-out"
            style={{
              transform: `translateY(${scrollY * 0.1}px)`,
              opacity: Math.max(0.2, 1 - scrollY / 600),
            }}
          >
            <Link
              href="/login"
              className="group relative px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-lg overflow-hidden transition-all hover:shadow-lg hover:shadow-emerald-500/30 transform hover:scale-105"
            >
              <span className="relative z-10 flex items-center gap-2">
                Empezar ahora
                <svg
                  className="w-4 h-4 transform group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-teal-600 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>

            <Link
              href="/dashboard"
              className="px-6 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold rounded-lg border-2 border-gray-300 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all transform hover:scale-105"
            >
              Ver demo →
            </Link>
          </div>
        </div>
      </section>

      {/* Desktop Preview Section */}
      <section className="relative py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div
            className="relative transition-all duration-1000 ease-out"
            style={{
              transform: `translateY(${Math.max(0, 20 - scrollY * 0.1)}px)`,
              opacity: Math.min(1, Math.max(0, (scrollY - 50) / 250)),
            }}
          >
            <div className="absolute -inset-3 bg-gradient-to-r from-emerald-500/15 to-teal-500/15 dark:from-emerald-500/8 dark:to-teal-500/8 rounded-2xl blur-xl" />

            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-xl p-3 shadow-xl border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <div className="ml-3 text-xs text-gray-500 dark:text-gray-400 font-mono">
                  Panel Financiero
                </div>
              </div>

              <div className="relative rounded-lg overflow-hidden shadow-lg">
                <Image
                  src="/hero-desktop.png"
                  alt="Panel financiero"
                  width={1200}
                  height={700}
                  className="w-full h-auto"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
              </div>
            </div>

            <div className="mt-6 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Panel Financiero Completo
              </h2>
              <p className="text-base text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
                Visualiza tus ingresos, gastos y ahorros con gráficos detallados y estadísticas en tiempo real.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Preview Section */}
      <section className="relative py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div
            className="relative transition-all duration-1000 ease-out"
            style={{
              transform: `translateY(${Math.max(0, 30 - scrollY * 0.08)}px)`,
              opacity: Math.min(1, Math.max(0, (scrollY - 200) / 300)),
            }}
          >
            <div className="absolute -inset-3 bg-gradient-to-r from-teal-500/15 to-emerald-500/15 dark:from-teal-500/8 dark:to-emerald-500/8 rounded-2xl blur-xl" />

            <div className="relative flex justify-center">
              <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-[2.5rem] p-3 shadow-xl border-8 border-gray-800 dark:border-gray-700 max-w-[280px]">
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-5 bg-gray-800 dark:bg-gray-900 rounded-b-2xl" />

                <div className="relative rounded-[2rem] overflow-hidden shadow-lg">
                  <Image
                    src="/hero-mobile.png"
                    alt="Aplicación móvil"
                    width={320}
                    height={640}
                    className="w-full h-auto"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Accede Desde Cualquier Lugar
              </h2>
              <p className="text-base text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
                Tu información financiera siempre contigo, en cualquier dispositivo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: '💰',
                title: 'Control de Gastos',
                description: 'Registra y categoriza todos tus gastos de forma rápida',
              },
              {
                icon: '📈',
                title: 'Análisis Financiero',
                description: 'Visualiza ingresos, gastos y ahorros con gráficos detallados',
              },
              {
                icon: '📱',
                title: 'Multi-dispositivo',
                description: 'Accede a tus finanzas desde cualquier lugar',
              },
              {
                icon: '🏠',
                title: 'Para la Familia',
                description: 'Comparte cuentas con los miembros de tu hogar',
              },
              {
                icon: '🔒',
                title: 'Privado y Seguro',
                description: 'Tus datos están protegidos',
              },
              {
                icon: '📊',
                title: 'Informes',
                description: 'Genera informes detallados de tu situación',
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="group p-5 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-800 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all duration-500 ease-out hover:shadow-lg transform hover:-translate-y-1"
                style={{
                  opacity: Math.min(1, Math.max(0, (scrollY - 400) / 200)),
                  transform: `translateY(${Math.max(0, 15 - (scrollY - 400) * 0.03)}px)`,
                }}
              >
                <div className="text-4xl mb-2">{feature.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div
            className="relative transition-all duration-1000 ease-out"
            style={{
              transform: `translateY(${Math.max(0, 20 - scrollY * 0.1)}px)`,
              opacity: Math.min(1, Math.max(0, (scrollY - 50) / 200)),
            }}
          >
            <div className="absolute -inset-3 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/5 dark:to-teal-500/5 rounded-xl blur-lg" />

            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-xl p-5 shadow-lg border border-gray-200 dark:border-gray-800">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
                    100%
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Gratuito</p>
                </div>
                <div>
                  <p className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
                    Privado
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Tus datos</p>
                </div>
                <div>
                  <p className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
                    Sencillo
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Fácil uso</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            ¿Listo para organizar tus finanzas?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
            Empieza a controlar tu economía familiar hoy mismo.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-emerald-500/30 transition-all transform hover:scale-105"
          >
            Crear cuenta gratis
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-gray-200 dark:border-gray-800 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center text-gray-600 dark:text-gray-400">
          <p className="text-sm">© 2025 Home Account. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
