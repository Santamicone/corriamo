import type { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Calendario gare — corse su strada in Italia e in Europa',
  description:
    'Il calendario delle gare di corsa su strada: 10K, mezze e maratone e tante altre distanze in Italia e in Europa, comprese le World Marathon Majors e le SuperHalfs. Trova la tua prossima gara obiettivo.',
  alternates: { canonical: 'https://app.vieniacorrere.it/calendario-gare' },
  openGraph: {
    title: 'Calendario gare — Vieni a correre?',
    description:
      'Corse su strada in Italia e in Europa: 10K, mezze, maratone e altre distanze, Major e SuperHalfs. Trova la tua prossima gara.',
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
