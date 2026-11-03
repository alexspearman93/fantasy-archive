-- Fantasy Archive v0.8: directed connections between world entries.
create table if not exists public.archive_links (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete cascade,
 source_id uuid not null references public.archive_entries(id) on delete cascade,
 target_id uuid not null references public.archive_entries(id) on delete cascade,
 relationship text not null check (char_length(trim(relationship)) between 1 and 80),
 created_at timestamptz not null default now(),
 check (source_id <> target_id),
 unique (source_id,target_id,relationship)
);
create index if not exists archive_links_source on public.archive_links(project_id,source_id);
create index if not exists archive_links_target on public.archive_links(project_id,target_id);
create or replace function public.archive_validate_link()
returns trigger language plpgsql set search_path = '' as $$
begin
 if not exists (
  select 1 from public.archive_entries a join public.archive_entries b
   on a.project_id=b.project_id
  where a.id=new.source_id and b.id=new.target_id and a.project_id=new.project_id
 ) then raise exception 'Linked entries must belong to the same realm'; end if;
 return new;
end;$$;
drop trigger if exists archive_link_validate on public.archive_links;
create trigger archive_link_validate before insert or update on public.archive_links
for each row execute function public.archive_validate_link();
alter table public.archive_links enable row level security;
drop policy if exists "Read realm links" on public.archive_links;
create policy "Read realm links" on public.archive_links for select to authenticated
 using (public.archive_access(project_id));
drop policy if exists "Create realm links" on public.archive_links;
create policy "Create realm links" on public.archive_links for insert to authenticated
 with check (public.archive_access(project_id,true));
drop policy if exists "Remove realm links" on public.archive_links;
create policy "Remove realm links" on public.archive_links for delete to authenticated
 using (public.archive_access(project_id,true));
