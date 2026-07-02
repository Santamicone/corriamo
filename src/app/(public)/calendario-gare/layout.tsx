import type { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Calendario gare — maratone e mezze in Italia e in Europa',
  description:
    'Il calendario delle gare di corsa su strada: maratone e mezze maratone in Italia e in Europa, le World Marathon Majors e le SuperHalfs. Trova la tua prossima gara obiettivo.',
  alternates: { canonical: 'https://app.vieniacorrere.it/calendario-gare' },
  openGraph: {
    title: 'Calendario gare — Vieni a correre?',
    description:
      'Maratone e mezze in Italia e in Europa, Major e SuperHalfs. Trova la tua prossima gara.',
    url: 'https://app.vieniacorrere.it/calendario-gare',
  },
}

export default function CalendarioGareLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
