import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { PageContainer } from '@/components/PageContainer'
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/appStore'

const TITLE = "Scarica l'app per iPhone"
const DESCRIPTION =
  "L'app di Vieni a correre? per iPhone: trova corse vicino a te, chiedi di partecipare, scrivi al gruppo, ricevi le notifiche e usa il ritrovo a schermo colorato. Gratis."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: 'https://app.vieniacorrere.it/app' },
  openGraph: {
    title: `${TITLE} — Vieni a correre?`,
    description: DESCRIPTION,
    url: 'https://app.vieniacorrere.it/app',
  },
}

const FEATURES = [
  { icon: 'search', title: 'Trova una corsa', text: 'La bacheca delle corse vicino a te, con filtri per giorno, livello e ritmo.' },
  { icon: 'notifications_active', title: 'Notifiche in tempo reale', text: 'Richieste approvate, messaggi del gruppo e promemoria prima della partenza.' },
  { icon: 'forum', title: 'Chat del gruppo', text: 'Organizzati con chi corre con te, prima e dopo la corsa.' },
  { icon: 'bolt', title: 'Esci adesso', text: 'Pubblica una corsa spontanea in 30 secondi e trova compagnia subito.' },
  { icon: 'groups', title: 'Crew', text: 'Il tuo gruppo di corsa: bacheca, chat privata e uscite programmate.' },
  { icon: 'flag', title: 'Ritrovo a schermo colorato', text: 'Al punto di ritrovo ognuno si riconosce dal colore della corsa.' },
]

const SHOTS = [
  { src: '/app-store/bacheca.webp', alt: 'Bacheca delle corse nell’app', label: 'Trova una corsa' },
  { src: '/app-store/nuova-corsa.webp', alt: 'Creazione di una nuova corsa', label: 'Proponi la tua' },
  { src: '/app-store/ritrovo.webp', alt: 'Schermata di ritrovo colorata', label: 'Ritrovo' },
  { src: '/app-store/crew.webp', alt: 'Elenco delle crew', label: 'Crew' },
]

/**
 * Pulsante App Store. TODO: sostituire con il badge ufficiale "Scarica su App Store"
 * (SVG in italiano dai materiali di marketing Apple, public/app-store/) come richiesto
 * dalle linee guida di Apple.
 */
function AppStoreButton({ className = '' }: { className?: string }) {
  return (
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-3 rounded-xl bg-black px-5 py-3 text-white shadow-lg shadow-gray-900/20 transition-transform hover:-translate-y-0.5 ${className}`}
    >
      <span className="material-symbols-outlined text-3xl">phone_iphone</span>
      <span className="flex flex-col leading-tight text-left">
        <span className="text-[11px] font-medium opacity-80">Scarica su</span>
        <span className="text-xl font-semibold tracking-tight">App Store</span>
      </span>
    </a>
  )
}

export default function AppPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">

        {/* ── Hero ── */}
        <div className="bg-gradient-to-br from-orange-50 via-white to-orange-50 border-b border-orange-100">
          <PageContainer width="wide" className="py-14 sm:py-20">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              <div className="flex flex-col gap-6">
                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
                  <span className="material-symbols-outlined text-base">smartphone</span>
                  App per iPhone
                </div>
                <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-950 leading-[1.05]">
                  Vieni a correre,<br />
                  <span className="text-primary italic">anche dal telefono.</span>
                </h1>
                <p className="text-base sm:text-lg leading-7 text-gray-700 max-w-lg">
                  L’app ti porta le corse e i tuoi compagni in tasca: notifiche, chat del gruppo e
                  ritrovo, sempre a portata di mano. Stesso account del sito, gratis.
                </p>

                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                  <AppStoreButton className="w-fit" />
                  {/* QR: utile da desktop, nascosto su mobile dove basta il pulsante */}
                  <div className="hidden md:flex items-center gap-3">
                    <img
                      src="/app-store/qr-app-store.svg"
                      alt="QR code per scaricare l’app da App Store"
                      width={96}
                      height={96}
                      className="rounded-lg border border-gray-200 bg-white p-1"
                    />
                    <p className="text-xs text-gray-500 max-w-[9rem]">
                      Inquadra il QR con la fotocamera dell’iPhone.
                    </p>
                  </div>
                </div>

                <p className="text-sm text-gray-500">
                  {PLAY_STORE_URL ? (
                    <a href={PLAY_STORE_URL} className="font-semibold text-primary hover:underline">
                      Disponibile anche su Google Play
                    </a>
                  ) : (
                    <>Android: in arrivo. Nel frattempo puoi usare il <Link href="/bacheca" className="font-semibold text-primary hover:underline">sito dal browser</Link>.</>
                  )}
                </p>
              </div>

              {/* Screenshot */}
              <div className="flex justify-center gap-3 sm:gap-4">
                {SHOTS.slice(0, 3).map((s, i) => (
                  <figure
                    key={s.src}
                    className={`w-1/3 max-w-[170px] ${i === 1 ? 'mt-8' : ''}`}
                  >
                    <img
                      src={s.src}
                      alt={s.alt}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      className="w-full rounded-2xl border border-gray-200 shadow-xl shadow-gray-900/10"
                    />
                  </figure>
                ))}
              </div>
            </div>
          </PageContainer>
        </div>

        {/* ── Funzioni ── */}
        <PageContainer width="wide" className="py-14">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Cosa puoi fare con l’app</h2>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(f => (
              <div key={f.title} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
                  <span className="material-symbols-outlined text-primary">{f.icon}</span>
                </div>
                <h3 className="font-bold text-gray-900">{f.title}</h3>
                <p className="mt-1 text-sm text-gray-500 leading-6">{f.text}</p>
              </div>
            ))}
          </div>
        </PageContainer>

        {/* ── Cosa resta sul sito ── */}
        <div className="bg-gray-50 border-t border-gray-100">
          <PageContainer width="content" className="py-12">
            <h2 className="text-xl font-extrabold text-gray-900">Alcune funzioni restano sul sito</h2>
            <p className="mt-2 text-sm text-gray-600 leading-6 max-w-2xl">
              Calendario gare, strumenti per runner e gestione avanzata delle crew si usano dal sito:
              dall’app li apri con un tocco dal tuo profilo, con lo stesso account.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/calendario-gare" className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:border-primary hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-base">event</span>
                Calendario gare
              </Link>
              <Link href="/tools" className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:border-primary hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-base">calculate</span>
                Strumenti per runner
              </Link>
            </div>
          </PageContainer>
        </div>

        {/* ── CTA finale ── */}
        <PageContainer width="content" className="py-14 text-center flex flex-col items-center gap-5">
          <h2 className="text-2xl font-extrabold text-gray-900">Pronto a partire?</h2>
          <AppStoreButton />
        </PageContainer>

      </main>
      <Footer />
    </div>
  )
}
