import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Galaxy Pharma — Agent Dashboard Prototype',
  description:
    'Query-driven, advisory-only view across DataNinja, NetSuite, QMS and OceaView. Prototype on mock data.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
