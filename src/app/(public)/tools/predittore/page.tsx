import type { Metadata } from 'next'
import { ToolShell } from '@/components/tools/ToolShell'
import { RacePredictorTool } from '@/components/tools/RacePredictorTool'

export const metadata: Metadata = {
  title: 'Predittore tempi di gara per la corsa',
  description:
    'Hai un tempo su 5K, 10K, mezza o maratona? Stima il tuo potenziale sulle altre distanze con la formula di Riegel. Gratuito, valori indicativi.',
  alternates: { canonical: 'https://app.vieniacorrere.it/tools/predittore' },
}

export default function PredittorePage() {
  return (
    <ToolShell
      title="Predittore tempi gara"
      subtitle="Da una gara recente, il tuo potenziale sulle altre distanze."
      icon="timer"
      disclaimer={
        <>
          La previsione usa la <strong>formula di Riegel</strong> (modello pubblico) ed è puramente
          indicativa. Il risultato reale dipende da preparazione specifica, fondo, clima e altimetria
          del percorso. Non è un consiglio medico.
        </>
      }
    >
      <RacePredictorTool />
    </ToolShell>
  )
}
