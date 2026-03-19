import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BondTrack — Bail Bond Portfolio Manager',
  description: 'AI-powered bail bond portfolio management for Texas bondsmen',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BondTrack',
  },
  icons: {
    apple: '/icon-192.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#0f1e3c" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
