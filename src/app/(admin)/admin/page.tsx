import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/guard'

function Kpi({ label, value, href, icon }: { label: string; value: number; href: string; icon: string }) {
  return (
    <Link href={href}
      className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-300 transition-colors">
      <div className="flex items-center gap-2 text-gray-400 mb-2">
        <span className="material-symbols-outlined text-lg">{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-3xl font-extrabold text-gray-900">{value}</div>
    </Link>
  )
}

export default async function AdminDashboard() {
  const { supabase } = await requireAdmin()

  // Conteggi aggregati (head:true → nessun payload, solo il count)
  const [gare, segnalazioni, sospesi, contenuti] = await Promise.all([
    supabase.from('races').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).in('moderation_status', ['suspended', 'banned']),
    supabase.from('runs').select('id', { count: 'exact', head: true }).eq('hidden_by_admin', true),
  ])

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Dashboard</h1>
      <p className="text-sm text-gray-500 mb-6">Panoramica delle code di moderazione.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Gare in attesa" value={gare.count ?? 0} href="/admin/gare" icon="flag" />
        <Kpi label="Segnalazioni aperte" value={segnalazioni.count ?? 0} href="/admin/segnalazioni" icon="report" />
        <Kpi label="Utenti sospesi/bannati" value={sospesi.count ?? 0} href="/admin/utenti" icon="block" />
        <Kpi label="Contenuti nascosti" value={contenuti.count ?? 0} href="/admin/contenuti" icon="visibility_off" />
      </div>
    </div>
  )
}
