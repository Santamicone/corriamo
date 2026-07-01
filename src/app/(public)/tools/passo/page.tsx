import type { Metadata } from 'next'
import { ToolShell } from '@/components/tools/ToolShell'
import { PaceCalculatorTool } from '@/components/tools/PaceCalculatorTool'

export const metadata: Metadata = {
  title: 'Calcolatore passo corsa: tempo, ritmo e distanza',
  description:
    'Inserisci due valori tra distanza, passo e tempo: calcoliamo il terzo in tempo reale. Scorciatoie 5K–100K, conversioni in miglia e km/h. Gratis, ottimizzato per smartphone.',
  alternates: { canonical: 'https://app.vieniacorrere.it/tools/passo' },
}

export default function PassoPage() {
  return (
    <ToolShell
      title="Calcolatore passo"
      subtitle="Passo, tempo e distanza: ne inserisci due, calcoliamo il terzo."
      icon="pace"
      howTo={
        <>
          Compila due campi qualsiasi tra <strong>distanza</strong>, <strong>passo</strong> e{' '}
          <strong>tempo</strong>: il terzo si aggiorna da solo, senza premere nulla. Puoi scrivere
          in modo naturale — <strong>430</strong> diventa 4:30/km, <strong>4500</strong> diventa
          45:00, <strong>21.097</strong> diventa 21,097 km. Il campo con il bordo colorato è quello
          che stiamo calcolando: tocca un altro campo per spostare lì il calcolo.
        </>
      }
      disclaimer={
        <>
          Il calcolo assume un <strong>passo costante</strong> per tutta la distanza. In gara reale
          influiscono dislivello, vento, caldo e gestione dello sforzo. Usa i risultati come
          riferimento, non come garanzia di prestazione.
        </>
      }
    >
      <PaceCalculatorTool />
    </ToolShell>
  )
}
