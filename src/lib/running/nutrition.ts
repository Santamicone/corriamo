/**
 * Generatore piano alimentazione pre-gara e gara.
 *
 * Struttura DICHIARATIVA come il quiz: gli input sono dati (NUTRITION_FIELDS),
 * la logica vive tutta in computeNutritionPlan(). Calcolo puro e testabile,
 * nessuna dipendenza da React.
 *
 * IMPORTANTE: è una guida orientativa, NON un piano nutrizionale personalizzato.
 * Il disclaimer accompagna sempre l'output nel componente.
 */

export type RaceDistance = '5k' | '10k' | '21k' | '42k' | 'trail'
export type GelExperience = 'mai' | 'qualcuna' | 'abituale'
export type GastricSensitivity = 'bassa' | 'media' | 'alta'
export type RaceGoal = 'finire' | 'pb' | 'prima'

export interface NutritionInput {
  distance: RaceDistance
  /** Orario di partenza in formato "HH:MM" (24h). Opzionale. */
  startTime?: string
  /** Tempo previsto in minuti. Opzionale. */
  expectedMinutes?: number
  /** Peso indicativo in kg. Opzionale, usato per stimare i carboidrati. */
  weightKg?: number
  gelExperience: GelExperience
  gastric: GastricSensitivity
  goal: RaceGoal
  /** Temperatura prevista in °C. Opzionale. */
  temperatureC?: number
}

export interface PlanSection {
  /** Icona Material Symbols. */
  icon: string
  title: string
  subtitle?: string
  /** Voci pratiche e concrete. */
  items: string[]
}

export interface NutritionPlan {
  /** Riga di sintesi tipo "Mezza maratona — partenza ore 9:30 — tempo previsto 1h45". */
  headline: string
  /** Vero per gare ≥ ~75 minuti, dove l'integrazione in gara conta davvero. */
  needsFueling: boolean
  /** Numero indicativo di gel, 0 se non servono. */
  gelCount: number
  sections: PlanSection[]
}

const DISTANCE_LABEL: Record<RaceDistance, string> = {
  '5k': '5K',
  '10k': '10K',
  '21k': 'Mezza maratona',
  '42k': 'Maratona',
  trail: 'Trail',
}

/** Durata tipica (minuti) usata come fallback quando non si indica il tempo previsto. */
const TYPICAL_MINUTES: Record<RaceDistance, number> = {
  '5k': 28,
  '10k': 55,
  '21k': 110,
  '42k': 240,
  trail: 180,
}

/** Definizione dei campi del form, in ordine di comparsa. */
export const NUTRITION_FIELDS = {
  distances: [
    { value: '5k', label: '5K', icon: 'directions_run' },
    { value: '10k', label: '10K', icon: 'directions_run' },
    { value: '21k', label: 'Mezza maratona', icon: 'flag' },
    { value: '42k', label: 'Maratona', icon: 'emoji_events' },
    { value: 'trail', label: 'Trail', icon: 'terrain' },
  ] as const,
  gelExperience: [
    { value: 'mai', label: 'Mai usati', icon: 'help' },
    { value: 'qualcuna', label: 'Qualche volta', icon: 'science' },
    { value: 'abituale', label: 'Li uso sempre', icon: 'verified' },
  ] as const,
  gastric: [
    { value: 'bassa', label: 'Stomaco di ferro', icon: 'sentiment_very_satisfied' },
    { value: 'media', label: 'Nella media', icon: 'sentiment_neutral' },
    { value: 'alta', label: 'Stomaco delicato', icon: 'sentiment_stressed' },
  ] as const,
  goals: [
    { value: 'finire', label: 'Finire bene', icon: 'sentiment_satisfied' },
    { value: 'pb', label: 'Fare il PB', icon: 'trending_up' },
    { value: 'prima', label: 'È la mia prima gara', icon: 'celebration' },
  ] as const,
}

/** Formatta minuti totali in "1h45" o "55'". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}'`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

/** Sottrae minuti a un orario "HH:MM" e restituisce "HH:MM". */
function shiftTime(time: string, minusMinutes: number): string | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim())
  if (!match) return null
  let total = Number(match[1]) * 60 + Number(match[2]) - minusMinutes
  total = ((total % 1440) + 1440) % 1440
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function computeNutritionPlan(input: NutritionInput): NutritionPlan {
  const { distance, gelExperience, gastric, goal } = input
  const minutes = input.expectedMinutes ?? TYPICAL_MINUTES[distance]
  const hot = (input.temperatureC ?? 0) >= 22
  const lowFiber = gastric !== 'bassa'

  // L'integrazione in gara conta davvero oltre i ~75 minuti di sforzo.
  const needsFueling = minutes >= 75
  const neverTriedGels = gelExperience === 'mai'

  // ── Headline ──
  const parts = [DISTANCE_LABEL[distance]]
  if (input.startTime) parts.push(`partenza ore ${input.startTime}`)
  if (input.expectedMinutes) parts.push(`tempo previsto ${formatDuration(input.expectedMinutes)}`)
  const headline = parts.join(' — ')

  const sections: PlanSection[] = []

  // ── 48/24 ore prima ──
  const beforeItems: string[] = [
    'Privilegia carboidrati semplici da digerire: pasta, riso, pane bianco, patate.',
    lowFiber
      ? 'Riduci fibre, legumi e verdure crude: meno scorie, meno sorprese il giorno della gara.'
      : 'Mantieni la tua alimentazione abituale, senza esagerare con le fibre la sera prima.',
    'Limita grassi pesanti, fritti, salse elaborate e alcol.',
    hot
      ? 'Bevi regolarmente durante la giornata: con il caldo parti dalla gara già ben idratato.'
      : 'Idratati con regolarità durante la giornata, senza forzare con litri d\'acqua tutti insieme.',
  ]
  if (distance === '42k' || distance === 'trail') {
    beforeItems.unshift(
      'Aumenta un po\' la quota di carboidrati negli ultimi 2-3 giorni (carico leggero), senza mangiare di più in totale.',
    )
  }
  sections.push({
    icon: 'restaurant',
    title: '48 / 24 ore prima',
    subtitle: 'Cosa privilegiare, cosa evitare, idratazione',
    items: beforeItems,
  })

  // ── Cena pre-gara ──
  sections.push({
    icon: 'dinner_dining',
    title: 'Cena prima della gara',
    items: [
      'Carboidrati semplici e digeribili, porzioni normali: niente abbuffate.',
      'Pochi grassi e poche fibre, condimenti leggeri.',
      'Niente piatti nuovi o esotici: solo cose che mangi di solito.',
      'Vai a dormire né affamato né appesantito.',
    ],
  })

  // ── Colazione pre-gara ──
  const breakfastTime = input.startTime ? shiftTime(input.startTime, 180) : null
  const earlyStart = input.startTime ? Number(input.startTime.split(':')[0]) < 8 : false
  const breakfastItems: string[] = [
    breakfastTime
      ? `Fai colazione intorno alle ${breakfastTime}, circa 3 ore prima della partenza.`
      : 'Fai colazione circa 3 ore prima della partenza.',
    'Scegli alimenti abituali e digeribili: fette biscottate o pane con miele/marmellata, una banana, un caffè se sei abituato.',
    gastric === 'alta'
      ? 'Porzioni leggere: meglio poco e sicuro che tanto e rischioso.'
      : 'Porzioni leggere o medie, in base a quanto reggi di solito al mattino.',
  ]
  if (earlyStart) {
    breakfastItems.push(
      'Se la gara parte molto presto e 3 ore prima è impossibile, anticipa una colazione più piccola (banana + qualcosa di zuccherino) 90 minuti prima.',
    )
  }
  sections.push({
    icon: 'free_breakfast',
    title: 'Colazione pre-gara',
    subtitle: 'Orario, esempi pratici, quantità',
    items: breakfastItems,
  })

  // ── Pre-partenza ──
  sections.push({
    icon: 'sports',
    title: 'Pre-partenza',
    items: [
      'Piccoli sorsi d\'acqua fino a poco prima del via, senza esagerare.',
      neverTriedGels
        ? 'Non provare gel o integratori nuovi adesso: il giorno della gara non si sperimenta.'
        : 'Eventuale gel "di partenza" solo se lo hai già testato in allenamento.',
      hot ? 'Con il caldo, resta all\'ombra e bevi a piccoli sorsi prima del via.' : 'Tieniti al caldo fino a pochi minuti dalla partenza.',
    ],
  })

  // ── Durante la gara ──
  let gelCount = 0
  const duringItems: string[] = []
  if (needsFueling) {
    // ~30-60 g di carboidrati l'ora → un gel ogni ~35-45 minuti dopo i primi 40-50'.
    gelCount = neverTriedGels ? 0 : Math.max(1, Math.round((minutes - 40) / 40))
    duringItems.push(
      hot
        ? 'Bevi a ogni ristoro, anche poco: con il caldo l\'idratazione viene prima dell\'energia.'
        : 'Bevi ai ristori secondo sete, senza saltarli nei tratti centrali.',
    )
    if (neverTriedGels) {
      duringItems.push(
        'Non hai mai usato i gel: per questa gara affidati ai ristori (acqua, eventuale integrazione del percorso) e prova i gel in allenamento per le prossime.',
      )
    } else {
      duringItems.push(
        `Primo gel intorno al 40'-50', poi circa uno ogni 35-45 minuti: per te indicativamente ${gelCount} gel.`,
      )
      duringItems.push('Accompagna sempre il gel con qualche sorso d\'acqua, mai con bevande zuccherate.')
    }
    if (distance === '42k') {
      duringItems.push('Sulla maratona inizia a integrare presto e con regolarità: non aspettare di sentirti vuoto.')
    }
    if (distance === 'trail') {
      duringItems.push('Sul trail alterna gel e cibo solido (barrette, frutta secca) se lo digerisci bene.')
    }
  } else {
    duringItems.push('Gara breve: l\'energia che hai già basta. Non servono gel.')
    duringItems.push(
      hot
        ? 'Con il caldo, un sorso d\'acqua a metà o ai ristori è più che sufficiente.'
        : 'Al massimo qualche sorso d\'acqua se ne senti il bisogno.',
    )
  }
  duringItems.push('Regola d\'oro: mai provare cibi, gel o bevande nuove il giorno della gara.')
  sections.push({
    icon: 'bolt',
    title: 'Durante la gara',
    subtitle: needsFueling ? 'Quando bere, quando integrare' : 'Idratazione essenziale',
    items: duringItems,
  })

  // ── Dopo la gara ──
  const afterItems: string[] = [
    'Reidratati subito a piccoli sorsi: acqua, eventualmente con sali se hai sudato molto.',
    'Entro le prime ore: un pasto con carboidrati per recuperare le scorte e proteine per i muscoli.',
    'Cammina un po\' e fai stretching leggero prima di fermarti del tutto.',
  ]
  if (goal === 'pb' || distance === '42k') {
    afterItems.push('Nei giorni successivi cura idratazione e riposo: il recupero è parte della prestazione.')
  }
  sections.push({
    icon: 'self_improvement',
    title: 'Dopo la gara',
    subtitle: 'Reidratazione e recupero',
    items: afterItems,
  })

  return { headline, needsFueling, gelCount, sections }
}
