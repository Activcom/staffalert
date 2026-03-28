-- Passe days (texte CSV) → integer[] pour PostgREST / typage cohérent.
-- À exécuter si la table existe déjà avec `days text`.

alter table public.scheduled_messages
  alter column days drop default;

alter table public.scheduled_messages
  alter column days type integer[]
  using (
    coalesce(
      (
        select array_agg(v order by v)
        from (
          select distinct (trim(both from u))::integer as v
          from unnest(string_to_array(trim(coalesce(days::text, '')), ',')) as u
          where trim(both from u) ~ '^[0-9]+$'
            and (trim(both from u))::integer between 0 and 6
        ) t
      ),
      '{0,1,2,3,4,5,6}'::integer[]
    )
  );

alter table public.scheduled_messages
  alter column days set default '{0,1,2,3,4,5,6}'::integer[];
