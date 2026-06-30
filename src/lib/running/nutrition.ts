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

/** Strategia gel calcolata in modo concreto: quanti, quando, con quanti carboidrati. */
export interface GelStrategy {
  /** Numero indicativo di gel da portare. */
  count: number
  /** Carboidrati per gel (g) usati per il calcolo. */
  carbsPerGel: number
  /** Carboidrati totali stimati dai gel (g). */
  totalCarbs: number
  /** Obiettivo di carboidrati all'ora (g/h). */
  carbsPerHour: number
  /** Minuto in cui prendere il primo gel. */
  firstAtMin: number
  /** Cadenza indicativa tra un gel e l'altro (minuti). */
  everyMin: number
  /** Quanti gel, tra quelli totali, possono essere con caffeina (0 = nessuno). */
  caffeineCount: number
  /** Nota sintetica sull'uso della caffeina. */
  caffeineNote: string
}

export interface NutritionPlan {
  /** Riga di sintesi tipo "Mezza maratona — partenza ore 9:30 — tempo previsto 1h45". */
  headline: string
  /** Vero per gare ≥ ~75 minuti, dove l'integrazione in gara conta davvero. */
  needsFueling: boolean
  /** Numero indicativo di gel, 0 se non servono. */
  gelCount: number
  /** Dettaglio della strategia gel, presente solo quando servono i gel. */
  gel: GelStrategy | null
  sections: PlanSection[]
}

/** Un pasto di esempio per il "menù tipo" inviato via email. */
export interface MenuMeal {
  icon: string
  title: string
  /** Quando consumarlo, es. "circa 3 ore prima". */
  when: string
  /** Voci concrete del menù. */
  items: string[]
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

/**
 * Calcola una strategia gel concreta: numero di gel, carboidrati, cadenza e
 * indicazione sulla caffeina. Restituisce null per le gare troppo brevi.
 */
export function computeGelStrategy(input: NutritionInput, minutes: number): GelStrategy | null {
  const { distance, gelExperience, gastric, goal } = input
  if (minutes < 75) return null

  // Carboidrati/ora: più alti sulle gare lunghe, dove conta integrare con regolarità.
  const longEffort = distance === '42k' || distance === 'trail' || minutes >= 150
  const carbsPerHour = longEffort ? 60 : 40
  const carbsPerGel = 25

  // Si inizia a integrare dopo i primi ~40' (prima le scorte bastano).
  const firstAtMin = 45
  const fuelingHours = Math.max(0.5, (minutes - firstAtMin) / 60)
  const totalCarbs = Math.round(carbsPerHour * fuelingHours)
  const count = Math.max(1, Math.round(totalCarbs / carbsPerGel))
  const everyMin = Math.min(45, Math.max(25, Math.round((minutes - firstAtMin) / count)))

  // Caffeina: utile nella seconda metà se l'atleta è abituato e ben tollerante.
  // Si evita a chi ha lo stomaco delicato o non ha mai provato i gel.
  let caffeineCount = 0
  let caffeineNote =
    'Per questa gara meglio gel senza caffeina: la tieni come arma solo quando sei sicuro di tollerarla.'
  const caffeineOk = gelExperience !== 'mai' && gastric !== 'alta'
  if (caffeineOk && (goal === 'pb' || longEffort)) {
    caffeineCount = Math.min(count, longEffort ? 2 : 1)
    caffeineNote =
      caffeineCount >= count
        ? `Prendi il gel nella seconda metà di gara con caffeina (~50-100 mg) per la spinta finale.`
        : `Negli ultimi terzi di gara usa ${caffeineCount} gel con caffeina (~50-100 mg l'uno) per la spinta finale; gli altri senza caffeina.`
  }

  return {
    count,
    carbsPerGel,
    totalCarbs,
    carbsPerHour,
    firstAtMin,
    everyMin,
    caffeineCount,
    caffeineNote,
  }
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
  const gel = computeGelStrategy(input, minutes)
  let gelCount = gel?.count ?? 0
  const duringItems: string[] = []
  if (gel) {
    // Idratazione prima di tutto.
    duringItems.push(
      hot
        ? 'Bevi a ogni ristoro, anche poco: con il caldo l\'idratazione viene prima dell\'energia.'
        : 'Bevi ai ristori secondo sete, senza saltarli nei tratti centrali.',
    )
    duringItems.push(`Obiettivo carboidrati: circa ${gel.carbsPerHour} g all'ora di sforzo.`)
    duringItems.push(
      `Porta ${gel.count} gel da ~${gel.carbsPerGel} g di carboidrati l'uno (totale ~${gel.totalCarbs} g di carbo).`,
    )
    duringItems.push(
      `Primo gel intorno al ${gel.firstAtMin}', poi uno ogni ${gel.everyMin}' circa, sempre con qualche sorso d'acqua (mai con bevande zuccherate).`,
    )
    duringItems.push(gel.caffeineNote)
    if (neverTriedGels) {
      duringItems.push(
        'Non hai mai usato i gel: questi numeri valgono come bersaglio, ma provali PRIMA in allenamento. Il giorno della gara non si sperimenta.',
      )
      gelCount = gel.count
    }
    if (distance === '42k') {
      duringItems.push('Sulla maratona inizia a integrare presto e con regolarità: non aspettare di sentirti vuoto.')
    }
    if (distance === 'trail') {
      duringItems.push('Sul trail puoi sostituire qualche gel con cibo solido (barrette, frutta secca) a parità di carboidrati, se lo digerisci bene.')
    }
  } else {
    // Gara breve: i gel non servono, ma per chi punta alla prestazione un gel può aiutare.
    if (goal === 'pb' && !neverTriedGels && minutes >= 40) {
      duringItems.push(
        'Gara breve: le scorte bastano. Se punti al PB, un solo gel da ~25 g di carboidrati intorno a metà gara può dare una spinta — ma solo se lo hai già provato.',
      )
    } else {
      duringItems.push('Gara breve: l\'energia che hai già basta. Non servono gel.')
    }
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
    subtitle: gel ? 'Quanti gel, quando bere e integrare' : 'Idratazione essenziale',
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

  return { headline, needsFueling, gelCount, gel, sections }
}

/**
 * Costruisce un "menù tipo" concreto pasto per pasto, da inviare via email.
 * Adatta le scelte a stomaco delicato e gare lunghe.
 */
export function buildMenuExamples(input: NutritionInput): MenuMeal[] {
  const { distance, gastric, goal } = input
  const minutes = input.expectedMinutes ?? TYPICAL_MINUTES[distance]
  const gel = computeGelStrategy(input, minutes)
  const delicate = gastric === 'alta'
  const longEffort = distance === '42k' || distance === 'trail'

  const breakfastTime = input.startTime ? shiftTime(input.startTime, 180) : null

  const meals: MenuMeal[] = [
    {
      icon: 'dinner_dining',
      title: 'Cena pre-gara',
      when: 'la sera prima',
      items: [
        longEffort
          ? 'Riso o pasta (100-130 g a crudo) con olio e parmigiano, condimento semplice.'
          : 'Pasta o riso (80-100 g a crudo) con pomodoro o olio e parmigiano.',
        delicate ? 'Pane bianco al posto di quello integrale.' : 'Una porzione di pane.',
        'Una fonte proteica magra: petto di pollo, pesce bianco o un uovo.',
        delicate
          ? 'Niente verdure crude o legumi: una banana matura come dessert.'
          : 'Verdura cotta leggera; come dessert una banana o una composta di frutta.',
        'Acqua naturale. Evita fritti, salse pesanti e alcol.',
      ],
    },
    {
      icon: 'free_breakfast',
      title: 'Colazione pre-gara',
      when: breakfastTime ? `verso le ${breakfastTime} (≈ 3 h prima)` : 'circa 3 ore prima',
      items: [
        delicate
          ? '3-4 fette biscottate con miele o marmellata (senza burro).'
          : 'Pane bianco o fette biscottate con miele/marmellata, oppure una porzione di fiocchi d\'avena.',
        'Una banana matura.',
        delicate ? 'Un tè leggero o un caffè solo se ci sei abituato.' : 'Un caffè o un tè se sei abituato.',
        'Acqua a piccoli sorsi. Niente latte abbondante, niente cibi grassi o ricchi di fibre.',
      ],
    },
    {
      icon: 'sports',
      title: 'Spuntino pre-partenza',
      when: '30-60 min prima del via',
      items: [
        'Mezza banana o un piccolo pacchetto di gallette di riso.',
        goal === 'pb'
          ? 'Eventuale gel "di partenza" da ~25 g di carbo 10-15\' prima del via, solo se già testato.'
          : 'Qualche sorso d\'acqua, senza appesantirti.',
      ],
    },
  ]

  // Pasto "durante" solo se la gara è abbastanza lunga da richiedere integrazione.
  if (gel) {
    meals.push({
      icon: 'bolt',
      title: 'Durante la gara',
      when: `dal ${gel.firstAtMin}', ogni ${gel.everyMin}' circa`,
      items: [
        `${gel.count} gel da ~${gel.carbsPerGel} g di carbo l'uno (≈ ${gel.carbsPerHour} g/h, totale ~${gel.totalCarbs} g).`,
        gel.caffeineCount > 0
          ? `Di questi, ${gel.caffeineCount} con caffeina negli ultimi terzi di gara.`
          : 'Tutti senza caffeina.',
        'Ogni gel accompagnato da qualche sorso d\'acqua ai ristori.',
      ],
    })
  }

  meals.push({
    icon: 'self_improvement',
    title: 'Dopo la gara',
    when: 'entro 1-2 ore',
    items: [
      'Reidratazione a piccoli sorsi: acqua, con sali se hai sudato molto.',
      'Carboidrati per ricaricare (pasta, riso, pane o frutta) + proteine per i muscoli.',
      'Frutta fresca per vitamine e liquidi.',
    ],
  })

  return meals
}
