-- Check-in: correzione della policy di inserimento — SQL #57
--
-- Perché (sicurezza)
--   In check-ins.sql la sottoquery su `participations` usava `run_id = run_id` senza prefisso:
--   PostgreSQL lo risolve in `participations.run_id = participations.run_id`, sempre vero.
--   Risultato: chi era approvato in UNA corsa qualsiasi poteva fare check-in in TUTTE.
--
-- Cosa fa
--   Ricrea check_ins_insert: ci si registra solo per sé, e solo se si organizza QUELLA corsa
--   o si è approvati in QUELLA corsa. La policy restrittiva sugli utenti sospesi resta.
--
-- COMPATIBILITÀ: sito e app inseriscono solo il proprio check-in da organizzatore o approvato.
-- Non tocca dati: i check-in già presenti restano (la query finale conta quelli sospetti).
--
-- Si può eseguire subito, indipendentemente dal #58.
-- Rollback: supabase/checkins-fix-rollback.sql (reintroduce l'errore).

begin;

drop policy if exists "check_ins_insert" on public.check_ins;
create policy "check_ins_insert" on public.check_ins
  for insert with check (
    check_ins.user_id = auth.uid()
    and (
      exists (select 1 from public.runs r
               where r.id = check_ins.run_id and r.organizer_id = auth.uid())
      or
      exists (select 1 from public.participations p
               where p.run_id = check_ins.run_id
                 and p.user_id = auth.uid()
                 and p.status = 'approvata')
    )
  );

-- Nessun'altra policy permissiva deve riaprire l'inserimento
do $$
declare
  v_extra text;
begin
  select string_agg(policyname || ' (' || cmd || ')', ', ') into v_extra
  from pg_policies
  where schemaname = 'public' and tablename = 'check_ins'
    and permissive = 'PERMISSIVE'
    and cmd in ('INSERT', 'ALL')
    and policyname <> 'check_ins_insert';

  if v_extra is not null then
    raise exception 'Policy inattese su check_ins: %. Niente è stato modificato.', v_extra;
  end if;
end;
$$;

commit;

-- Risultato atteso: policy_corretta = true.
-- checkin_senza_approvazione > 0 non prova un abuso: conta anche chi ha perso l'approvazione dopo.
select
  (select with_check like '%p.run_id = check_ins.run_id%'
     from pg_policies
    where schemaname = 'public' and tablename = 'check_ins' and policyname = 'check_ins_insert') as policy_corretta,
  (select count(*) from public.check_ins ci
     join public.runs r on r.id = ci.run_id
    where ci.user_id <> r.organizer_id
      and not exists (select 1 from public.participations p
                       where p.run_id = ci.run_id and p.user_id = ci.user_id
                         and p.status = 'approvata')) as checkin_senza_approvazione;
