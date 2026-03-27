-- Run in Supabase SQL Editor. Adjust if tables already exist.

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  type text not null check (type in ('routine', 'urgent')),
  status text not null default 'active' check (status in ('active', 'dismissed')),
  created_at timestamptz not null default now()
);

create table if not exists public.scheduled_messages (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  type text not null check (type in ('routine', 'urgent')),
  days text not null default '0,1,2,3,4,5,6',
  time text not null default '09:00',
  active boolean not null default true
);

alter table public.alerts enable row level security;
alter table public.scheduled_messages enable row level security;

create policy "alerts_select" on public.alerts for select using (true);
create policy "alerts_insert" on public.alerts for insert with check (true);
create policy "alerts_update" on public.alerts for update using (true);

create policy "scheduled_select" on public.scheduled_messages for select using (true);
create policy "scheduled_insert" on public.scheduled_messages for insert with check (true);
create policy "scheduled_update" on public.scheduled_messages for update using (true);
create policy "scheduled_delete" on public.scheduled_messages for delete using (true);

-- Realtime: Dashboard → Database → Replication → enable alerts (or run:)
alter publication supabase_realtime add table public.alerts;
