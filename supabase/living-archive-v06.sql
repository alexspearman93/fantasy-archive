-- Fantasy Archive: The Living Archive
create table if not exists public.writer_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check (char_length(display_name) between 1 and 40),
 updated_at timestamptz not null default now()
);
alter table public.writer_profiles enable row level security;
drop policy if exists "Read fellow writers" on public.writer_profiles;
create policy "Read fellow writers" on public.writer_profiles for select to authenticated
using (user_id=auth.uid() or exists (
 select 1 from public.projects p where
 (p.owner_id=auth.uid() or public.archive_access(p.id))
 and (p.owner_id=writer_profiles.user_id or exists (
  select 1 from public.project_members m where m.project_id=p.id and m.user_id=writer_profiles.user_id
 ))
));
drop policy if exists "Create own profile" on public.writer_profiles;
create policy "Create own profile" on public.writer_profiles for insert to authenticated with check (user_id=auth.uid());
drop policy if exists "Edit own profile" on public.writer_profiles;
create policy "Edit own profile" on public.writer_profiles for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

create table if not exists public.chapter_presence (
 project_id uuid not null references public.projects(id) on delete cascade,
 chapter_id uuid not null references public.chapters(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 last_seen timestamptz not null default now(),
 primary key(chapter_id,user_id)
);
create index if not exists chapter_presence_recent on public.chapter_presence(chapter_id,last_seen desc);
alter table public.chapter_presence enable row level security;
drop policy if exists "Read realm presence" on public.chapter_presence;
create policy "Read realm presence" on public.chapter_presence for select to authenticated using(public.archive_access(project_id));
drop policy if exists "Set own presence" on public.chapter_presence;
create policy "Set own presence" on public.chapter_presence for insert to authenticated with check(user_id=auth.uid() and public.archive_access(project_id) and exists(select 1 from public.chapters c where c.id=chapter_id and c.project_id=chapter_presence.project_id));
drop policy if exists "Refresh own presence" on public.chapter_presence;
create policy "Refresh own presence" on public.chapter_presence for update to authenticated using(user_id=auth.uid() and public.archive_access(project_id)) with check(user_id=auth.uid() and public.archive_access(project_id));
drop policy if exists "Remove own presence" on public.chapter_presence;
create policy "Remove own presence" on public.chapter_presence for delete to authenticated using(user_id=auth.uid());
