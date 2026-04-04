-- Permet aux clients API (anon) de passer une alerte en dismissed.
-- USING + WITH CHECK explicites pour les UPDATE sous RLS.
drop policy if exists "alerts_update" on public.alerts;

create policy "alerts_update" on public.alerts
  for update
  using (true)
  with check (true);

grant select, insert, update on table public.alerts to anon, authenticated;
