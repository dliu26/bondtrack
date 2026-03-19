import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BondTrack — Bail Bond Portfolio Manager',
  description: 'AI-powered bail bond portfolio management for Texas bondsmen',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
