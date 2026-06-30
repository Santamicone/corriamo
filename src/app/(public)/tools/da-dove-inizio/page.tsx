import type { Metadata } from 'next'
import { ToolShell } from '@/components/tools/ToolShell'
import { StartQuiz } from '@/components/tools/StartQuiz'

export const metadata: Metadata = {
  title: 'Test "da dove inizio?" — il tuo percorso per iniziare a correre',
  description:
    'Poche domande per capire da dove partire con la corsa: cammina-corri, prima 5K, corsa per dimagrire o stare meglio. Consigli personalizzati e gratuiti.',
  alternates: { canonical: 'https://app.vieniacorrere.it/tools/da-dove-inizio' },
}

export default function DaDoveInizioPage() {
  return (
    <ToolShell
      title="Da dove inizio?"
      subtitle="Rispondi a 4 domande: ti diciamo il percorso giusto per te."
      icon="directions_walk"
    >
      <StartQuiz />
    </ToolShell>
  )
}
