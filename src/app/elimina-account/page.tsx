import type { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { PageContainer } from '@/components/PageContainer'

export const metadata: Metadata = {
  title: 'Elimina il tuo account',
  description: "Come eliminare il tuo account su Vieni a correre?: dall'app o scrivendoci. Quali dati vengono cancellati e quali conservati.",
  alternates: { canonical: 'https://app.vieniacorrere.it/elimina-account' },
}

export default function EliminaAccountPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
       <PageContainer width="form" className="py-12">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Elimina il tuo account</h1>
        <p className="text-sm text-gray-400 mb-10">Vieni a correre? — come cancellare account e dati personali</p>

        <div className="prose prose-gray max-w-none text-gray-600 text-sm leading-relaxed flex flex-col gap-8">

          <Section title="Dall'app (immediato)">
            <ol className="list-decimal pl-5 flex flex-col gap-1.5">
              <li>Apri l&apos;app <strong>Vieni a correre?</strong> e accedi.</li>
              <li>Vai nella scheda <strong>Profilo</strong>.</li>
              <li>In fondo tocca <strong>Elimina account</strong>.</li>
              <li>Leggi cosa succede, inserisci la tua password e conferma.</li>
            </ol>
            <p>L&apos;account e i dati collegati vengono eliminati subito.</p>
          </Section>

          <Section title="Senza l'app (entro 30 giorni)">
            <p>
              Scrivi a <a href="mailto:info@vieniacorrere.it?subject=Eliminazione%20account" className="text-primary hover:underline">info@vieniacorrere.it</a> con
              oggetto <strong>&quot;Eliminazione account&quot;</strong>, dall&apos;indirizzo email con cui sei registrato. Cancelliamo l&apos;account e i dati collegati entro 30 giorni dalla richiesta.
            </p>
            <p>
              Vale anche se ti sei registrato con Google o Facebook: usa l&apos;indirizzo email del tuo account. Cancellare l&apos;account da Vieni a correre? non elimina né modifica il tuo account Google o Facebook.
            </p>
          </Section>

          <Section title="Cosa viene eliminato">
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li>Il tuo profilo: nome, email, città, età, foto, bio, personal best e link.</li>
              <li>Le corse e le serie che hai organizzato, con i relativi momenti. Gli iscritti alle corse future ricevono un avviso di annullamento.</li>
              <li>Le tue richieste e partecipazioni, i messaggi, le recensioni e i momenti (foto) che hai pubblicato.</li>
              <li>Le tue preferenze, i dispositivi registrati per le notifiche e le richieste &quot;Avvisami&quot; sulle crew.</li>
            </ul>
          </Section>

          <Section title="Cosa può essere conservato">
            <p>
              I log tecnici dei server vengono conservati per 90 giorni, come indicato nell&apos;<a href="/privacy" className="text-primary hover:underline">informativa privacy</a>.
              Possiamo inoltre conservare, in forma non riconducibile a te o per il tempo strettamente necessario, le informazioni che la legge ci impone di conservare o che servono a tutelare la sicurezza della piattaforma (ad esempio le segnalazioni ricevute).
            </p>
          </Section>

          <Section title="Prima di eliminare">
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li>L&apos;eliminazione è <strong>definitiva</strong>: non possiamo recuperare i dati.</li>
              <li>Se sei proprietario di una <strong>crew con altri membri</strong>, trasferiscila o eliminala prima: l&apos;app non ti permette di procedere finché è così.</li>
            </ul>
          </Section>

          <Section title="Hai bisogno di aiuto?">
            <p>Scrivici a <a href="mailto:info@vieniacorrere.it" className="text-primary hover:underline">info@vieniacorrere.it</a>: rispondiamo il prima possibile.</p>
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
