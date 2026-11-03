-- Fantasy Archive v0.7: stable chapter positions.
-- Run once in Supabase SQL Editor. Existing chapter IDs and text remain unchanged.
alter table public.chapters add column if not exists chapter_order bigint;
-- Existing rows receive fixed positions. Numeric chapter titles take priority.
with ranked as (
 select id, row_number() over (
  partition by project_id
  order by
   case when title ~* '^\\s*(chapter|ch\\.?)[[:space:]]*[0-9]+' then 0 else 1 end,
   case when title ~* '^\\s*(chapter|ch\\.?)[[:space:]]*[0-9]+'
     then substring(title from '[0-9]+')::bigint else null end nulls last,
   lower(title), id
 ) as position
 from public.chapters
)
update public.chapters c set chapter_order=r.position
from ranked r where c.id=r.id and c.chapter_order is null;

create or replace function public.archive_assign_chapter_order()
returns trigger language plpgsql set search_path = '' as $$
begin
 if new.chapter_order is null then
  perform pg_advisory_xact_lock(hashtextextended(new.project_id::text, 0));
  select coalesce(max(c.chapter_order),0)+1 into new.chapter_order
  from public.chapters c where c.project_id=new.project_id;
 end if;
 return new;
end;
$$;
drop trigger if exists archive_chapter_order_insert on public.chapters;
create trigger archive_chapter_order_insert before insert on public.chapters
for each row execute function public.archive_assign_chapter_order();
create index if not exists chapters_realm_order on public.chapters(project_id,chapter_order,id);
