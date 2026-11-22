import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { PageContainer } from '@/components/PageContainer'
import { CREW_TYPE_LABELS } from '@/lib/types'
import type { Crew } from '@/lib/types'
import { NotifyMeButton } from './NotifyMeButton'

const isHttp = (u: string | null | undefined): u is string => !!u && /^https?:\/\//i.test(u)

/**
 * Scheda informativa di una crew SENZA proprietario (importata o inserita dall'admin).
 * Non ha membri, chat, bacheca né richieste di ingresso: nessuno le gestirebbe
 * (docs/MAPPA-CREW.md §2.4). Mostra solo dati pubblici e dice chiaramente cos'è.
 */
/** Il numero di persone in attesa compare solo da questa soglia (docs/MAPPA-CREW.md §2.5) */
const INTEREST_THRESHOLD = 5

export function InformativeCrew({ crew, userId, interested, interestCount }: {
  crew: Crew
  userId: string | null
  interested: boolean
  interestCount: number
}) {
  const type = CREW_TYPE_LABELS[crew.crew_type]
  const where = [crew.city, crew.zone ? `(${crew.zone})` : ''].filter(Boolean).join(' ')
  const subject = encodeURIComponent(`Crew: ${crew.name}`)

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gray-50 py-10">
        <PageContainer width="content" className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              {isHttp(crew.avatar_url) ? (
                // Il logo è un link esterno scelto dall'admin: nessun referrer inviato al sito che lo ospita
                // eslint-disable-next-line @next/next/no-img-element
                <img src={crew.avatar_url} alt={`Logo di ${crew.name}`} referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-2xl object-cover border border-gray-100 shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-3xl text-gray-400">group</span>
                </div>
              )}
              <div className="min-w-0">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{type.name}</span>
                <h1 className="text-2xl font-bold text-gray-900">{crew.name}</h1>
                {where && <p className="text-sm text-gray-500 mt-0.5">{where}</p>}
              </div>
            </div>

            {crew.description && (
              <p className="text-gray-600 mt-4 text-sm leading-relaxed whitespace-pre-wrap">{crew.description}</p>
            )}

            {(crew.meeting_point || crew.schedule_text || isHttp(crew.website_url) || isHttp(crew.instagram_url)) && (
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                {crew.meeting_point && (
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-base text-gray-400 mt-0.5">location_on</span>
                    <span>Ritrovo: {crew.meeting_point}{crew.city ? `, ${crew.city}` : ''}</span>
                  </li>
                )}
                {crew.schedule_text && (
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-base text-gray-400 mt-0.5">schedule</span>
                    <span>{crew.schedule_text}</span>
                  </li>
                )}
                {isHttp(crew.website_url) && (
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-gray-400">language</span>
                    <a href={crew.website_url} target="_blank" rel="noopener noreferrer nofollow"
                      className="text-[var(--color-primary)] hover:underline break-all">
                      {crew.website_url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '')}
                    </a>
                  </li>
                )}
                {isHttp(crew.instagram_url) && (
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-gray-400">photo_camera</span>
                    <a href={crew.instagram_url} target="_blank" rel="noopener noreferrer nofollow"
                      className="text-[var(--color-primary)] hover:underline break-all">
                      {crew.instagram_url.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '@').replace(/\/$/, '')}
                    </a>
                  </li>
                )}
              </ul>
            )}
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-3">
            <span className="material-symbols-outlined text-gray-400 mt-0.5">info</span>
            <div className="text-sm text-gray-500 leading-relaxed">
              <p className="font-semibold text-gray-700">Scheda informativa</p>
              <p>
                Questa crew non è ancora su Vieni a correre: i dati sono pubblici e non confermati dalla crew,
                e qui non si può chiedere di entrare. Per partecipare contatta direttamente la crew dai suoi canali.
              </p>
              <div className="mt-3 flex flex-col gap-1.5">
                <NotifyMeButton crewId={crew.id} userId={userId} initialInterested={interested} />
                {interestCount >= INTEREST_THRESHOLD && (
                  <p className="text-xs text-gray-400">{interestCount} runner stanno aspettando questa crew.</p>
                )}
              </div>
              <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                <a className="text-[var(--color-primary)] hover:underline"
                  href={`mailto:info@vieniacorrere.it?subject=${subject}`}>
                  È la tua crew? Scrivici
                </a>
                <a className="text-gray-400 hover:underline"
                  href={`mailto:info@vieniacorrere.it?subject=${encodeURIComponent(`Segnalazione scheda: ${crew.name}`)}`}>
                  Segnala un errore o chiedi la rimozione
                </a>
              </p>
            </div>
          </div>

          <p className="text-center">
            <Link href="/crew/mappa" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <span className="material-symbols-outlined text-base">map</span>
              Torna alla mappa delle crew
            </Link>
          </p>
        </PageContainer>
      </main>
      <Footer />
    </div>
  )
}
