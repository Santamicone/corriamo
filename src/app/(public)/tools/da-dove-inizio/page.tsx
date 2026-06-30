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
      howTo={
        <>
          Rispondi con calma a 4 domande sul tuo punto di partenza e su cosa cerchi dalla corsa:
          non ci sono risposte giuste o sbagliate. In base a quello che ci dici ti suggeriamo il
          percorso più adatto — dal cammina-corri alla tua prima 5K — con qualche consiglio
          pratico per iniziare senza strafare. Bastano un paio di minuti.
        </>
      }
    >
      <StartQuiz />
    </ToolShell>
  )
}
