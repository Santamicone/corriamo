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
    .select('*, organizer:profiles!runs_organizer_id_fkey(full_name, city)')
    .eq('id', id)
    .single()

  // Fallback se la corsa non esiste
  const title     = run?.title ?? 'Una corsa ti aspetta'
  const dateStr   = run?.date ? format(parseISO(run.date), "d MMMM yyyy", { locale: it }) : ''
  const timeStr   = run?.time ? run.time.slice(0, 5) : ''
  const city      = run?.city ?? ''
  const location  = run?.location ?? ''
  const level     = run?.level ?? 'tutti'
  const distKm    = run?.distance_km
  const isNoDrop  = run?.is_no_drop ?? false
  const organizer = run?.organizer?.full_name ?? ''

  const lc = LEVEL_COLORS[level] ?? LEVEL_COLORS.tutti

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
            <span style={{ color: 'white', fontSize: 22 }}>🏃</span>
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
          <div style={{ fontSize: 18, color: '#6B7280', marginBottom: 28 }}>
            Organizzata da {organizer}{city ? ` · ${city}` : ''}
          </div>
        )}

        {/* Meta row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, marginBottom: 32 }}>
          {dateStr && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 22, color: '#374151', fontWeight: 600 }}>
              <span>📅</span><span>{dateStr}</span>
            </div>
          )}
          {timeStr && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 22, color: '#374151', fontWeight: 600 }}>
              <span>⏰</span><span>Ore {timeStr}</span>
            </div>
          )}
          {location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 22, color: '#374151', fontWeight: 600 }}>
              <span>📍</span><span>{location}</span>
            </div>
          )}
          {distKm && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 22, color: '#374151', fontWeight: 600 }}>
              <span>🏃</span><span>{distKm} km</span>
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
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              ❤️ No drop
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
            <span style={{ fontSize: 24 }}>→</span>
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
    }
  )
}
