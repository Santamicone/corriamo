import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Corriamo? — Trova e organizza corse con altri runner',
  description: 'La piattaforma per runner che vogliono correre insieme. Crea corse singole o serie ricorrenti, trova compagni di allenamento.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="min-h-screen bg-background">{children}</body>
    </html>
  )
}
