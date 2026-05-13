import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { ServiceWorkerRegistrar } from '@/components/pwa/ServiceWorkerRegistrar'
import { InstallPrompt } from '@/components/pwa/InstallPrompt'
import { OfflineBanner } from '@/components/pwa/OfflineBanner'

export const metadata: Metadata = {
  title: 'MindOfTrader — Trading Decision OS',
  description: 'Not a signal platform. A trading discipline system that evaluates trade quality, controls behavior, and improves decision-making.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MindOfTrader',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0B0F14',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="bg-bg-primary text-text-primary">
        <OfflineBanner />
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
            {children}
          </main>
        </div>
        <BottomNav />
        <InstallPrompt />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  )
}
