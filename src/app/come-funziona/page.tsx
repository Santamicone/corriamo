import type { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Come funziona',
  description: 'Scopri come trovare corse, proporre allenamenti, cercare compagni di gara e usare tutte le funzionalità di Vieni a correre?',
  alternates: { canonical: 'https://app.vieniacorrere.it/come-funziona' },
}

export default function ComeFunzionaPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">

        {/* Hero */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center">
            <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
              <span className="material-symbols-outlined text-base">help_outline</span>
              Guida rapida
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
              Come funziona<br />
              <span className="text-primary">Vieni a correre?</span>
            </h1>
            <p className="mt-5 text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
              Una piattaforma semplice per trovare compagni di corsa, organizzare allenamenti
              e connettersi con altri runner. Niente classifiche, niente pressione — solo corse vere.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
              <Link href="/bacheca"
                className="inline-flex items-center justify-center gap-2 bg-primary text-white px-7 py-3.5 rounded-full font-semibold hover:bg-primary-hover transition-colors shadow-sm shadow-orange-200">
                <span className="material-symbols-outlined text-lg">search</span>
                Trova una corsa
              </Link>
              <Link href="/registrati"
                className="inline-flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-700 px-7 py-3.5 rounded-full font-semibold hover:bg-gray-50 transition-colors">
                Registrati gratis
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-16">

          {/* 1 — Trova una corsa */}
          <Section
            number="01"
            color="orange"
            icon="search"
            title="Trova la corsa giusta"
            subtitle="Cerca tra gli allenamenti organizzati dai runner nella tua zona."
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <FeatureCard icon="tune" title="Filtra per quello che ti serve">
                Città, livello di corsa (principiante, intermedio, avanzato), data, distanza e ritmo.
                Puoi salvare il filtro della tua città direttamente nel profilo.
              </FeatureCard>
              <FeatureCard icon="map" title="Vista mappa">
                Passa dalla lista alla mappa per vedere dove si svolgono le corse vicino a te.
                I pin colorati indicano il livello, quelli grigi le corse con luogo riservato.
              </FeatureCard>
              <FeatureCard icon="star" title="Mi interessa">
                Segnala il tuo interesse senza impegnarti. Riceverai una notifica se la corsa
                viene annullata. Puoi passare da &quot;Mi interessa&quot; a &quot;Partecipa&quot; in qualsiasi momento.
              </FeatureCard>
              <FeatureCard icon="directions_run" title="Partecipa">
                Invia una richiesta all&apos;organizzatore con un messaggio opzionale di presentazione.
                L&apos;organizzatore ti approva e poi sei dentro. Semplice.
              </FeatureCard>
            </div>
            <Tip>
              Il badge <strong>Compatibilità</strong> (es. &quot;93% · Perfetta per te&quot;) appare quando
              il tuo profilo è abbastanza ricco da calcolare la compatibilità con ritmo, livello e città.
            </Tip>
          </Section>

          {/* 2 — Organizza */}
          <Section
            number="02"
            color="green"
            icon="add_circle"
            title="Proponi un allenamento"
            subtitle="Crea una corsa singola o una serie ricorrente in pochi passaggi."
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <FeatureCard icon="directions_run" title="Corsa singola">
                Un appuntamento in una data specifica. Scegli luogo, orario, distanza e ritmo.
                La mappa posiziona il pin automaticamente tramite geocoding.
              </FeatureCard>
              <FeatureCard icon="event_repeat" title="Serie ricorrente">
                Appuntamenti fissi (settimanali, bisettimanali o mensili). Il sistema genera
                automaticamente i prossimi 8 appuntamenti dalla data di inizio.
              </FeatureCard>
              <FeatureCard icon="lock" title="Luogo privato">
                Puoi scegliere di rendere il luogo di ritrovo visibile solo ai partecipanti approvati.
                Sulla mappa apparirà un pin generico sulla città.
              </FeatureCard>
              <FeatureCard icon="chat_bubble" title="Chat di gruppo">
                Una volta approvati, i partecipanti hanno accesso a una chat di gruppo in tempo reale.
                Utile per coordinare i dettagli dell&apos;appuntamento.
              </FeatureCard>
            </div>
            <Tip>
              Dopo la corsa, i partecipanti possono caricare un <strong>Momento</strong> (foto + testo)
              e lasciare una <strong>recensione</strong> all&apos;organizzatore.
            </Tip>
          </Section>

          {/* 3 — Sono qui */}
          <Section
            number="03"
            color="purple"
            icon="location_on"
            title="Sono qui — Attiva il segnale di ritrovo"
            subtitle="Il momento del ritrovarsi tra sconosciuti è la fase più delicata. Abbiamo risolto così."
          >
            {/* Demo visiva — schermo colorato */}
            <div className="rounded-3xl overflow-hidden bg-[#7C3AED] p-8 sm:p-10 flex flex-col sm:flex-row items-center gap-8 sm:gap-12">
              {/* Mockup schermo */}
              <div className="shrink-0 flex flex-col items-center gap-4 text-white text-center">
                <span className="material-symbols-filled" style={{ fontSize: 72, opacity: 0.9 }}>directions_run</span>
                <div>
                  <p className="font-extrabold text-lg">Mattinata al Sempione</p>
                  <p className="text-sm opacity-70">Sab 14 giugno · 07:30</p>
                </div>
                <div className="flex gap-2 mt-1">
                  {[true, true, false, false, false].map((filled, i) => (
                    <span key={i} className={`w-3.5 h-3.5 rounded-full border-2 border-white ${filled ? 'bg-white' : 'bg-transparent opacity-40'}`} />
                  ))}
                </div>
                <p className="text-sm opacity-80 font-semibold">2 runner qui</p>
                <div className="mt-1 px-5 py-2.5 rounded-full bg-white/20 border border-white/30 text-sm font-bold">
                  Ho trovato il gruppo ✓
                </div>
              </div>

              {/* Spiegazione */}
              <div className="text-white flex flex-col gap-4">
                <p className="text-base sm:text-lg font-bold leading-snug">
                  Ogni corsa ha un colore unico. Quando arrivi al punto di ritrovo, apri la pagina della corsa e tap su <span className="underline decoration-white/50">Sono qui</span>.
                </p>
                <p className="text-sm sm:text-base opacity-85 leading-relaxed">
                  Lo schermo del tuo smartphone si illumina interamente del colore assegnato alla corsa — un segnale luminoso visibile a decine di metri. Gli altri partecipanti fanno lo stesso: vi riconoscete a colpo d&apos;occhio, senza bisogno di guardarvi intorno imbarazzati.
                </p>
                <p className="text-sm opacity-70 leading-relaxed">
                  Il contatore si aggiorna in tempo reale man mano che gli altri runner arrivano. Quando siete tutti, partite.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <FeatureCard icon="visibility" title="Visibile da lontano">
                Il colore dello schermo è un segnale luminoso riconoscibile a decine di metri,
                anche in un parco affollato o in una piazza.
              </FeatureCard>
              <FeatureCard icon="group" title="Counter live">
                Vedi in tempo reale quanti partecipanti sono già arrivati.
                Niente attese in silenzio — sai subito se sei il primo o se mancano altri.
              </FeatureCard>
              <FeatureCard icon="brightness_high" title="Schermo sempre acceso">
                Mentre il segnale è attivo, lo schermo non si spegne automaticamente.
                Tienilo in mano e aspetta: gli altri ti vedranno.
              </FeatureCard>
            </div>

            <Tip>
              Il pulsante <strong>Sono qui</strong> appare nella pagina della corsa solo nella finestra
              temporale: da <strong>60 minuti prima</strong> fino a 30 minuti dopo l&apos;orario di partenza.
              Accessibile solo a organizzatore e partecipanti approvati.
            </Tip>
          </Section>

          {/* 4 — Gare */}
          <Section
            number="04"
            color="indigo"
            icon="emoji_events"
            title="Cerca compagni di gara"
            subtitle="Non correre la maratona o la 10K da solo — trova chi partecipa alla stessa gara."
          >
            <div className="grid sm:grid-cols-3 gap-4">
              <FeatureCard icon="speed" title="Pacer">
                Qualcuno che corre al tuo ritmo e ti aiuta a mantenere la velocità target
                per tutto il percorso.
              </FeatureCard>
              <FeatureCard icon="group" title="Compagno di gara">
                Un runner con obiettivo simile al tuo per condividere la fatica e mantenersi
                motivati durante la gara.
              </FeatureCard>
              <FeatureCard icon="volunteer_activism" title="Supporter">
                Qualcuno che ti inciti lungo il percorso nei momenti chiave — ai rifornimenti,
                agli ultimi chilometri.
              </FeatureCard>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mt-2">
              <span className="font-semibold text-indigo-700">Come funziona:</span>{' '}
              pubblica un post indicando il nome della gara, la distanza (5K, 10K, mezza o maratona),
              il tuo tempo obiettivo e cosa stai cercando. Chi è interessato ti contatterà direttamente.
            </p>
          </Section>

          {/* 5 — Corse dell'ultimo momento */}
          <Section
            number="05"
            color="red"
            icon="bolt"
            title="Corse dell'ultimo momento"
            subtitle="La striscia &quot;Adesso&quot; mostra le corse che partono entro 3 ore, vicino a te."
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <FeatureCard icon="near_me" title="Geolocalizzazione">
                La striscia usa la tua posizione (con il tuo consenso) per mostrare le corse
                più vicine a te in questo momento.
              </FeatureCard>
              <FeatureCard icon="timer" title="Forma rapida">
                Vuoi organizzare una corsa spontanea? Usa il form &quot;Adesso&quot; — ha i campi
                pre-compilati e richiede meno di 30 secondi.
              </FeatureCard>
            </div>
          </Section>

          {/* 6 — Profilo */}
          <Section
            number="06"
            color="purple"
            icon="person"
            title="Il tuo profilo runner"
            subtitle="Un profilo ricco aiuta gli altri a capire se siete compatibili — e migliora il calcolo di compatibilità."
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <FeatureCard icon="fitness_center" title="Livello e Personal Best">
                Indica il tuo livello (da principiante ad atleta agonista) e i tuoi PB su 5K, 10K,
                mezza e maratona. Gli altri runner capiscono subito se il ritmo è compatibile.
              </FeatureCard>
              <FeatureCard icon="sentiment_very_satisfied" title="Perché corri?">
                Scegli tra 7 motivi: forma fisica, divertimento, prestazioni, amicizia, benessere
                mentale, gare, sfida. Aiuta a trovare runner con la stessa mentalità.
              </FeatureCard>
              <FeatureCard icon="location_on" title="Filtro città automatico">
                Abilita &quot;Mostra solo le corse della mia città&quot; nel profilo per vedere subito
                le corse nella tua zona ogni volta che apri la bacheca.
              </FeatureCard>
              <FeatureCard icon="verified" title="Link Strava, Garmin, Instagram">
                Collega i tuoi profili per essere verificabile. Aiuta l&apos;organizzatore
                a conoscerti prima di approvarti.
              </FeatureCard>
            </div>
          </Section>

          {/* 7 — Crew */}
          <Section
            number="07"
            color="green"
            icon="groups"
            title="Corri con la tua crew"
            subtitle="Crea o entra in un gruppo fisso — squadra di allenamento, running club o gruppo di amici."
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <FeatureCard icon="group_add" title="Tre tipi di crew">
                <strong>Squadra di allenamento</strong> con coach, <strong>Running club</strong> per uscite e gare organizzate,
                o <strong>Gruppo di amici</strong> per correre in modo informale. Scegli il formato che si adatta al tuo modo di correre.
              </FeatureCard>
              <FeatureCard icon="lock" title="Corse riservate ai membri">
                Organizza corse visibili solo ai membri della tua crew. Sulla bacheca pubblica non appariranno:
                solo chi fa parte del gruppo può vederle e iscriversi.
              </FeatureCard>
              <FeatureCard icon="link" title="Invita con un link">
                Condividi un link di invito diretto con chi vuoi — il link porta direttamente alla pagina crew
                dove il nuovo membro può richiedere di entrare.
              </FeatureCard>
              <FeatureCard icon="manage_accounts" title="Ruoli: owner, admin, membro">
                L&apos;owner gestisce tutto. Gli admin possono approvare le richieste di ingresso e aggiungere
                direttamente nuovi membri per nome. I membri partecipano alle corse riservate.
              </FeatureCard>
            </div>
            <Tip>
              Per creare una crew vai su <strong>Area personale → Crew → Crea crew</strong>.
              Le crew pubbliche sono visibili a tutti; quelle private sono accessibili solo tramite link diretto.
            </Tip>
          </Section>

          {/* CTA finale */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl px-8 py-12 text-center flex flex-col items-center gap-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <h2 className="text-3xl font-extrabold text-white">Pronto a correre insieme?</h2>
              <p className="text-gray-400 mt-3 max-w-md mx-auto">
                Registrati gratuitamente e trova o proponi la tua prossima corsa in pochi secondi.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                <Link href="/registrati"
                  className="inline-flex items-center justify-center gap-2 bg-primary text-white px-7 py-3.5 rounded-full font-semibold hover:bg-primary-hover transition-colors shadow-lg shadow-orange-900/30">
                  Inizia gratis
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </Link>
                <Link href="/bacheca"
                  className="inline-flex items-center justify-center gap-2 border border-white/20 text-white px-7 py-3.5 rounded-full font-semibold hover:bg-white/10 transition-colors">
                  Esplora le corse
                </Link>
              </div>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  )
}

/* ── Componenti locali ── */

const COLOR_MAP: Record<string, { badge: string; icon: string; num: string }> = {
  orange: { badge: 'bg-orange-100 text-orange-700', icon: 'text-primary',   num: 'text-orange-100' },
  green:  { badge: 'bg-green-100 text-green-700',   icon: 'text-tertiary',  num: 'text-green-100'  },
  indigo: { badge: 'bg-indigo-100 text-indigo-700', icon: 'text-indigo-500', num: 'text-indigo-100' },
  red:    { badge: 'bg-red-100 text-red-700',       icon: 'text-red-500',   num: 'text-red-100'    },
  purple: { badge: 'bg-purple-100 text-purple-700', icon: 'text-purple-500', num: 'text-purple-100' },
}

function Section({ number, color, icon, title, subtitle, children }: {
  number: string
  color: string
  icon: string
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.orange
  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-start gap-4">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${c.badge} shrink-0`}>
          <span className={`material-symbols-outlined text-base ${c.icon}`}>{icon}</span>
          {number}
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900">{title}</h2>
          <p className="text-gray-500 mt-1 leading-relaxed">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

function FeatureCard({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-xl">{icon}</span>
        <h3 className="text-sm font-extrabold text-gray-900">{title}</h3>
      </div>
      <p className="text-sm text-gray-500 leading-relaxed">{children}</p>
    </div>
  )
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3.5">
      <span className="material-symbols-outlined text-primary text-lg shrink-0">lightbulb</span>
      <p className="text-sm text-orange-800 leading-relaxed">{children}</p>
    </div>
  )
}
