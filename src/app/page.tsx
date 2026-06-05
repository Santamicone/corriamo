import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <HowItWorksSection />
        <WhyDifferentSection />
      </main>
      <Footer />
    </div>
  )
}

/* ─────────────────────────────────────────
   HERO
───────────────────────────────────────── */
function HeroSection() {
  return (
    <section className="relative overflow-hidden py-16 sm:py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left — copy */}
          <div className="flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 self-start bg-orange-100 text-orange-700 px-4 py-1.5 rounded-full text-sm font-semibold">
              <span className="material-symbols-outlined text-base">directions_run</span>
              Corri insieme, senza complicazioni
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-950 leading-tight">
              Trova qualcuno<br />
              <span className="text-primary">con cui correre.</span>
            </h1>

            <p className="text-lg sm:text-xl leading-8 text-gray-600 max-w-xl">
              Il modo più semplice per proporre un allenamento, unirti a una corsa già organizzata o creare appuntamenti ricorrenti con altri runner della tua zona.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href="/bacheca"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-orange-200 hover:bg-primary-hover transition-all duration-200 hover:-translate-y-0.5"
              >
                <span className="material-symbols-outlined text-lg">search</span>
                Trova una corsa
              </Link>
              <Link
                href="/nuova-corsa"
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-gray-200 bg-white px-7 py-3.5 text-base font-semibold text-gray-900 hover:border-primary hover:text-primary transition-all duration-200"
              >
                <span className="material-symbols-outlined text-lg">add_circle</span>
                Proponi una corsa
              </Link>
            </div>

            <p className="text-sm text-gray-400 leading-relaxed">
              Niente feed infinito. Niente classifiche.<br />
              Solo appuntamenti chiari per correre insieme.
            </p>
          </div>

          {/* Right — preview card */}
          <div className="relative flex justify-center lg:justify-end">
            {/* Decorative blobs */}
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-orange-100 rounded-full blur-3xl opacity-60 pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-green-100 rounded-full blur-3xl opacity-50 pointer-events-none" />

            <div className="relative w-full max-w-sm">
              <HeroCard />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function HeroCard() {
  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl shadow-orange-100/50 overflow-hidden">
      {/* Accent top bar */}
      <div className="h-1.5 bg-gradient-to-r from-orange-500 to-orange-400" />

      <div className="p-6 flex flex-col gap-4">
        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            Facile
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
            No drop
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
            <span className="material-symbols-outlined text-sm">group</span>
            4 runner interessati
          </span>
        </div>

        {/* Title */}
        <div>
          <h3 className="text-lg font-extrabold text-gray-900 leading-snug">
            Giro facile al Percorso Verde
          </h3>
          <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
            Allenamento tranquillo, adatto anche a chi vuole riprendere. Si parte insieme e si rientra insieme.
          </p>
        </div>

        {/* Data pills */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: 'place',     value: 'Perugia' },
            { icon: 'schedule', value: 'Giovedì · 18:30' },
            { icon: 'route',    value: '8 km' },
            { icon: 'speed',    value: '5:45–6:15/km' },
          ].map(item => (
            <div key={item.icon} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
              <span className="material-symbols-outlined text-primary text-base shrink-0">{item.icon}</span>
              <span className="text-xs font-semibold text-gray-700 truncate">{item.value}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-700">
              MS
            </div>
            <span className="text-xs font-medium text-gray-600">Massimo S.</span>
          </div>
          <Link
            href="/bacheca"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Vedi dettagli
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   COME FUNZIONA
───────────────────────────────────────── */
function HowItWorksSection() {
  const steps = [
    {
      icon: 'edit_location',
      number: '01',
      title: 'Proponi',
      text: 'Scegli luogo, giorno, orario, distanza e ritmo. Bastano poche informazioni chiare.',
      color: 'bg-orange-100 text-orange-600',
    },
    {
      icon: 'travel_explore',
      number: '02',
      title: 'Trova',
      text: 'Scopri le corse disponibili vicino a te e filtra per livello, ritmo o tipo di allenamento.',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      icon: 'group',
      number: '03',
      title: 'Corri insieme',
      text: "Aderisci pubblicamente o contatta l'organizzatore. Niente rumore, solo l'appuntamento giusto.",
      color: 'bg-green-100 text-green-600',
    },
  ]

  return (
    <section className="py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Come funziona</h2>
          <p className="mt-3 text-lg text-gray-500">Tre passaggi semplici: proponi, trovi, corri.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step) => (
            <div
              key={step.number}
              className="bg-white rounded-3xl border border-gray-100 p-7 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex flex-col gap-4"
            >
              <div className="flex items-start justify-between">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${step.color}`}>
                  <span className="material-symbols-outlined text-2xl">{step.icon}</span>
                </div>
                <span className="text-4xl font-black text-gray-100">{step.number}</span>
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-gray-900">{step.title}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">{step.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────
   PERCHÉ È DIVERSA
───────────────────────────────────────── */
function WhyDifferentSection() {
  const points = [
    { icon: 'block',          text: 'Niente feed infinito' },
    { icon: 'emoji_events',   text: 'Niente pressione da prestazione' },
    { icon: 'event_repeat',   text: 'Corse singole o ricorrenti' },
    { icon: 'lock_open',      text: 'Adesioni pubbliche o private' },
    { icon: 'verified',       text: 'Profili verificabili con Strava, Garmin o social' },
  ]

  return (
    <section className="py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl px-8 py-12 sm:px-14 sm:py-16 overflow-hidden relative">
          {/* Decorative */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="inline-flex items-center gap-2 bg-orange-500/20 text-orange-400 px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
                <span className="material-symbols-outlined text-base">auto_awesome</span>
                La differenza
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
                Pensata per correre,<br />non per scrollare.
              </h2>
              <p className="mt-5 text-lg text-gray-400 leading-relaxed">
                Elimina il superfluo: niente feed infinito, niente classifiche inutili, niente pressione. Solo corse vere, con persone vere.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/registrati"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-orange-900/30 hover:bg-primary-hover transition-all duration-200 hover:-translate-y-0.5"
                >
                  Inizia gratis
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </Link>
                <Link
                  href="/bacheca"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-7 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition-all duration-200"
                >
                  Esplora le corse
                </Link>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {points.map((p) => (
                <div key={p.text} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5">
                  <span className="material-symbols-filled text-primary text-xl shrink-0">{p.icon}</span>
                  <span className="text-base text-white font-medium">{p.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
