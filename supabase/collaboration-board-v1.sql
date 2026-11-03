-- Fantasy Archive: collaboration and discussion board v1
-- Run once in Supabase SQL Editor.
create extension if not exists pgcrypto;

alter table public.project_members
  add column if not exists can_manage_members boolean not null default false,
  add column if not exists can_delete_project boolean not null default false;

create table if not exists public.project_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  token_hash text not null unique,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_by uuid references auth.users(id),
  used_at timestamptz
);
create index if not exists project_invites_project_idx on public.project_invites(project_id);
alter table public.project_invites enable row level security;

create table if not exists public.board_threads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  title text not null check (length(trim(title)) between 1 and 200),
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists board_threads_project_idx on public.board_threads(project_id,created_at desc);
alter table public.board_threads enable row level security;

create table if not exists public.board_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.board_threads(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);
create index if not exists board_replies_thread_idx on public.board_replies(thread_id,created_at);
alter table public.board_replies enable row level security;

-- Override project-access check so a member with explicit administrative
-- permission can manage membership, without recursive RLS.
create or replace function public.archive_can_manage_members(p_project uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
 select exists(select 1 from public.projects p
               where p.id=p_project and p.owner_id=(select auth.uid()))
 or exists(select 1 from public.project_members m
           where m.project_id=p_project and m.user_id=(select auth.uid())
           and m.can_manage_members);
$$;
revoke all on function public.archive_can_manage_members(uuid) from public;
grant execute on function public.archive_can_manage_members(uuid) to authenticated;

create or replace function public.archive_can_delete_project(p_project uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
 select exists(select 1 from public.projects p
               where p.id=p_project and p.owner_id=(select auth.uid()))
 or exists(select 1 from public.project_members m
           where m.project_id=p_project and m.user_id=(select auth.uid())
           and m.can_delete_project);
$$;
revoke all on function public.archive_can_delete_project(uuid) from public;
grant execute on function public.archive_can_delete_project(uuid) to authenticated;

drop policy if exists "Delete projects by permission" on public.projects;
create policy "Delete projects by permission" on public.projects
for delete to authenticated using (public.archive_can_delete_project(id));

drop policy if exists "Owners delete projects" on public.projects;

drop policy if exists "Update members by permission" on public.project_members;
create policy "Update members by permission" on public.project_members
for update to authenticated
using (public.archive_can_manage_members(project_id))
with check (public.archive_can_manage_members(project_id));

drop policy if exists "Remove members by permission" on public.project_members;
create policy "Remove members by permission" on public.project_members
for delete to authenticated using (public.archive_can_manage_members(project_id));

drop policy if exists "Read threads" on public.board_threads;
create policy "Read threads" on public.board_threads
for select to authenticated using (public.archive_access(project_id));
drop policy if exists "Create threads" on public.board_threads;
create policy "Create threads" on public.board_threads
for insert to authenticated
with check (author_id=(select auth.uid()) and public.archive_access(project_id,true));
drop policy if exists "Edit own threads" on public.board_threads;
create policy "Edit own threads" on public.board_threads
for update to authenticated
using (author_id=(select auth.uid()) and public.archive_access(project_id,true))
with check (author_id=(select auth.uid()) and public.archive_access(project_id,true));
drop policy if exists "Delete own threads" on public.board_threads;
create policy "Delete own threads" on public.board_threads
for delete to authenticated
using (author_id=(select auth.uid()) and public.archive_access(project_id,true));

-- Reply policies use a SECURITY DEFINER lookup to avoid exposing other realms.
create or replace function public.archive_thread_access(p_thread uuid,p_write boolean default false)
returns boolean language sql stable security definer set search_path = ''
as $$
 select exists(select 1 from public.board_threads t
 where t.id=p_thread and public.archive_access(t.project_id,p_write));
$$;
revoke all on function public.archive_thread_access(uuid,boolean) from public;
grant execute on function public.archive_thread_access(uuid,boolean) to authenticated;

drop policy if exists "Read replies" on public.board_replies;
create policy "Read replies" on public.board_replies
for select to authenticated using (public.archive_thread_access(thread_id));
drop policy if exists "Post replies" on public.board_replies;
create policy "Post replies" on public.board_replies
for insert to authenticated
with check (author_id=(select auth.uid()) and public.archive_thread_access(thread_id,true));
drop policy if exists "Delete own replies" on public.board_replies;
create policy "Delete own replies" on public.board_replies
for delete to authenticated
using (author_id=(select auth.uid()) and public.archive_thread_access(thread_id,true));

-- Generate a one-time 7-day invitation code; only a member with
-- permission to manage members can create it.
create or replace function public.archive_create_invite(p_project uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare v_token text;
begin
 if not public.archive_can_manage_members(p_project) then
   raise exception 'Not authorized to invite members';
 end if;
 v_token := encode(extensions.gen_random_bytes(24),'hex');
 insert into public.project_invites(project_id,token_hash,created_by)
 values (p_project,encode(extensions.digest(v_token,'sha256'),'hex'),auth.uid());
 return v_token;
end;
$$;

-- Redeem a one-time invitation code for editor access.
create or replace function public.archive_redeem_invite(p_token text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_invite public.project_invites%rowtype;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 select * into v_invite from public.project_invites
 where token_hash=encode(extensions.digest(p_token,'sha256'),'hex')
 and used_at is null and expires_at>now()
 for update;
 if not found then raise exception 'Invitation invalid, used, or expired'; end if;
 insert into public.project_members(project_id,user_id,role)
 values (v_invite.project_id,auth.uid(),'editor')
 on conflict(project_id,user_id) do nothing;
 update public.project_invites set used_at=now(),used_by=auth.uid()
 where id=v_invite.id;
 return v_invite.project_id;
end;
$$;
revoke all on function public.archive_create_invite(uuid) from public;
revoke all on function public.archive_redeem_invite(text) from public;
grant execute on function public.archive_create_invite(uuid) to authenticated;
grant execute on function public.archive_redeem_invite(text) to authenticated;
