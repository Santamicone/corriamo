import type { Metadata } from 'next'
import { ToolShell } from '@/components/tools/ToolShell'
import { RaceMatcherTool } from '@/components/tools/RaceMatcherTool'
import { createClient } from '@/lib/supabase/server'
import type { Race } from '@/lib/types'
import { todayItaly } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Trova la tua gara ideale',
  description:
    'Rispondi a poche domande — distanza, periodo, obiettivo e preferenze — e scopri le gare più adatte a te tra maratone e mezze in Italia e in Europa. Gratuito.',
  alternates: { canonical: 'https://app.vieniacorrere.it/tools/gara-ideale' },
}

export default async function GaraIdealePage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('races')
    .select('*')
    .eq('status', 'published')
    .gte('event_date', todayItaly())
    .order('event_date', { ascending: true })
  const races = (data ?? []) as unknown as Race[]

  return (
    <ToolShell
      title="Trova la tua gara ideale"
      subtitle="Poche domande e ti proponiamo le gare più adatte a te."
      icon="emoji_events"
      howTo={
        <>
          Dicci che <strong>distanza</strong> vuoi correre, entro quando, dove e qual è il tuo
          <strong> obiettivo</strong> (finire, fare il personale, viverti l&apos;esperienza, un viaggio o
          preparare la maratona). Aggiungi qualche preferenza e ti mostriamo una <strong>shortlist</strong>
          dal calendario gare, spiegando perché ognuna fa al caso tuo.
        </>
      }
      disclaimer={
        <>
          I suggerimenti sono <strong>indicativi</strong> e basati sui dati disponibili nel catalogo
          (a volte parziali). Verifica sempre percorso, dislivello e iscrizioni sul sito ufficiale
          della gara prima di decidere.
        </>
      }
    >
      <RaceMatcherTool races={races} />
    </ToolShell>
  )
}
