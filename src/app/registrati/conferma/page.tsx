import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default function ConfermaEmailPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col">
      <header className="px-6 py-5 border-b border-gray-100 bg-white">
        <Link href="/" className="text-xl font-extrabold text-primary">Vieni a correre?</Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md flex flex-col items-center gap-6 text-center">

          <div className="w-20 h-20 rounded-3xl bg-orange-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-primary">mark_email_unread</span>
          </div>

          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Controlla la tua email</h1>
            <p className="text-gray-500 mt-2 leading-relaxed">
              Ti abbiamo inviato un link di conferma. Clicca il link nell&apos;email per
              attivare il tuo account e accedere alla bacheca.
            </p>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl px-5 py-4 w-full text-left flex flex-col gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Cosa fare</p>
            {[
              { icon: 'inbox',        text: 'Apri la tua casella di posta' },
              { icon: 'mail',         text: 'Cerca un\'email da noreply@mail.app.supabase.io' },
              { icon: 'link',         text: 'Clicca "Conferma il tuo indirizzo email"' },
              { icon: 'directions_run', text: 'Sei dentro — buona corsa!' },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3 py-1">
                <div className="w-7 h-7 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-sm">{step.icon}</span>
                </div>
                <p className="text-sm text-gray-700">{step.text}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400">
            Non hai ricevuto nulla? Controlla la cartella spam.
          </p>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <span className="material-symbols-outlined text-base">login</span>
            Vai al login
          </Link>
        </div>
      </div>
    </div>
  )
}
