-- Lets PostgREST reload its schema cache (used by server action with service_role key).
-- Run in SQL Editor if you prefer not to use the migration runner.

create or replace function public.reload_postgrest_schema()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_notify('pgrst', 'reload schema');
end;
$$;

revoke all on function public.reload_postgrest_schema() from public;
grant execute on function public.reload_postgrest_schema() to service_role;
