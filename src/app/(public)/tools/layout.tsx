import type { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Strumenti per runner — calcolatori di ritmo e gara',
  description:
    'Strumenti gratuiti per chi corre: calcolatore delle zone di passo, predittore dei tempi di gara e test "da dove inizio?". Valori indicativi basati su modelli pubblici.',
  alternates: { canonical: 'https://app.vieniacorrere.it/tools' },
  openGraph: {
    title: 'Strumenti per runner — Vieni a correre?',
    description:
      'Calcola le tue zone di passo e prevedi i tempi di gara. Gratuito, senza registrazione.',
    url: 'https://app.vieniacorrere.it/tools',
  },
}

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  )
}
