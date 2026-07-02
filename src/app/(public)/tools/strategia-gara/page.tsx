import type { Metadata } from 'next'
import { ToolShell } from '@/components/tools/ToolShell'
import { RaceStrategyTool } from '@/components/tools/RaceStrategyTool'

export const metadata: Metadata = {
  title: 'Strategia gara intelligente — passo, tempo e split dal tuo GPX',
  description:
    'Carica il GPX del percorso e il tuo passo ideale: stima passo reale, tempo finale, split per km, tratti critici e commento strategico della gara. Gratis e senza registrazione.',
  alternates: { canonical: 'https://app.vieniacorrere.it/tools/strategia-gara' },
}

const STRATEGY_DISCLAIMER = (
  <>
    Le stime sono <strong>indicative</strong> e basate su un modello a coefficienti trasparente
    (dislivello, fondo, meteo, affollamento). Non tengono conto di preparazione specifica,
    stanchezza accumulata o imprevisti di gara. Usale come guida, non come garanzia: ascolta
    sempre le tue sensazioni durante la corsa.
  </>
)

export default function StrategiaGaraPage() {
  return (
    <ToolShell
      title="Strategia gara intelligente"
      subtitle="Dal percorso al piano di gara: passo, tempo, split e come affrontare la gara."
      icon="route"
      howTo={
        <>
          Scegli una <strong>gara dal catalogo</strong> (grandi maratone e mezze maratone) oppure
          carica il file <strong>GPX</strong> del tuo percorso, inserisci il <strong>passo</strong>
          che reggeresti su percorso piatto e le <strong>condizioni</strong> previste il giorno gara.
          Ti restituiamo il passo reale chilometro per chilometro, il tempo finale stimato, i tratti
          dove non forzare e un commento strategico su come affrontare la gara.
        </>
      }
      disclaimer={STRATEGY_DISCLAIMER}
    >
      <RaceStrategyTool />
    </ToolShell>
  )
}
