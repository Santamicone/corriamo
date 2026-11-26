-- Rollback di #57 (checkins-fix.sql).
-- ATTENZIONE: reintroduce l'errore di check-ins.sql (chi è approvato in una corsa qualsiasi può
-- fare check-in in tutte). Da usare solo se il #57 impedisse check-in leciti.

drop policy if exists "check_ins_insert" on public.check_ins;
create policy "check_ins_insert" on public.check_ins
  for insert with check (
    user_id = auth.uid()
    and (
      exists (select 1 from public.runs where id = run_id and organizer_id = auth.uid())
      or
      exists (select 1 from public.participations
               where run_id = run_id and user_id = auth.uid() and status = 'approvata')
    )
  );
