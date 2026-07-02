import { NextResponse } from 'next/server'
import { guardAdminApi } from '@/lib/admin/api-guard'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { notifyUser } from '@/lib/admin/notify'

type Action = 'warning' | 'suspension' | 'ban' | 'revoke'

/**
 * Provvedimenti di moderazione utente. Le scritture avvengono via service-role
 * (l'update di profiles.moderation_status non è coperto da policy authenticated).
 * La guardia garantisce che il chiamante sia admin AAL2.
 */
export async function POST(request: Request) {
  const guard = await guardAdminApi()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  const { user: admin } = guard

  const { userId, action, reason, note, days } = await request.json().catch(() => ({}))
  if (!userId || !action) return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 })
  if (userId === admin.id) return NextResponse.json({ error: 'Non puoi moderare te stesso' }, { status: 400 })
  if (action !== 'revoke' && (!reason || !String(reason).trim())) {
    return NextResponse.json({ error: 'Motivazione obbligatoria' }, { status: 400 })
  }

  const svc = createServiceRoleClient()

  // Nome per le comunicazioni
  const { data: target } = await svc.from('profiles').select('full_name, warned_count').eq('id', userId).maybeSingle()
  if (!target) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
  const name = target.full_name ?? 'runner'

  const act = action as Action
  const now = new Date()

  if (act === 'revoke') {
    await svc.from('profiles').update({ moderation_status: 'active', moderation_until: null }).eq('id', userId)
    await svc.from('user_moderation').update({ revoked_at: now.toISOString(), revoked_by: admin.id })
      .eq('user_id', userId).is('revoked_at', null).in('action', ['suspension', 'ban'])
    await svc.from('admin_actions').insert({
      admin_id: admin.id, action_type: 'user.moderation_revoked', entity_table: 'profiles', entity_id: userId,
    })
    await notifyUser(svc, {
      userId, recipientName: name, type: 'account_riattivato',
      title: 'Il tuo account è di nuovo attivo',
      body: 'Il provvedimento a tuo carico è stato revocato. Puoi tornare a usare Vieni a correre? normalmente.',
      tone: 'neutral', withEmail: true,
    })
    return NextResponse.json({ ok: true })
  }

  const expires = act === 'suspension'
    ? new Date(now.getTime() + Math.max(1, Number(days) || 7) * 86400_000)
    : null

  // Storico
  await svc.from('user_moderation').insert({
    user_id: userId, admin_id: admin.id, action: act,
    reason: String(reason).trim(), note: note ? String(note).trim() : null,
    expires_at: expires?.toISOString() ?? null,
  })

  // Stato materializzato su profiles
  const patch: Record<string, unknown> =
    act === 'warning' ? { moderation_status: 'warned', warned_count: (target.warned_count ?? 0) + 1 }
    : act === 'suspension' ? { moderation_status: 'suspended', moderation_until: expires!.toISOString() }
    : { moderation_status: 'banned', moderation_until: null }
  await svc.from('profiles').update(patch).eq('id', userId)

  await svc.from('admin_actions').insert({
    admin_id: admin.id, action_type: `user.${act}`, entity_table: 'profiles', entity_id: userId,
    reason: String(reason).trim(), metadata: expires ? { until: expires.toISOString() } : {},
  })

  // Comunicazione all'utente
  const comms = {
    warning: {
      type: 'account_ammonito', tone: 'warning' as const,
      title: 'Hai ricevuto un avvertimento',
      body: `Il tuo comportamento su Vieni a correre? ha richiesto un richiamo.\n\nMotivo: ${reason}\n\nTi invitiamo a rispettare le regole della community. In caso di ulteriori segnalazioni potremmo sospendere l'account.`,
    },
    suspension: {
      type: 'account_sospeso', tone: 'danger' as const,
      title: 'Il tuo account è stato sospeso',
      body: `Il tuo account è sospeso fino al ${expires!.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}.\n\nMotivo: ${reason}\n\nDurante la sospensione puoi navigare ma non creare o partecipare a corse.`,
    },
    ban: {
      type: 'account_bannato', tone: 'danger' as const,
      title: 'Il tuo account è stato bloccato',
      body: `Il tuo account è stato bloccato in modo permanente.\n\nMotivo: ${reason}\n\nSe ritieni si tratti di un errore, rispondi a questa email.`,
    },
  }[act]

  await notifyUser(svc, { userId, recipientName: name, withEmail: true, ...comms })

  return NextResponse.json({ ok: true })
}
