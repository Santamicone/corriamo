import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vieni a correre? — Trova e organizza corse con altri runner',
  description: 'La piattaforma per runner che vogliono correre insieme. Crea corse singole o serie ricorrenti, trova compagni di allenamento.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <head>
        {/* Fonts caricati via <link> per garantire il rendering delle icone */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background flex flex-col">
        {children}
      </body>
    </html>
  )
}
