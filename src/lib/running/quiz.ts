/**
 * Quiz "Da dove inizio?" — flusso a step con esito personalizzato.
 *
 * Struttura DICHIARATIVA: gli step sono dati, non UI. Per aggiungere o
 * modificare una domanda basta toccare QUIZ_STEPS; per cambiare gli esiti,
 * solo computeOutcome(). Il componente non va riscritto.
 *
 * Le letture consigliate puntano (per ora) ad ancore segnaposto: andranno
 * collegate agli articoli del sito editoriale quando saranno pronti.
 */

export interface QuizOption {
  value: string
  label: string
  icon: string
}

export interface QuizStep {
  id: string
  question: string
  help?: string
  options: QuizOption[]
}

export type Answers = Record<string, string>

export const QUIZ_STEPS: QuizStep[] = [
  {
    id: 'can10',
    question: 'Riesci a correre 10 minuti di fila?',
    help: 'Senza fermarti a camminare.',
    options: [
      { value: 'si',     label: 'Sì, tranquillamente',   icon: 'directions_run' },
      { value: 'fatica', label: 'Sì, ma con fatica',     icon: 'sentiment_stressed' },
      { value: 'no',     label: 'No, non ancora',        icon: 'directions_walk' },
    ],
  },
  {
    id: 'pain',
    question: 'Hai dolori quando corri o cammini?',
    help: 'Ginocchia, caviglie, schiena…',
    options: [
      { value: 'no',     label: 'No, nessun dolore',     icon: 'check_circle' },
      { value: 'talvolta', label: 'Sì, ogni tanto',      icon: 'warning' },
      { value: 'spesso', label: 'Sì, spesso',            icon: 'medical_services' },
    ],
  },
  {
    id: 'freq',
    question: 'Quante volte puoi uscire a settimana?',
    options: [
      { value: 'low',  label: '1-2 volte', icon: 'looks_one' },
      { value: 'mid',  label: '3-4 volte', icon: 'looks_3' },
      { value: 'high', label: '5 o più',   icon: 'all_inclusive' },
    ],
  },
  {
    id: 'goal',
    question: 'Qual è il tuo obiettivo principale?',
    options: [
      { value: 'dimagrire', label: 'Dimagrire',          icon: 'monitor_weight' },
      { value: 'salute',    label: 'Stare meglio',       icon: 'favorite' },
      { value: 'prima5k',   label: 'La mia prima 5K',    icon: 'flag' },
      { value: 'compagnia', label: 'Correre in compagnia', icon: 'group' },
    ],
  },
]

export interface QuizReading {
  label: string
  href: string
}

export interface QuizOutcome {
  title: string
  summary: string
  steps: string[]
  readings: QuizReading[]
  /** Mostra l'invito al programma "Da zero a 5K". */
  showZeroTo5k: boolean
  /** Mostra l'avviso prudenza/medico in evidenza. */
  medicalWarning: boolean
}

export function computeOutcome(a: Answers): QuizOutcome {
  const medicalWarning = a.pain === 'spesso'
  const beginner = a.can10 === 'no'
  const fewDays = a.freq === 'low'

  // ── Percorso base in funzione del punto di partenza e dell'obiettivo ──
  let title: string
  let summary: string
  let steps: string[]
  let showZeroTo5k = false

  if (beginner) {
    title = 'Si parte da camminata e corsa'
    summary =
      'Non riesci ancora a correre 10 minuti di fila? È normalissimo e il punto di partenza perfetto. ' +
      'Con il metodo cammina-corri costruisci il fiato senza farti male: in poche settimane arrivi a correre senza fermarti.'
    steps = [
      'Alterna 1 minuto di corsa lenta e 2 di camminata, per 20-30 minuti totali.',
      `Esci ${fewDays ? '2 volte' : '3 volte'} a settimana, sempre a giorni alterni.`,
      'Ogni settimana allunga un po\' la parte di corsa e accorcia la camminata.',
      'Vai piano: devi sempre riuscire a parlare mentre corri.',
    ]
    showZeroTo5k = true
  } else if (a.goal === 'prima5k') {
    title = 'Verso la tua prima 5K'
    summary =
      'Hai già la base aerobica per puntare ai 5 km. Ora serve costanza e un pizzico di progressione: ' +
      'in 6-8 settimane la prima 5K corsa di fila è un obiettivo realistico.'
    steps = [
      'Fai 3 uscite a settimana: due facili e una un po\' più lunga.',
      'Aumenta la durata del lungo del 10% circa a settimana.',
      'Tieni la maggior parte delle uscite a ritmo conversazione.',
      'Usa il calcolatore zone di passo per trovare i tuoi ritmi.',
    ]
    showZeroTo5k = true
  } else if (a.goal === 'dimagrire') {
    title = 'Corsa per stare meglio col tuo peso'
    summary =
      'La corsa funziona per il peso quando è costante e sostenibile, non quando è massacrante. ' +
      'Meglio tante uscite facili che poche durissime: bruci di più e ti fai meno male.'
    steps = [
      'Punta sul volume facile: corse lente e lunghe, a ritmo comodo.',
      `Cerca di muoverti ${fewDays ? '3' : '4'} volte a settimana, anche con camminate veloci.`,
      'Abbina costanza alimentare: la corsa da sola non basta.',
      'Misura i progressi sulle settimane, non sul singolo allenamento.',
    ]
  } else if (a.goal === 'compagnia') {
    title = 'Corri in compagnia'
    summary =
      'Il modo migliore per non mollare è avere qualcuno che ti aspetta. ' +
      'Su Vieni a correre? trovi runner della tua zona con il tuo stesso passo, senza classifiche né competizione.'
    steps = [
      'Cerca corse facili e "no drop" vicino a te: nessuno resta indietro.',
      'Parti da uscite brevi con il gruppo, poi aumenta gradualmente.',
      'Concorda il ritmo prima di partire: deve essere comodo per tutti.',
    ]
  } else {
    title = 'Corsa benessere, con costanza'
    summary =
      'Il tuo obiettivo è sentirti meglio: la chiave è la regolarità, non l\'intensità. ' +
      'Poche regole semplici e la corsa diventa un\'abitudine che ti fa bene tutto l\'anno.'
    steps = [
      'Tieni le uscite facili: a ritmo conversazione la maggior parte del tempo.',
      `Punta a ${fewDays ? '2-3' : '3-4'} uscite a settimana, regolari.`,
      'Inserisci una volta a settimana un po\' di varietà (collinette, allunghi).',
      'Ascolta il corpo: il riposo fa parte dell\'allenamento.',
    ]
  }

  // ── Letture consigliate (articoli editoriali) ──
  const readings: QuizReading[] = [
    { label: 'Come iniziare a correre senza farsi male', href: 'https://www.vieniacorrere.it/iniziare-a-correre' },
    { label: 'Quanto andare piano nelle uscite facili', href: 'https://www.vieniacorrere.it/correre-piano' },
  ]
  if (showZeroTo5k) {
    readings.push({ label: '10 motivi per iniziare a correre', href: 'https://www.vieniacorrere.it/motivi-per-iniziare-a-correre' })
  }

  return { title, summary, steps, readings, showZeroTo5k, medicalWarning }
}
