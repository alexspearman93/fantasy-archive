-- Fantasy Archive v0.5 — The Chronicle Update
-- Run once in Supabase SQL Editor before using the new editor.
-- Stores previous chapter text and prevents stale saves from overwriting newer edits.

alter table public.chapters add column if not exists revision integer not null default 1;

create table if not exists public.chapter_revisions (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  revision integer not null,
  title text not null,
  body text not null,
  saved_by uuid references auth.users(id),
  saved_at timestamptz not null default now(),
  unique (chapter_id, revision)
);
create index if not exists chapter_revisions_lookup
  on public.chapter_revisions(chapter_id, revision desc);
alter table public.chapter_revisions enable row level security;

drop policy if exists "Read chapter history" on public.chapter_revisions;
create policy "Read chapter history" on public.chapter_revisions
for select to authenticated using (public.archive_access(project_id));

-- Save through one atomic transaction. The chapter row is locked while
-- checking its revision; stale saves raise a conflict instead of overwriting.
create or replace function public.archive_save_chapter(
  p_chapter uuid, p_expected_revision integer, p_title text, p_body text
)
returns integer language plpgsql security definer set search_path = ''
as $$
declare v_chapter public.chapters%rowtype; v_next integer;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select * into v_chapter from public.chapters
    where id=p_chapter for update;
  if not found then raise exception 'Chapter not found'; end if;
  if not public.archive_access(v_chapter.project_id,true) then
    raise exception 'Not authorized to edit this chapter';
  end if;
  if v_chapter.revision<>p_expected_revision then
    raise exception 'CHAPTER_CONFLICT: another version was saved. Copy your draft before reloading.';
  end if;
  if v_chapter.title is not distinct from p_title
     and v_chapter.body is not distinct from p_body then
    return v_chapter.revision;
  end if;
  insert into public.chapter_revisions(chapter_id,project_id,revision,title,body,saved_by)
  values(v_chapter.id,v_chapter.project_id,v_chapter.revision,v_chapter.title,v_chapter.body,auth.uid())
  on conflict(chapter_id,revision) do nothing;
  v_next:=v_chapter.revision+1;
  update public.chapters set title=p_title,body=p_body,revision=v_next
    where id=p_chapter;
  return v_next;
end;
$$;

create or replace function public.archive_restore_chapter(
  p_chapter uuid, p_expected_revision integer, p_restore_revision integer
)
returns integer language plpgsql security definer set search_path = ''
as $$
declare v_old public.chapter_revisions%rowtype;
begin
  select * into v_old from public.chapter_revisions
    where chapter_id=p_chapter and revision=p_restore_revision;
  if not found then raise exception 'Revision not found'; end if;
  return public.archive_save_chapter(
    p_chapter,p_expected_revision,v_old.title,v_old.body
  );
end;
$$;

revoke all on function public.archive_save_chapter(uuid,integer,text,text) from public;
revoke all on function public.archive_restore_chapter(uuid,integer,integer) from public;
grant execute on function public.archive_save_chapter(uuid,integer,text,text) to authenticated;
grant execute on function public.archive_restore_chapter(uuid,integer,integer) to authenticated;

-- Disallow direct chapter updates so all writes pass through the version check.
drop policy if exists "Update chapters" on public.chapters;
