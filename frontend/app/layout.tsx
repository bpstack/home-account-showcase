import type { Metadata, Viewport } from 'next'
import React from 'react'
import { Poppins } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { ThemeProvider } from '@/components/ui/ThemeProvider'
import { Providers } from '@/components/providers/Providers'
import { Toaster } from 'sonner'

const poppins = Poppins({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
})

export const metadata: Metadata = {
  title: {
    default: 'Home Account',
    template: '%s | Home Account',
  },
  description: 'Control de gastos domésticos - Tu contabilidad personal y familiar',
  applicationName: 'Home Account',
  keywords: ['contabilidad', 'gastos', 'ingresos', 'control financiero', 'presupuesto'],
  authors: [{ name: 'Home Account Team' }],
  creator: 'Home Account',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    siteName: 'Home Account',
    title: 'Home Account - Contabilidad Doméstica',
    description: 'Control de gastos domésticos - Tu contabilidad personal y familiar',
    locale: 'es_ES',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#010409' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning className={poppins.variable}>
      <head>
        <Script
          id="theme-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme') || 'dark';
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="antialiased font-sans bg-white dark:bg-[#010409]"
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <Providers>{children}</Providers>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
