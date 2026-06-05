import Image from 'next/image'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <ValuePropsStrip />
        <HowItWorksSection />
        <WhyDifferentSection />
      </main>
      <Footer />
    </div>
  )
}

/* ═══════════════════════════════════════
   HERO
═══════════════════════════════════════ */
function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#FFF7F0]">

      {/* ── Background: immagine runners a sinistra ── */}
      <div className="absolute inset-0 lg:right-[42%] overflow-hidden">
        <Image
          src="/hero.png"
          alt="Runner in un paesaggio al tramonto"
          fill
          priority
          className="object-cover object-center"
          sizes="60vw"
        />
        {/* Sfumatura warm che copre l'immagine verso destra */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FFF7F0]/60 to-[#FFF7F0]" />
        {/* Sfumatura bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#FFF7F0] to-transparent" />
      </div>

      {/* ── Contenuto ── */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* Left — testo */}
          <div className="flex flex-col gap-6">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 self-start border border-orange-300 bg-white/80 backdrop-blur-sm text-orange-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
              <span className="material-symbols-filled text-base">group</span>
              Corri insieme, senza complicazioni
            </div>

            {/* Titolo */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-gray-950 leading-[1.05]">
              Trova qualcuno<br />
              con cui{' '}
              <span className="text-primary italic">correre.</span>
            </h1>

            {/* Sottotitolo */}
            <p className="text-lg sm:text-xl leading-8 text-gray-700 max-w-lg">
              Corriamo è il modo più semplice per proporre un allenamento,
              unirti a una corsa già organizzata o creare appuntamenti
              ricorrenti con altri runner della tua zona.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <Link
                href="/bacheca"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-bold text-white shadow-lg shadow-orange-300/50 hover:bg-primary-hover transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
              >
                <span className="material-symbols-outlined text-lg">search</span>
                Trova una corsa
              </Link>
              <Link
                href="/nuova-corsa"
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-gray-900 bg-white px-8 py-4 text-base font-bold text-gray-900 hover:bg-gray-50 transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                Proponi una corsa
              </Link>
            </div>

            {/* Trust line */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="material-symbols-filled text-red-400 text-base">favorite</span>
              <span>
                Niente feed infinito. Niente classifiche.<br className="sm:hidden" />
                {' '}Solo appuntamenti chiari per correre insieme.
              </span>
            </div>
          </div>

          {/* Right — card corsa in evidenza */}
          <div className="flex justify-center lg:justify-end">
            <HeroRunCard />
          </div>
        </div>
      </div>

      {/* Wave bottom */}
      <div className="relative h-12 -mb-1">
        <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute bottom-0 w-full" preserveAspectRatio="none">
          <path d="M0 48V24C240 0 480 0 720 12C960 24 1200 48 1440 36V48H0Z" fill="#FAFAF9"/>
        </svg>
      </div>
    </section>
  )
}

function HeroRunCard() {
  return (
    <div className="w-full max-w-sm bg-white rounded-3xl border border-gray-200 shadow-2xl shadow-orange-100/60 overflow-hidden">

      {/* Card header */}
      <div className="px-5 pt-5 flex items-start justify-between">
        <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
          <span className="material-symbols-filled text-sm">bolt</span>
          In evidenza
        </span>
        <button className="text-gray-300 hover:text-gray-500 transition-colors" aria-label="Salva">
          <span className="material-symbols-outlined text-xl">bookmark</span>
        </button>
      </div>

      {/* Titolo */}
      <div className="px-5 pt-3 pb-3">
        <h3 className="text-2xl font-extrabold text-gray-900 leading-tight">
          Giro facile<br />al Percorso Verde
        </h3>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
            Facile
          </span>
          <span className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
            No drop
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
            <span className="material-symbols-outlined text-sm">group</span>
            4 runner interessati
          </span>
        </div>
      </div>

      {/* Dati + immagine */}
      <div className="px-5 pb-4 flex gap-4">
        {/* Dati */}
        <div className="flex-1 flex flex-col gap-2">
          {[
            { icon: 'place',          text: 'Perugia – Percorso Verde' },
            { icon: 'calendar_today', text: 'Giovedì 6 giugno' },
            { icon: 'schedule',       text: '18:30' },
            { icon: 'route',          text: '8 km' },
            { icon: 'speed',          text: 'Ritmo 5:45–6:15 /km' },
          ].map(item => (
            <div key={item.icon} className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px] shrink-0">{item.icon}</span>
              <span className="text-sm text-gray-700 font-medium">{item.text}</span>
            </div>
          ))}
        </div>

        {/* Thumbnail */}
        <div className="w-24 h-28 rounded-2xl overflow-hidden shrink-0">
          <Image
            src="/hero1.png"
            alt="Percorso Verde Perugia"
            width={96}
            height={112}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Descrizione */}
      <div className="px-5 pb-4">
        <p className="text-sm text-gray-500 leading-relaxed">
          Allenamento tranquillo, adatto anche a chi vuole riprendere.
          Si parte insieme e si rientra insieme.
        </p>
      </div>

      {/* CTA */}
      <div className="mx-5 mb-5">
        <Link
          href="/bacheca"
          className="flex items-center justify-between w-full bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-2xl px-4 py-3 transition-colors group"
        >
          <span className="text-sm font-bold text-primary">Vedi dettagli</span>
          <span className="material-symbols-outlined text-primary text-xl group-hover:translate-x-1 transition-transform">
            arrow_forward
          </span>
        </Link>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════
   VALUE PROPS STRIP
═══════════════════════════════════════ */
function ValuePropsStrip() {
  const props = [
    { icon: 'group',           color: 'bg-orange-100 text-orange-600', title: 'Corri insieme',         desc: 'Trova runner con i tuoi stessi ritmi e obiettivi' },
    { icon: 'verified_user',   color: 'bg-green-100 text-green-600',   title: 'Sicuro e trasparente',  desc: 'Profili verificati e adesioni chiare e rispettose' },
    { icon: 'event_repeat',    color: 'bg-blue-100 text-blue-600',     title: 'Singole o ricorrenti',  desc: 'Partecipa a corse singole o appuntamenti fissi' },
    { icon: 'location_on',     color: 'bg-purple-100 text-purple-600', title: 'Vicino a te',           desc: 'Scopri le corse nella tua zona in pochi secondi' },
  ]

  return (
    <section className="bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-10">
          {props.map(p => (
            <div key={p.title} className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${p.color}`}>
                <span className="material-symbols-filled text-xl">{p.icon}</span>
              </div>
              <div>
                <p className="text-sm font-extrabold text-gray-900">{p.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-snug">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════
   COME FUNZIONA
═══════════════════════════════════════ */
function HowItWorksSection() {
  const steps = [
    { icon: 'edit_location', number: '01', title: 'Proponi', color: 'bg-orange-100 text-orange-600',
      text: 'Scegli luogo, giorno, orario, distanza e ritmo. Bastano poche informazioni chiare.' },
    { icon: 'travel_explore', number: '02', title: 'Trova', color: 'bg-blue-100 text-blue-600',
      text: 'Scopri le corse disponibili vicino a te e filtra per livello, ritmo o tipo di allenamento.' },
    { icon: 'group', number: '03', title: 'Corri insieme', color: 'bg-green-100 text-green-600',
      text: "Aderisci pubblicamente o contatta l'organizzatore. Niente rumore, solo l'appuntamento giusto." },
  ]

  return (
    <section className="py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Come funziona</h2>
          <p className="mt-3 text-lg text-gray-500">Tre passaggi semplici: proponi, trovi, corri.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map(step => (
            <div key={step.number} className="bg-white rounded-3xl border border-gray-100 p-7 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex flex-col gap-4">
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

/* ═══════════════════════════════════════
   PERCHÉ È DIVERSA
═══════════════════════════════════════ */
function WhyDifferentSection() {
  const points = [
    { icon: 'block',        text: 'Niente feed infinito' },
    { icon: 'emoji_events', text: 'Niente pressione da prestazione' },
    { icon: 'event_repeat', text: 'Corse singole o ricorrenti' },
    { icon: 'lock_open',    text: 'Adesioni pubbliche o private' },
    { icon: 'verified',     text: 'Profili verificabili con Strava, Garmin o social' },
  ]

  return (
    <section className="py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl px-8 py-12 sm:px-14 sm:py-16 overflow-hidden relative">
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
                <Link href="/registrati"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-orange-900/30 hover:bg-primary-hover transition-all duration-200 hover:-translate-y-0.5">
                  Inizia gratis
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </Link>
                <Link href="/bacheca"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-7 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition-all duration-200">
                  Esplora le corse
                </Link>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {points.map(p => (
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
