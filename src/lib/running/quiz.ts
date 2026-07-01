/**
 * Quiz "Da dove inizio?" — flusso a step con esito personalizzato.
 *
 * Struttura DICHIARATIVA: gli step sono dati, non UI. Per aggiungere o
 * modificare una domanda basta toccare QUIZ_STEPS; per cambiare gli esiti,
 * solo computeOutcome(). Il componente non va riscritto.
 *
 * Tipi di step supportati:
 *  - 'single' (default): una sola risposta, il tap avanza da solo.
 *  - 'multi': più risposte selezionabili, si avanza con "Continua".
 *  - 'form':  scheda con più campi (numeri e menù), si avanza con "Continua".
 *
 * Le letture consigliate puntano agli articoli del sito editoriale.
 */

export interface QuizOption {
  value: string
  label: string
  icon: string
}

export type QuizFieldType = 'number' | 'select'

export interface QuizField {
  id: string
  label: string
  type: QuizFieldType
  /** Campo compilabile ma non obbligatorio per proseguire. */
  optional?: boolean
  // number
  suffix?: string
  placeholder?: string
  min?: number
  max?: number
  // select
  options?: { value: string; label: string }[]
}

export type QuizStepKind = 'single' | 'multi' | 'form'

export interface QuizStep {
  id: string
  /** Default 'single'. */
  kind?: QuizStepKind
  question: string
  help?: string
  /** Per 'single' e 'multi'. */
  options?: QuizOption[]
  /** Per 'form'. */
  fields?: QuizField[]
}

/** Ogni risposta è una stringa (single/form) o una lista (multi). */
export type Answers = Record<string, string | string[]>

export const QUIZ_STEPS: QuizStep[] = [
  {
    id: 'profilo',
    kind: 'form',
    question: 'Partiamo da te',
    help: 'Due dati veloci per tarare i consigli. Restano sul tuo telefono, non li salviamo.',
    fields: [
      {
        id: 'eta',
        label: 'Quanti anni hai?',
        type: 'number',
        suffix: 'anni',
        placeholder: 'es. 38',
        min: 12,
        max: 99,
      },
      {
        id: 'peso',
        label: 'Quanto pesi? (facoltativo)',
        type: 'number',
        suffix: 'kg',
        placeholder: 'es. 74',
        min: 30,
        max: 250,
        optional: true,
      },
      {
        id: 'sportPast',
        label: 'Hai fatto sport in passato?',
        type: 'select',
        options: [
          { value: 'mai',     label: 'No, praticamente mai' },
          { value: 'giovane', label: 'Sì, da ragazzo/a' },
          { value: 'si',      label: 'Sì, con continuità' },
        ],
      },
      {
        id: 'sportNow',
        label: 'Fai altri sport adesso?',
        type: 'select',
        options: [
          { value: 'no',        label: 'No, nessuno' },
          { value: 'ogni_tanto', label: 'Ogni tanto, senza costanza' },
          { value: 'si',        label: 'Sì, regolarmente' },
        ],
      },
    ],
  },
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
  {
    id: 'blocks',
    kind: 'multi',
    question: 'Cosa ti ha frenato finora?',
    help: 'Scegli tutto quello in cui ti riconosci. Ti diamo un modo per superarlo.',
    options: [
      { value: 'non_piace',   label: 'Non mi piace correre',        icon: 'mood_bad' },
      { value: 'goffo',       label: 'Mi sento goffo/a',            icon: 'accessibility_new' },
      { value: 'fiato',       label: 'Mi manca subito il fiato',    icon: 'air' },
      { value: 'tempo',       label: 'Non ho tempo',               icon: 'schedule' },
      { value: 'sveglia',     label: 'Non voglio svegliarmi presto', icon: 'bedtime' },
      { value: 'giudizio',    label: 'Temo il giudizio degli altri', icon: 'visibility' },
      { value: 'solo',        label: 'Da solo/a mi annoio',        icon: 'sentiment_dissatisfied' },
      { value: 'mai_pensato', label: 'Non ci avevo mai pensato',   icon: 'lightbulb' },
    ],
  },
]

export interface QuizReading {
  label: string
  href: string
}

export interface QuizBlockTip {
  label: string
  tip: string
}

export interface QuizOutcome {
  title: string
  summary: string
  /** Nota personalizzata sul punto di partenza (età / storia sportiva). */
  profileNote?: string
  /** Il piano: cosa fare, passo per passo. */
  steps: string[]
  /** Primi piccoli obiettivi concreti da spuntare. */
  microGoals: string[]
  /** Come superare i blocchi dichiarati. */
  blockTips: QuizBlockTip[]
  /** Trucchi per non mollare. */
  keepGoing: string[]
  readings: QuizReading[]
  /** Mostra l'invito al programma "Da zero a 5K". */
  showZeroTo5k: boolean
  /** Mostra l'avviso prudenza/medico in evidenza. */
  medicalWarning: boolean
}

/** Consigli per superare ciascun blocco dichiarato. */
const BLOCK_TIPS: Record<string, QuizBlockTip> = {
  non_piace: {
    label: 'Non ti piace correre',
    tip: 'Non devi amarla subito. Parti con cammina-corri di 20 minuti su un percorso che ti piace (parco, lungomare, musica nelle orecchie). Il piacere arriva dopo 3-4 settimane, quando smetti di soffrire e inizi a sentirti bene dopo.',
  },
  goffo: {
    label: 'Ti senti goffo/a',
    tip: 'È solo mancanza di abitudine e sparisce in fretta. Corri lento, spalle rilassate, sguardo avanti e passi corti. Dopo poche uscite il gesto diventa naturale — e ricorda: nessuno ti sta guardando.',
  },
  fiato: {
    label: 'Ti manca il fiato',
    tip: 'Il fiato corto all\'inizio vuol dire solo che stai andando troppo forte. Rallenta fino a poter parlare mentre corri. Con il metodo cammina-corri il fiato cresce settimana dopo settimana.',
  },
  tempo: {
    label: 'Non hai tempo',
    tip: 'Bastano 25-30 minuti, 3 volte a settimana. Mettili in agenda come un appuntamento fisso e non spostabile. Conta anche i minuti per arrivare al parco: sono già movimento.',
  },
  sveglia: {
    label: 'Non vuoi svegliarti presto',
    tip: 'La corsa migliore è quella che riesci davvero a fare. Pausa pranzo o sera vanno benissimo: scegli l\'orario che ti pesa meno e trasformalo nella tua routine.',
  },
  giudizio: {
    label: 'Temi il giudizio',
    tip: 'Chi corre rispetta chi inizia, senza eccezioni. Finché non prendi confidenza scegli orari o percorsi più tranquilli. In poche settimane l\'imbarazzo lascia il posto all\'orgoglio.',
  },
  solo: {
    label: 'Da solo/a ti annoi',
    tip: 'Cerca compagnia: su Vieni a correre? trovi gruppi "no drop" della tua zona, dove nessuno resta indietro. Un appuntamento con qualcuno si salta molto meno di uno con te stesso.',
  },
  mai_pensato: {
    label: 'Non ci avevi mai pensato',
    tip: 'Allora sei nel momento perfetto: nessuna aspettativa, nessun record da battere. Parti curioso/a, un\'uscita alla volta, e lascia che sia il corpo a chiederti la prossima.',
  },
}

function asArray(v: string | string[] | undefined): string[] {
  if (!v) return []
  return Array.isArray(v) ? v : [v]
}

export function computeOutcome(a: Answers): QuizOutcome {
  const pain = a.pain as string | undefined
  const can10 = a.can10 as string | undefined
  const goal = a.goal as string | undefined
  const freq = a.freq as string | undefined
  const sportPast = a.sportPast as string | undefined
  const sportNow = a.sportNow as string | undefined
  const eta = a.eta ? Number(a.eta) : undefined

  const medicalWarning = pain === 'spesso'
  const beginner = can10 === 'no'
  const fewDays = freq === 'low'

  // ── Nota sul punto di partenza (profilo) ──
  let profileNote: string | undefined
  if (sportNow === 'si') {
    profileNote =
      'Fai già sport con regolarità: hai un motore allenato. La corsa userà muscoli e articolazioni in modo nuovo, quindi parti comunque graduale, ma la base ce l\'hai.'
  } else if (sportPast === 'si' || sportPast === 'giovane') {
    profileNote =
      'Hai un passato sportivo: il corpo "ricorda". Riparti con calma senza voler subito tornare ai livelli di un tempo — nelle prime settimane conta la costanza, non l\'intensità.'
  } else if (sportPast === 'mai' && (sportNow === 'no' || !sportNow)) {
    profileNote =
      'Parti praticamente da zero: è il punto di partenza più comune e va benissimo. Andando piano e con gradualità il corpo si adatta bene. Nessuna fretta.'
  }
  if (eta !== undefined && eta >= 55 && !profileNote?.includes('graduale')) {
    profileNote =
      (profileNote ? profileNote + ' ' : '') +
      'Alla tua età la corsa fa benissimo: aumenta i carichi con ancora più gradualità e, se non lo fai da tempo, valuta un check-up prima di partire.'
  }

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
      'Chiudi ogni uscita con 5 minuti di camminata e due allunghi dolci sui muscoli.',
    ]
    showZeroTo5k = true
  } else if (goal === 'prima5k') {
    title = 'Verso la tua prima 5K'
    summary =
      'Hai già la base aerobica per puntare ai 5 km. Ora serve costanza e un pizzico di progressione: ' +
      'in 6-8 settimane la prima 5K corsa di fila è un obiettivo realistico.'
    steps = [
      'Fai 3 uscite a settimana: due facili e una un po\' più lunga.',
      'Aumenta la durata del lungo del 10% circa a settimana, senza strappi.',
      'Tieni la maggior parte delle uscite a ritmo conversazione.',
      'Ogni 3-4 settimane alleggerisci: una settimana più scarica fa assimilare il lavoro.',
      'Usa il calcolatore zone di passo per trovare i tuoi ritmi.',
    ]
    showZeroTo5k = true
  } else if (goal === 'dimagrire') {
    title = 'Corsa per stare meglio col tuo peso'
    summary =
      'La corsa funziona per il peso quando è costante e sostenibile, non quando è massacrante. ' +
      'Meglio tante uscite facili che poche durissime: bruci di più e ti fai meno male.'
    steps = [
      'Punta sul volume facile: corse lente e lunghe, a ritmo comodo.',
      `Cerca di muoverti ${fewDays ? '3' : '4'} volte a settimana, anche con camminate veloci.`,
      'Abbina costanza alimentare: la corsa da sola non basta.',
      'Misura i progressi sulle settimane, non sul singolo allenamento né sulla bilancia di oggi.',
    ]
  } else if (goal === 'compagnia') {
    title = 'Corri in compagnia'
    summary =
      'Il modo migliore per non mollare è avere qualcuno che ti aspetta. ' +
      'Su Vieni a correre? trovi runner della tua zona con il tuo stesso passo, senza classifiche né competizione.'
    steps = [
      'Cerca corse facili e "no drop" vicino a te: nessuno resta indietro.',
      'Parti da uscite brevi con il gruppo, poi aumenta gradualmente.',
      'Concorda il ritmo prima di partire: deve essere comodo per tutti.',
      'Fissa un appuntamento fisso settimanale: la regolarità nasce lì.',
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

  // ── Primi piccoli obiettivi: spezzare il traguardo in tappe raggiungibili ──
  const microGoals: string[] = [
    'Questa settimana: esci 2 volte, anche solo 20 minuti. Fatto è meglio che perfetto.',
    beginner
      ? 'Prossimo traguardo: correre 5 minuti di fila senza fermarti.'
      : 'Prossimo traguardo: aggiungere 5 minuti alla tua uscita più lunga.',
  ]
  if (goal === 'prima5k') {
    microGoals.push('Traguardo del mese: completare 3 km corsi di fila, con calma.')
  } else if (goal === 'dimagrire' || goal === 'salute') {
    microGoals.push('Traguardo del mese: 10 uscite messe insieme. Conta le crocette, non i chili.')
  } else {
    microGoals.push('Traguardo del mese: non saltare mai due volte di fila.')
  }

  // ── Come superare i blocchi dichiarati ──
  const blockTips: QuizBlockTip[] = asArray(a.blocks)
    .map((b) => BLOCK_TIPS[b])
    .filter((t): t is QuizBlockTip => Boolean(t))

  // ── Modi per non mollare ──
  const keepGoing: string[] = [
    'Segna ogni uscita su un calendario: vedere la fila di crocette ti spinge a non spezzarla.',
    'Prepara la sera prima scarpe e vestiti: al momento di uscire avrai una scusa in meno.',
    'Punta al "presentarti", non alla prestazione: se esci hai già vinto, com\'è andata conta poco.',
    'Se salti un giorno non buttare la settimana: riparti alla prossima uscita, senza sensi di colpa.',
  ]
  if (goal === 'compagnia' || asArray(a.blocks).includes('solo')) {
    keepGoing.push('Datti appuntamento con qualcuno: un impegno preso con un altro si salta molto meno.')
  }

  // ── Letture consigliate (articoli editoriali) ──
  const readings: QuizReading[] = [
    { label: 'Come iniziare a correre senza farsi male', href: 'https://www.vieniacorrere.it/iniziare-a-correre' },
    { label: 'Quanto andare piano nelle uscite facili', href: 'https://www.vieniacorrere.it/correre-piano' },
  ]
  if (showZeroTo5k) {
    readings.push({ label: '10 motivi per iniziare a correre', href: 'https://www.vieniacorrere.it/motivi-per-iniziare-a-correre' })
  }

  return {
    title,
    summary,
    profileNote,
    steps,
    microGoals,
    blockTips,
    keepGoing,
    readings,
    showZeroTo5k,
    medicalWarning,
  }
}
