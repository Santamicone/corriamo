import Link from 'next/link'

const TOOLS = [
  {
    href: '/tools/zone-di-passo',
    icon: 'speed',
    title: 'Calcolatore zone di passo',
    desc: 'Dalla tua ultima gara ricava i ritmi per facile, lungo, medio, soglia e ripetute.',
    ready: true,
  },
  {
    href: '/tools/predittore',
    icon: 'timer',
    title: 'Predittore tempi gara',
    desc: 'Hai un tempo su 5K o 10K? Stima il tuo potenziale su mezza e maratona.',
    ready: true,
  },
  {
    href: '/tools/da-dove-inizio',
    icon: 'directions_walk',
    title: 'Test "da dove inizio?"',
    desc: 'Poche domande per capire il percorso giusto per te, da zero alla tua prima 5K.',
    ready: true,
  },
  {
    href: '/tools/alimentazione-gara',
    icon: 'nutrition',
    title: 'Piano alimentazione gara',
    desc: 'Cosa mangiare prima e durante la gara: cena, colazione, gel e idratazione su misura.',
    ready: true,
  },
]

export default function ToolsHubPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
      <header className="text-center mb-12">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary bg-orange-50 px-3 py-1 rounded-full mb-4">
          <span className="material-symbols-outlined text-sm">build</span>
          Strumenti gratuiti
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
          Strumenti per chi corre
        </h1>
        <p className="text-base text-gray-500 mt-3 max-w-xl mx-auto">
          Calcola i tuoi ritmi, prevedi i tempi di gara e capisci da dove partire.
          Gratis, senza registrazione. Poi trova qualcuno con cui allenarti.
        </p>
      </header>

      <div className="grid gap-4">
        {TOOLS.map(tool => {
          const card = (
            <div
              className={[
                'group flex items-start gap-4 p-5 rounded-2xl border transition-all bg-white',
                tool.ready
                  ? 'border-gray-100 hover:border-primary/30 hover:shadow-md'
                  : 'border-gray-100 opacity-70',
              ].join(' ')}
            >
              <div className="shrink-0 w-12 h-12 rounded-2xl bg-orange-50 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">{tool.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-extrabold text-gray-900">{tool.title}</h2>
                  {!tool.ready && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      In arrivo
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">{tool.desc}</p>
              </div>
              {tool.ready && (
                <span className="material-symbols-outlined text-gray-300 group-hover:text-primary transition-colors self-center">
                  arrow_forward
                </span>
              )}
            </div>
          )
          return tool.ready ? (
            <Link key={tool.href} href={tool.href}>
              {card}
            </Link>
          ) : (
            <div key={tool.href}>{card}</div>
          )
        })}
      </div>
    </div>
  )
}
