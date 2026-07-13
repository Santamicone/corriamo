import type { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { PageContainer } from '@/components/PageContainer'

export const metadata: Metadata = {
  title: 'Termini di Servizio',
  description: 'Condizioni d\'uso della piattaforma Vieni a correre? — regole, responsabilità e linee guida per la community di runner.',
  alternates: { canonical: 'https://app.vieniacorrere.it/termini' },
}

export default function TerminiPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
       <PageContainer width="form" className="py-12">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Termini di Servizio</h1>
        <p className="text-sm text-gray-400 mb-10">Ultimo aggiornamento: giugno 2026</p>

        <div className="flex flex-col gap-8 text-sm text-gray-600 leading-relaxed">

          <Section title="1. Accettazione">
            <p>Utilizzando <strong>Vieni a correre?</strong> (vieniacorrere.it) accetti i presenti Termini di Servizio. Se non sei d&apos;accordo, ti chiediamo di non utilizzare la piattaforma.</p>
          </Section>

          <Section title="2. Il servizio">
            <p>Vieni a correre? è una piattaforma gratuita che consente ai runner di organizzare, trovare e partecipare a corse e allenamenti. Non siamo organizzatori delle corse: il rapporto è esclusivamente tra i runner che utilizzano la piattaforma.</p>
          </Section>

          <Section title="3. Responsabilità dell'utente">
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li>Le informazioni che inserisci (nome, luogo di ritrovo, orari) devono essere accurate e aggiornate</li>
              <li>Sei responsabile della sicurezza della tua password e del tuo account</li>
              <li>Non puoi usare la piattaforma per scopi commerciali, spam o attività illegali</li>
              <li>Sei responsabile della tua sicurezza fisica durante le corse: valuta il meteo, il percorso e le tue condizioni fisiche</li>
            </ul>
          </Section>

          <Section title="4. Contenuti">
            <p>I contenuti che pubblichi (titoli corse, descrizioni, messaggi) rimangono di tua proprietà. Ci concedi una licenza per mostrarli agli altri utenti nell&apos;ambito del servizio. Non pubblicare contenuti offensivi, discriminatori o che violino diritti altrui.</p>
          </Section>

          <Section title="5. Limitazione di responsabilità">
            <p>Vieni a correre? non è responsabile per danni fisici, incidenti o disservizi che dovessero verificarsi durante le corse organizzate tramite la piattaforma. Il servizio è fornito &quot;così com&apos;è&quot;, senza garanzie di disponibilità continua.</p>
          </Section>

          <Section title="6. Sospensione e cancellazione">
            <p>Ci riserviamo il diritto di sospendere o cancellare account che violino i presenti termini, previo avviso ove possibile. Puoi cancellare il tuo account in qualsiasi momento dalla pagina del profilo.</p>
          </Section>

          <Section title="7. Modifiche">
            <p>Possiamo aggiornare questi termini. Ti informeremo via email o con un avviso in-app in caso di modifiche sostanziali.</p>
          </Section>

          <Section title="8. Legge applicabile">
            <p>I presenti termini sono regolati dalla legge italiana. Per qualsiasi controversia è competente il Foro di Perugia.</p>
          </Section>

          <Section title="9. Contatti">
            <p>Per domande sui termini scrivi a: <a href="mailto:info@vieniacorrere.it" className="text-primary hover:underline">info@vieniacorrere.it</a></p>
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
