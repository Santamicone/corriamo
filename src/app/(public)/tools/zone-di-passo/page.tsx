import type { Metadata } from 'next'
import { ToolShell } from '@/components/tools/ToolShell'
import { PaceZonesTool } from '@/components/tools/PaceZonesTool'

export const metadata: Metadata = {
  title: 'Calcolatore zone di passo per la corsa',
  description:
    'Inserisci il risultato di una gara recente e ottieni i ritmi indicativi per corsa facile, lungo, medio, soglia e ripetute. Gratuito, basato su modelli pubblici.',
  alternates: { canonical: 'https://app.vieniacorrere.it/tools/zone-di-passo' },
}

export default function ZoneDiPassoPage() {
  return (
    <ToolShell
      title="Zone di passo"
      subtitle="Dalla tua ultima gara, i ritmi per ogni tipo di allenamento."
      icon="speed"
      disclaimer={
        <>
          I valori sono <strong>indicativi</strong> e basati su modelli pubblici (formula di Riegel).
          La risposta reale all'allenamento dipende da preparazione specifica, fondo, clima e percorso.
          Questo strumento non è un consiglio medico né sostituisce un allenatore.
        </>
      }
    >
      <PaceZonesTool />
    </ToolShell>
  )
}
