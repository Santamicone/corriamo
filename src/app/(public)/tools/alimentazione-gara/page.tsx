import type { Metadata } from 'next'
import { ToolShell } from '@/components/tools/ToolShell'
import { NutritionPlanTool } from '@/components/tools/NutritionPlanTool'

export const metadata: Metadata = {
  title: 'Piano alimentazione gara — cosa mangiare prima e durante la corsa',
  description:
    'Organizza l\'alimentazione pre-gara e l\'integrazione in corsa: cena, colazione, gel e idratazione per 5K, 10K, mezza, maratona e trail. Guida pratica e gratuita.',
  alternates: { canonical: 'https://app.vieniacorrere.it/tools/alimentazione-gara' },
}

const NUTRITION_DISCLAIMER = (
  <>
    Questo strumento offre <strong>indicazioni generali</strong> per organizzarti meglio. Non
    sostituisce il parere di un nutrizionista o di un medico, soprattutto in caso di patologie,
    disturbi gastrointestinali, farmaci o esigenze alimentari specifiche.
  </>
)

export default function AlimentazioneGaraPage() {
  return (
    <ToolShell
      title="Piano alimentazione gara"
      subtitle="Cosa mangiare nei giorni prima, a colazione e durante la corsa."
      icon="nutrition"
      howTo={
        <>
          Indica la distanza che corri e qualche dettaglio su orario e durata previsti: noi
          costruiamo un piano pratico per i giorni prima, la colazione del mattino gara e
          l&apos;integrazione mentre corri — gel, sali e acqua compresi. Provalo sempre in
          allenamento prima del giorno della gara: lo stomaco non ama le sorprese.
        </>
      }
      disclaimer={NUTRITION_DISCLAIMER}
    >
      <NutritionPlanTool />
    </ToolShell>
  )
}
