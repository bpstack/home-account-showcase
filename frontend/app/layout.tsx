import type { Metadata, Viewport } from 'next'
import React from 'react'
import { Poppins } from 'next/font/google'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { ThemeProvider } from '@/components/ui/ThemeProvider'
import { Providers } from '@/components/providers/Providers'
import { Toaster } from 'sonner'
import ServiceWorkerRegister from '@/components/service-worker/ServiceWorkerRegister'
import UpdateNotification from '@/components/service-worker/UpdateNotification'
import InstallPrompt from '@/components/service-worker/InstallPrompt'

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
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  appleWebApp: {
    capable: true,
    title: 'Home Account',
    statusBarStyle: 'black-translucent',
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
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
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
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-1FNTJHJHJF"
          strategy="afterInteractive"
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-1FNTJHJHJF');
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className="antialiased font-sans bg-white dark:bg-[#010409]">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <Providers>{children}</Providers>
          <Toaster richColors position="top-center" />
        </ThemeProvider>
        <ServiceWorkerRegister />
        <UpdateNotification />
        <InstallPrompt />
        <Analytics />
      </body>
    </html>
  )
}
