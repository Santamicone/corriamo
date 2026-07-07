import type { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Informativa sul trattamento dei dati personali di Vieni a correre? — come raccogliamo, usiamo e proteggiamo i tuoi dati.',
  alternates: { canonical: 'https://app.vieniacorrere.it/privacy' },
}

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-10">Ultimo aggiornamento: giugno 2026</p>

        <div className="prose prose-gray max-w-none text-gray-600 text-sm leading-relaxed flex flex-col gap-8">

          <Section title="1. Titolare del trattamento">
            <p>Il titolare del trattamento dei dati è il gestore di <strong>Vieni a correre?</strong> (vieniacorrere.it). Per qualsiasi richiesta relativa ai dati personali puoi scrivere a: <a href="mailto:privacy@vieniacorrere.it" className="text-primary hover:underline">privacy@vieniacorrere.it</a></p>
          </Section>

          <Section title="2. Dati raccolti">
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li><strong>Dati di registrazione:</strong> indirizzo email, nome e cognome</li>
              <li><strong>Dati di profilo (facoltativi):</strong> città, livello di corsa, età, foto profilo, link Strava/Garmin/Instagram, personal best, bio</li>
              <li><strong>Dati sulle corse:</strong> luogo, orario, descrizione delle corse che crei o a cui partecipi</li>
              <li><strong>Messaggi:</strong> contenuto delle conversazioni con altri runner</li>
              <li><strong>Dati tecnici:</strong> indirizzo IP, tipo di browser, log di accesso (raccolti automaticamente da Vercel e Supabase)</li>
            </ul>
          </Section>

          <Section title="3. Finalità del trattamento">
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li>Fornire il servizio di organizzazione e ricerca corse</li>
              <li>Gestire l&apos;autenticazione e la sicurezza degli account</li>
              <li>Inviare notifiche relative alle corse (email di conferma, promemoria)</li>
              <li>Migliorare il servizio attraverso l&apos;analisi aggregata dell&apos;utilizzo</li>
            </ul>
          </Section>

          <Section title="4. Base giuridica">
            <p>Il trattamento è basato sul <strong>contratto</strong> (erogazione del servizio) e sul <strong>legittimo interesse</strong> per la sicurezza della piattaforma. Per i dati facoltativi del profilo, la base è il <strong>consenso</strong> dell&apos;utente.</p>
          </Section>

          <Section title="5. Conservazione dei dati">
            <p>I dati vengono conservati per tutta la durata dell&apos;account e cancellati entro 30 giorni dalla richiesta di eliminazione dell&apos;account. I log tecnici sono conservati per 90 giorni.</p>
          </Section>

          <Section title="6. Condivisione con terze parti">
            <p>I dati non vengono venduti a terzi. Utilizziamo i seguenti sub-responsabili:</p>
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li><strong>Supabase</strong> (database e autenticazione) — USA, conforme GDPR</li>
              <li><strong>Vercel</strong> (hosting) — USA, conforme GDPR</li>
            </ul>
            <p>Alcune informazioni del profilo (nome, città, livello, corse organizzate) sono pubblicamente visibili agli altri utenti della piattaforma.</p>
          </Section>

          <Section title="7. I tuoi diritti">
            <p>Hai diritto di: accedere ai tuoi dati, correggerli, cancellarli, limitarne il trattamento, portarli in altro formato. Puoi esercitare questi diritti scrivendo a <a href="mailto:privacy@vieniacorrere.it" className="text-primary hover:underline">privacy@vieniacorrere.it</a>.</p>
          </Section>

          <Section title="8. Cookie">
            <p>Utilizziamo esclusivamente cookie tecnici necessari al funzionamento dell&apos;autenticazione (sessione utente). Non utilizziamo cookie di profilazione o pubblicitari.</p>
          </Section>

        </div>
      </main>
      <Footer />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-3">
      <h2 className="text-sm font-bold text-gray-900">{title}</h2>
      {children}
    </div>
  )
}
