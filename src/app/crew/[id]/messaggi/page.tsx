import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/Header'
import { MessagesClient, type Person } from './MessagesClient'

export const metadata: Metadata = { robots: { index: false, follow: false } }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function CrewMessagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ con?: string }>
}) {
  const { id } = await params
  const { con } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/crew/${id}/messaggi`)

  const { data: crew } = await supabase
    .from('crews')
    .select('id, name, slug')
    .eq(UUID_RE.test(id) ? 'id' : 'slug', id)
    .single()
  if (!crew) notFound()

  const crewHref = `/crew/${crew.slug ?? crew.id}`

  const { data: members } = await supabase
    .from('crew_members')
    .select('user_id, role, status, user:profiles!user_id(id, full_name, avatar_url)')
    .eq('crew_id', crew.id)
    .eq('status', 'active')

  type Row = { user_id: string; role: string; status: string; user: { id: string; full_name: string; avatar_url: string | null } | { id: string; full_name: string; avatar_url: string | null }[] | null }
  const rows = (members ?? []) as unknown as Row[]
  const me = rows.find((m) => m.user_id === user.id)

  if (!me) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center p-8 text-center">
          <div className="max-w-sm">
            <h1 className="text-xl font-extrabold text-gray-900 mb-2">Messaggi riservati</h1>
            <p className="text-sm text-gray-500 mb-5">I messaggi della crew sono visibili solo ai membri.</p>
            <Link href={crewHref} className="text-primary font-semibold text-sm">Torna alla crew</Link>
          </div>
        </main>
      </div>
    )
  }

  const people: Person[] = rows.map((m) => {
    const u = Array.isArray(m.user) ? m.user[0] : m.user
    return {
      id: m.user_id,
      name: u?.full_name ?? 'Utente',
      avatarUrl: u?.avatar_url ?? null,
      isManager: m.role === 'owner' || m.role === 'admin',
    }
  })

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gray-50">
        <MessagesClient
          crewId={crew.id}
          crewName={crew.name}
          crewHref={crewHref}
          userId={user.id}
          isManager={me.role === 'owner' || me.role === 'admin'}
          people={people}
          initialWith={con && UUID_RE.test(con) ? con : null}
        />
      </main>
    </div>
  )
}
