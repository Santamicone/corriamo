import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAdminContext } from '@/lib/admin/guard'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { CrewEditForm, type CrewEditInitial } from './CrewEditForm'

export default async function AdminModificaCrewPage({ params }: { params: Promise<{ id: string }> }) {
  await getAdminContext()
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()

  // Service-role: le schede nascoste o in attesa non sono leggibili con la RLS normale
  const svc = createServiceRoleClient()
  const { data: crew } = await svc
    .from('crews')
    .select('id, slug, name, city, zone, crew_type, meeting_point, schedule_text, website_url, instagram_url, description, avatar_url, lat, lng, pin_precision, show_on_map, owner_id, last_confirmed_at')
    .eq('id', id)
    .maybeSingle()
  if (!crew) notFound()

  const back = (
    <Link href="/admin/crew" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
      <span className="material-symbols-outlined text-base">arrow_back</span> Crew
    </Link>
  )

  if (crew.owner_id !== null) {
    return (
      <div>
        {back}
        <h1 className="text-2xl font-extrabold text-gray-900 mb-1">{crew.name}</h1>
        <p className="text-sm text-gray-600 bg-white rounded-2xl border border-gray-100 p-6">
          Questa crew ha un gestore: i suoi dati li modifica lui. Da qui puoi solo nasconderla o segnarla come non più attiva.
        </p>
      </div>
    )
  }

  const { data: contact } = await svc.from('crew_contacts').select('email, origin').eq('crew_id', id).maybeSingle()

  const initial: CrewEditInitial = {
    id: crew.id,
    slug: crew.slug,
    name: crew.name ?? '',
    city: crew.city ?? '',
    zone: crew.zone ?? '',
    crew_type: crew.crew_type ?? 'running_club',
    meeting_point: crew.meeting_point ?? '',
    schedule_text: crew.schedule_text ?? '',
    website_url: crew.website_url ?? '',
    instagram_url: crew.instagram_url ?? '',
    description: crew.description ?? '',
    avatar_url: crew.avatar_url ?? '',
    lat: crew.lat ?? null,
    lng: crew.lng ?? null,
    show_on_map: !!crew.show_on_map,
    last_confirmed_at: crew.last_confirmed_at ?? null,
    // L'email "dichiarata" da chi rivendica non si mostra né si modifica da qui
    contact_email: contact?.origin === 'dichiarata' ? null : (contact?.email ?? ''),
  }

  return (
    <div>
      {back}
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Modifica crew</h1>
      <p className="text-sm text-gray-500 mb-6">
        Gli indirizzi della scheda non cambiano (resta <span className="font-mono">/crew/{crew.slug ?? crew.id}</span>).
        I controlli sono gli stessi dell’import.
      </p>
      <CrewEditForm initial={initial} />
    </div>
  )
}
