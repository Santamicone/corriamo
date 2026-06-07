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
        <WhyUsSection />
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

      {/* Background media — solo sul lato sinistro da lg */}
      <div className="absolute inset-0 lg:right-[45%] overflow-hidden">
        <video
          autoPlay muted loop playsInline preload="none" poster="/hero.png"
          className="hidden lg:block absolute inset-0 w-full h-full object-cover object-center"
          aria-hidden="true"
        >
          <source src="/hero.mp4" type="video/mp4" />
        </video>
        <Image
          src="/hero.png"
          alt="Runner in un paesaggio al tramonto"
          fill priority
          className="lg:hidden object-cover object-top"
          sizes="100vw"
        />
        {/* Gradienti */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FFF7F0]/50 to-[#FFF7F0]" />
        <div className="absolute inset-0 lg:hidden bg-gradient-to-b from-[#FFF7F0]/30 via-transparent to-[#FFF7F0]" />
      </div>

      {/* Contenuto */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8 sm:pt-24 sm:pb-10 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* Testo */}
          <div className="flex flex-col gap-5 sm:gap-6">
            <div className="inline-flex items-center gap-2 self-start border border-orange-300 bg-white/80 backdrop-blur-sm text-orange-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
              <span className="material-symbols-filled text-base">group</span>
              Corri insieme, senza complicazioni
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black tracking-tight text-gray-950 leading-[1.05]">
              Trova qualcuno<br />
              con cui{' '}
              <span className="text-primary italic">correre.</span>
            </h1>

            <p className="text-base sm:text-lg leading-7 sm:leading-8 text-gray-700 max-w-lg">
              Il modo più semplice per proporre un allenamento,
              unirti a una corsa già organizzata o creare appuntamenti
              ricorrenti con altri runner della tua zona.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/bacheca"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-orange-300/50 hover:bg-primary-hover transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
              >
                <span className="material-symbols-outlined text-lg">search</span>
                Trova una corsa
              </Link>
              <Link
                href="/nuova-corsa"
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-gray-900 bg-white/80 backdrop-blur-sm px-7 py-3.5 text-base font-bold text-gray-900 hover:bg-white transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                Proponi una corsa
              </Link>
            </div>

            <div className="flex items-start gap-2 text-sm text-gray-500 pt-1">
              <span className="material-symbols-filled text-red-400 text-base shrink-0 mt-0.5">favorite</span>
              <span>Niente classifiche, nessuna competizione. Solo appuntamenti chiari per correre insieme.</span>
            </div>
          </div>

          {/* Card corsa */}
          <div className="flex justify-center lg:justify-end">
            <HeroRunCard />
          </div>
        </div>
      </div>

      {/* Wave */}
      <div className="relative h-10 -mb-1">
        <svg viewBox="0 0 1440 40" fill="none" xmlns="http://www.w3.org/2000/svg"
             className="absolute bottom-0 w-full" preserveAspectRatio="none">
          <path d="M0 40V20C240 0 480 0 720 10C960 20 1200 40 1440 30V40H0Z" fill="#FAFAF9"/>
        </svg>
      </div>
    </section>
  )
}

function HeroRunCard() {
  return (
    <div className="w-full max-w-[340px] bg-white rounded-3xl border border-gray-200 shadow-2xl shadow-orange-100/60 overflow-hidden">
      <div className="px-5 pt-5 flex items-start justify-between">
        <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
          <span className="material-symbols-filled text-sm">bolt</span>
          In evidenza
        </span>
      </div>

      <div className="px-5 pt-3 pb-3">
        <h3 className="text-xl font-extrabold text-gray-900 leading-tight">
          Giro facile al Percorso Verde
        </h3>
        <div className="flex flex-wrap gap-2 mt-2.5">
          <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">Facile</span>
          <span className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">No drop</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
            <span className="material-symbols-outlined text-sm">group</span>
            4 runner
          </span>
        </div>
      </div>

      <div className="px-5 pb-4 flex gap-4">
        <div className="flex-1 flex flex-col gap-2">
          {[
            { icon: 'place',          text: 'Perugia – Percorso Verde' },
            { icon: 'calendar_today', text: 'Sabato mattina' },
            { icon: 'schedule',       text: '07:30' },
            { icon: 'route',          text: '10 km' },
            { icon: 'speed',          text: '5:30–6:00 /km' },
          ].map(item => (
            <div key={item.icon} className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[17px] shrink-0">{item.icon}</span>
              <span className="text-sm text-gray-700 font-medium">{item.text}</span>
            </div>
          ))}
        </div>
        <div className="w-20 h-24 rounded-2xl overflow-hidden shrink-0">
          <Image src="/hero1.png" alt="Percorso Verde" width={80} height={96}
            className="w-full h-full object-cover" />
        </div>
      </div>

      <div className="mx-5 mb-5">
        <Link href="/bacheca"
          className="flex items-center justify-between w-full bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-2xl px-4 py-3 transition-colors group">
          <span className="text-sm font-bold text-primary">Vedi le corse disponibili</span>
          <span className="material-symbols-outlined text-primary text-xl group-hover:translate-x-1 transition-transform">arrow_forward</span>
        </Link>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════
   VALUE PROPS
═══════════════════════════════════════ */
function ValuePropsStrip() {
  const props = [
    { icon: 'group',         color: 'bg-orange-100 text-orange-600', title: 'Corri insieme',        desc: 'Trova runner con ritmi e obiettivi simili ai tuoi' },
    { icon: 'verified_user', color: 'bg-green-100 text-green-600',   title: 'Sicuro e trasparente', desc: 'Profili verificabili e adesioni rispettose' },
    { icon: 'event_repeat',  color: 'bg-blue-100 text-blue-600',     title: 'Singole o ricorrenti', desc: 'Corse una tantum o appuntamenti fissi settimanali' },
    { icon: 'location_on',   color: 'bg-purple-100 text-purple-600', title: 'Vicino a te',          desc: 'Scopri corse nella tua città in pochi secondi' },
  ]

  return (
    <section className="bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-8 lg:gap-10">
          {props.map(p => (
            <div key={p.title} className="flex items-start gap-3">
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0 ${p.color}`}>
                <span className="material-symbols-filled text-lg sm:text-xl">{p.icon}</span>
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
    {
      icon: 'edit_location', number: '01', title: 'Proponi',
      color: 'bg-orange-100 text-orange-600',
      text: 'Scegli luogo, orario, distanza e ritmo. Puoi creare una corsa singola o una serie ricorrente.',
    },
    {
      icon: 'travel_explore', number: '02', title: 'Trova',
      color: 'bg-blue-100 text-blue-600',
      text: 'Cerca corse nella tua città, filtra per livello e data, guarda sulla mappa.',
    },
    {
      icon: 'group', number: '03', title: 'Corri insieme',
      color: 'bg-green-100 text-green-600',
      text: "Aderisci, scrivi all'organizzatore e usa la chat di gruppo per coordinarsi.",
    },
  ]

  return (
    <section className="py-14 sm:py-20 bg-[#FAFAF9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Come funziona</h2>
          <p className="mt-3 text-base sm:text-lg text-gray-500">Tre passaggi, poi si corre.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {steps.map(step => (
            <div key={step.number}
              className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-7 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${step.color}`}>
                  <span className="material-symbols-outlined text-2xl">{step.icon}</span>
                </div>
                <span className="text-4xl font-black text-gray-100 select-none">{step.number}</span>
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-gray-900">{step.title}</h3>
                <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">{step.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link href="/come-funziona"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
            <span className="material-symbols-outlined text-base">help_outline</span>
            Scopri tutte le funzionalità →
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════
   PERCHÉ VIENI A CORRERE? — La storia
═══════════════════════════════════════ */
function WhyUsSection() {
  return (
    <section className="py-14 sm:py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* Foto — più compatta, bilanciata col testo ridotto */}
          <div className="relative order-first lg:order-last flex justify-center lg:justify-end">
            <div className="relative w-full max-w-xs sm:max-w-sm rounded-3xl overflow-hidden shadow-xl shadow-gray-200/80 aspect-square">
              <Image
                src="/noi.jpeg"
                alt="Massimo e Marzia, fondatori di Vieni a correre?"
                fill
                className="object-cover object-center"
                sizes="(max-width: 1024px) 384px, 320px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-orange-950/20 to-transparent" />
            </div>
            {/* Badge firma */}
            <div className="absolute -bottom-4 left-0 sm:left-4 bg-white rounded-2xl shadow-lg px-4 py-2.5 border border-gray-100 flex items-center gap-2.5">
              <span className="material-symbols-filled text-primary text-xl">favorite</span>
              <div>
                <p className="text-xs font-extrabold text-gray-900 leading-tight">Massimo & Marzia</p>
                <p className="text-[10px] text-gray-400">Perugia · Fondatori</p>
              </div>
            </div>
          </div>

          {/* Testo */}
          <div className="flex flex-col gap-4 pt-4 lg:pt-0 order-last lg:order-first">
            <div className="inline-flex items-center gap-2 self-start bg-orange-50 border border-orange-200 text-orange-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-sm">history</span>
              La nostra storia
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
              Perché Vieni a correre?
            </h2>

            <div className="flex flex-col gap-3 text-gray-600 text-base leading-relaxed">
              <p>
                Trovare qualcuno con cui correre, a volte, è più difficile di quanto sembri.
              </p>
              <p>
                Siamo Massimo e Marzia, corriamo da anni e viviamo a Perugia. Come in ogni città,
                i runner ci sono, ma non sempre si incontrano.
              </p>
              <p>
                Così ci siamo detti: perché non creare uno strumento semplice per dire{' '}
                <span className="font-semibold text-gray-800">&ldquo;io corro qui, a quest&apos;ora, qualcuno viene?&rdquo;</span>
              </p>
              <p>
                Non volevamo fare un altro social network per runner, volevamo una cosa più pratica:
                una bacheca per proporre una corsa, trovare compagnia, organizzarsi senza complicazioni.
              </p>
              <p>
                Vieniacorrere.it nasce per chi corre sempre da solo, per chi si è appena trasferito,
                per chi vuole ricominciare, per chi cerca compagnia per un lungo, per chi ha un
                allenamento preciso o solo voglia di uscire.
              </p>
            </div>

            <blockquote className="border-l-4 border-primary pl-5 py-0.5 mt-1">
              <p className="text-gray-700 font-medium leading-relaxed italic">
                Un luogo, un orario, un tipo di corsa.<br />
                Il resto succede correndo.
              </p>
            </blockquote>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <Link href="/registrati"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-primary-hover transition-colors shadow-sm shadow-orange-200">
                Inizia a correre insieme
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </Link>
              <Link href="/bacheca"
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-gray-200 px-6 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                Esplora le corse
              </Link>
            </div>
          </div>
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
    <section className="py-14 sm:py-20 bg-[#FAFAF9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl px-6 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            {/* Testo */}
            <div>
              <span className="inline-flex items-center gap-2 bg-orange-500/20 text-orange-400 px-4 py-1.5 rounded-full text-sm font-semibold mb-5">
                <span className="material-symbols-outlined text-base">auto_awesome</span>
                La differenza
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
                Pensata per correre,<br />non per scrollare.
              </h2>
              <p className="mt-4 text-base sm:text-lg text-gray-400 leading-relaxed">
                Elimina il superfluo: niente feed infinito, niente classifiche inutili, niente pressione.
                Solo corse vere, con persone vere.
              </p>
              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <Link href="/registrati"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-orange-900/30 hover:bg-primary-hover transition-all hover:-translate-y-0.5">
                  Inizia gratis
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </Link>
                <Link href="/bacheca"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-7 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition-all">
                  Esplora le corse
                </Link>
              </div>
            </div>

            {/* Feature list */}
            <div className="flex flex-col gap-2.5 sm:gap-3">
              {points.map(p => (
                <div key={p.text}
                  className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 transition-colors">
                  <span className="material-symbols-filled text-primary text-xl shrink-0">{p.icon}</span>
                  <span className="text-sm sm:text-base text-white font-medium">{p.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
