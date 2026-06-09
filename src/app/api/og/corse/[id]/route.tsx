import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'
import { LEVEL_LABELS } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  tutti:        { bg: '#F3F4F6', text: '#374151' },
  principiante: { bg: '#DCFCE7', text: '#15803D' },
  intermedio:   { bg: '#DBEAFE', text: '#1D4ED8' },
  avanzato:     { bg: '#FFEDD5', text: '#C2410C' },
}

/**
 * Icone SVG inline (stile lucide). Sostituiscono le emoji: Satori non
 * renderizza le emoji nativamente, le scarica come SVG Twemoji da una CDN
 * a runtime — se quel fetch fallisce l'intera immagine va in errore 500.
 */
function Icon({ d, size = 22, color = '#374151', fill = false }: {
  d: string; size?: number; color?: string; fill?: boolean
}) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill={fill ? color : 'none'}
      stroke={color} strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round"
    >
      {d.split('|').map((p, i) => <path key={i} d={p} />)}
    </svg>
  )
}

const ICONS = {
  // running person
  run:      'M13 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2|M8 21l2.5-5 2-2 1.5 3 4 1|M9.5 11.5 12 9l3 1.5 2.5-1|M6 13l2-3 4-1',
  calendar: 'M8 2v4|M16 2v4|M3 10h18|M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  clock:    'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z|M12 6v6l4 2',
  pin:      'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z|M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  route:    'M22 12h-4l-3 9L9 3l-3 9H2',
  heart:    'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7z',
  arrow:    'M5 12h14|M12 5l7 7-7 7',
  users:    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2|M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8|M22 21v-2a4 4 0 0 0-3-3.87|M16 3.13a4 4 0 0 1 0 7.75',
}

const PRESET_BG: Record<string, string> = {
  'preset:1': '#EA580C', 'preset:2': '#16A34A', 'preset:3': '#2563EB',
  'preset:4': '#7C3AED', 'preset:5': '#DB2777', 'preset:6': '#0F766E',
}
const INITIALS_BG = ['#EA580C', '#16A34A', '#2563EB']

type AvatarSpec =
  | { kind: 'image'; src: string }
  | { kind: 'preset'; bg: string }
  | { kind: 'initials'; bg: string; text: string }

/**
 * Mappa il campo avatar_url (URL caricato | "carattere:N" | "preset:N" | null)
 * nel formato concreto da renderizzare nell'OG image. I path relativi
 * vengono resi assoluti perché lo scraper non ha un origin.
 */
function resolveAvatar(src: string | null, name: string, siteUrl: string): AvatarSpec {
  if (src?.startsWith('carattere:')) {
    return { kind: 'image', src: `${siteUrl}/caratteri/carattere${src.split(':')[1]}.png` }
  }
  if (src?.startsWith('preset:')) {
    return { kind: 'preset', bg: PRESET_BG[src] ?? '#EA580C' }
  }
  if (src) return { kind: 'image', src }
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  return { kind: 'initials', bg: INITIALS_BG[(name.charCodeAt(0) || 0) % 3], text: initials || '?' }
}

function AvatarBlock({ spec, size = 52 }: { spec: AvatarSpec; size?: number }) {
  const base = {
    width: size, height: size, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '3px solid white', overflow: 'hidden', flexShrink: 0,
  } as const
  if (spec.kind === 'image') {
    return <img src={spec.src} width={size} height={size} style={{ ...base, objectFit: 'cover' }} />
  }
  if (spec.kind === 'preset') {
    return <div style={{ ...base, background: spec.bg }}><Icon d={ICONS.run} size={size * 0.55} color="white" /></div>
  }
  return (
    <div style={{ ...base, background: spec.bg, color: 'white', fontSize: size * 0.4, fontWeight: 700 }}>
      {spec.text}
    </div>
  )
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: run } = await supabase
    .from('runs')
    .select('*, organizer:profiles!runs_organizer_id_fkey(full_name, city, avatar_url)')
    .eq('id', id)
    .single()

  // Conteggio iscritti approvati (leva sociale nello snippet)
  const { count: approvedCount } = await supabase
    .from('participations')
    .select('id', { count: 'exact', head: true })
    .eq('run_id', id)
    .eq('status', 'approvata')

  // Fallback se la corsa non esiste
  const title       = run?.title ?? 'Una corsa ti aspetta'
  const dateStr     = run?.date ? format(parseISO(run.date), "d MMMM yyyy", { locale: it }) : ''
  const timeStr     = run?.time ? run.time.slice(0, 5) : ''
  const city        = run?.city ?? ''
  const location    = run?.location ?? ''
  const level       = run?.level ?? 'tutti'
  const distKm      = run?.distance_km
  const isNoDrop    = run?.is_no_drop ?? false
  const organizer   = run?.organizer?.full_name ?? ''
  const avatarUrl   = run?.organizer?.avatar_url ?? null
  // Organizzatore + partecipanti approvati
  const joinedCount = (approvedCount ?? 0) + (organizer ? 1 : 0)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.vieniacorrere.it'
  const lc = LEVEL_COLORS[level] ?? LEVEL_COLORS.tutti

  // Risolve l'avatar dell'organizzatore nei vari formati supportati dall'app
  const avatar = resolveAvatar(avatarUrl, organizer, siteUrl)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column',
          background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 60%, #fed7aa 100%)',
          padding: '52px 56px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Decorative blob */}
        <div style={{
          position: 'absolute', top: -80, right: -80,
          width: 320, height: 320, borderRadius: '50%',
          background: 'rgba(234,88,12,0.08)',
        }} />

        {/* Header: brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: '#EA580C',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon d={ICONS.run} size={24} color="white" />
          </div>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#374151' }}>
            Vieni a correre?
          </span>
        </div>

        {/* Title */}
        <div style={{
          fontSize: title.length > 40 ? 44 : 56,
          fontWeight: 800, color: '#111827',
          lineHeight: 1.1, marginBottom: 28,
          maxWidth: 900,
        }}>
          {title}
        </div>

        {/* Organizer */}
        {organizer && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
            <AvatarBlock spec={avatar} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>{organizer}</span>
              <span style={{ fontSize: 16, color: '#6B7280' }}>
                {`Organizza${city ? ` · ${city}` : ''}`}
              </span>
            </div>
          </div>
        )}

        {/* Meta row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, marginBottom: 32 }}>
          {dateStr && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 22, color: '#374151', fontWeight: 600 }}>
              <Icon d={ICONS.calendar} /><span>{dateStr}</span>
            </div>
          )}
          {timeStr && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 22, color: '#374151', fontWeight: 600 }}>
              <Icon d={ICONS.clock} /><span>Ore {timeStr}</span>
            </div>
          )}
          {location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 22, color: '#374151', fontWeight: 600 }}>
              <Icon d={ICONS.pin} /><span>{location}</span>
            </div>
          )}
          {distKm && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 22, color: '#374151', fontWeight: 600 }}>
              <Icon d={ICONS.route} /><span>{distKm} km</span>
            </div>
          )}
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 'auto' }}>
          <div style={{
            background: lc.bg, color: lc.text,
            padding: '8px 20px', borderRadius: 24,
            fontSize: 18, fontWeight: 700,
          }}>
            {LEVEL_LABELS[level]}
          </div>
          {isNoDrop && (
            <div style={{
              background: '#DCFCE7', color: '#15803D',
              padding: '8px 20px', borderRadius: 24,
              fontSize: 18, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Icon d={ICONS.heart} size={18} color="#15803D" fill /> No drop
            </div>
          )}
          {joinedCount > 1 && (
            <div style={{
              background: '#FFEDD5', color: '#C2410C',
              padding: '8px 20px', borderRadius: 24,
              fontSize: 18, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Icon d={ICONS.users} size={18} color="#C2410C" />
              {`${joinedCount} già iscritti`}
            </div>
          )}
        </div>

        {/* CTA bottom */}
        <div style={{
          marginTop: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{
            background: '#EA580C', color: 'white',
            padding: '16px 32px', borderRadius: 14,
            fontSize: 22, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span>Unisciti alla corsa</span>
            <Icon d={ICONS.arrow} size={24} color="white" />
          </div>
          <div style={{ fontSize: 16, color: '#9CA3AF' }}>
            vieniacorrere.it
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        // Cache lato CDN: gli scraper (WhatsApp, Telegram, ecc.) ricevono
        // l'immagine già pronta invece di rigenerarla ogni volta.
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
    }
  )
}
