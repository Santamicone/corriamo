import type { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { PageContainer } from '@/components/PageContainer'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Informativa sul trattamento dei dati personali di Vieni a correre? — come raccogliamo, usiamo e proteggiamo i tuoi dati.',
  alternates: { canonical: 'https://app.vieniacorrere.it/privacy' },
}

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
       <PageContainer width="form" className="py-12">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-10">Ultimo aggiornamento: novembre 2026</p>

        <div className="prose prose-gray max-w-none text-gray-600 text-sm leading-relaxed flex flex-col gap-8">

          <Section title="1. Titolare del trattamento">
            <p>Il titolare del trattamento dei dati è il gestore di <strong>Vieni a correre?</strong> (vieniacorrere.it). Per qualsiasi richiesta relativa ai dati personali puoi scrivere a: <a href="mailto:info@vieniacorrere.it" className="text-primary hover:underline">info@vieniacorrere.it</a></p>
            <p>Questa informativa vale per il sito e per l&apos;app mobile.</p>
          </Section>

          <Section title="2. Dati raccolti">
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li><strong>Dati di registrazione:</strong> indirizzo email, nome e cognome</li>
              <li><strong>Dati di profilo (facoltativi):</strong> città, livello di corsa, età, foto profilo, link Strava/Garmin/Instagram, personal best, bio, motivazioni per cui corri</li>
              <li><strong>Dati sulle corse:</strong> luogo di ritrovo (con le sue coordinate geografiche, ricavate dall&apos;indirizzo che scrivi), data, orario e descrizione delle corse che crei o a cui partecipi; richieste di partecipazione, presenze e recensioni</li>
              <li><strong>Messaggi:</strong> contenuto delle chat delle corse e delle crew a cui partecipi</li>
              <li><strong>Segnalazioni e blocchi:</strong> le segnalazioni che invii e gli utenti che blocchi (i blocchi sono visibili solo a te)</li>
              <li><strong>Notifiche push (app):</strong> il codice identificativo del dispositivo, se attivi le notifiche, per poterle inviare</li>
              <li><strong>Strava (facoltativo):</strong> se colleghi il tuo account, distanza, passo, durata, dislivello e frequenza cardiaca delle attività importate; sono visibili agli altri solo se scegli di renderle pubbliche sul profilo o di condividerle con le tue crew private</li>
              <li><strong>Dati tecnici:</strong> indirizzo IP, tipo di browser, log di accesso (raccolti automaticamente da Vercel e Supabase)</li>
            </ul>
            <p>L&apos;app non legge la posizione GPS del telefono e non usa fotocamera, microfono né rubrica. Per scegliere la foto del profilo usa il selettore di immagini del sistema.</p>
          </Section>

          <Section title="3. Finalità del trattamento">
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li>Fornire il servizio di organizzazione e ricerca corse</li>
              <li>Gestire l&apos;autenticazione e la sicurezza degli account</li>
              <li>Inviare notifiche relative alle corse (email e notifiche push: conferme, modifiche, promemoria) e, se non lo disattivi, un riepilogo settimanale delle corse vicine</li>
              <li>Gestire le segnalazioni, i blocchi e gli abusi, per mantenere la community sicura</li>
            </ul>
            <p>Non utilizziamo strumenti di analisi del comportamento né pubblicità, e non profiliamo gli utenti.</p>
          </Section>

          <Section title="4. Base giuridica">
            <p>Il trattamento è basato sul <strong>contratto</strong> (erogazione del servizio) e sul <strong>legittimo interesse</strong> per la sicurezza della piattaforma. Per i dati facoltativi del profilo, la base è il <strong>consenso</strong> dell&apos;utente.</p>
          </Section>

          <Section title="5. Conservazione dei dati">
            <p>I dati vengono conservati per tutta la durata dell&apos;account. Puoi eliminarlo in qualsiasi momento dall&apos;app (Profilo → Elimina account): l&apos;account e i dati collegati vengono cancellati subito. In alternativa scrivi a info@vieniacorrere.it e li cancelliamo entro 30 giorni dalla richiesta; le istruzioni sono anche su <a href="/elimina-account" className="text-primary hover:underline">/elimina-account</a>. I log tecnici sono conservati per 90 giorni.</p>
          </Section>

          <Section title="6. Condivisione con terze parti">
            <p>I dati non vengono venduti a terzi. Utilizziamo i seguenti sub-responsabili:</p>
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li><strong>Supabase</strong> (database e autenticazione) — USA, conforme GDPR</li>
              <li><strong>Vercel</strong> (hosting) — USA, conforme GDPR</li>
              <li><strong>Expo</strong> (inoltro delle notifiche push all&apos;app) — riceve il codice del dispositivo e il testo della notifica</li>
              <li><strong>Resend</strong> (invio delle email) — riceve il tuo indirizzo email e il contenuto del messaggio</li>
              <li><strong>OpenStreetMap Nominatim</strong> (ricerca delle coordinate dei luoghi di ritrovo) — riceve soltanto l&apos;indirizzo che scrivi, non i tuoi dati personali</li>
              <li><strong>Strava</strong> (solo se colleghi il tuo account)</li>
            </ul>
            <p>Alcune informazioni del profilo (nome, città, livello, corse organizzate) sono pubblicamente visibili agli altri utenti della piattaforma.</p>
          </Section>

          <Section title="7. I tuoi diritti">
            <p>Hai diritto di: accedere ai tuoi dati, correggerli, cancellarli, limitarne il trattamento, portarli in altro formato. Puoi esercitare questi diritti scrivendo a <a href="mailto:info@vieniacorrere.it" className="text-primary hover:underline">info@vieniacorrere.it</a>. Puoi correggere i dati del profilo e cancellare l&apos;account anche direttamente dall&apos;app.</p>
          </Section>

          <Section title="8. Cookie">
            <p>Utilizziamo esclusivamente cookie tecnici necessari al funzionamento dell&apos;autenticazione (sessione utente). Non utilizziamo cookie di profilazione o pubblicitari.</p>
          </Section>

          <Section title="9. Età minima">
            <p>Per registrarti devi avere almeno <strong>14 anni</strong>. Non raccogliamo consapevolmente dati di persone più giovani: se veniamo a saperlo, eliminiamo l&apos;account. Se pensi che sia successo, scrivi a <a href="mailto:info@vieniacorrere.it" className="text-primary hover:underline">info@vieniacorrere.it</a>.</p>
          </Section>

        </div>
       </PageContainer>
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
