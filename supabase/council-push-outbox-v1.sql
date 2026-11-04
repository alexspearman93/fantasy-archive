-- Fantasy Archive: durable Council notification outbox.
-- Run after push-subscriptions-v1.sql.
create table if not exists public.council_push_outbox (
 id bigint generated always as identity primary key,
 project_id uuid not null references public.projects(id) on delete cascade,
 actor_id uuid not null references auth.users(id),
 thread_id uuid not null references public.board_threads(id) on delete cascade,
 event_kind text not null check (event_kind in ('thread','reply')),
 event_id uuid not null,
 created_at timestamptz not null default now(),
 delivered_at timestamptz,
 unique(event_kind,event_id)
);
create index if not exists council_push_outbox_pending on public.council_push_outbox(created_at) where delivered_at is null;
alter table public.council_push_outbox enable row level security;
-- No client policies: only trusted server-side workers may read this queue.
create or replace function public.archive_enqueue_council_push()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_project uuid;
begin
 if TG_TABLE_NAME = 'board_threads' then
  v_project := NEW.project_id;
  insert into public.council_push_outbox(project_id,actor_id,thread_id,event_kind,event_id)
  values(v_project,NEW.author_id,NEW.id,'thread',NEW.id) on conflict do nothing;
 else
  select project_id into v_project from public.board_threads where id=NEW.thread_id;
  if v_project is not null then
   insert into public.council_push_outbox(project_id,actor_id,thread_id,event_kind,event_id)
   values(v_project,NEW.author_id,NEW.thread_id,'reply',NEW.id) on conflict do nothing;
  end if;
 end if;
 return NEW;
end;
$$;
revoke all on function public.archive_enqueue_council_push() from public;
drop trigger if exists archive_council_thread_push on public.board_threads;
create trigger archive_council_thread_push after insert on public.board_threads
for each row execute function public.archive_enqueue_council_push();
drop trigger if exists archive_council_reply_push on public.board_replies;
create trigger archive_council_reply_push after insert on public.board_replies
for each row execute function public.archive_enqueue_council_push();
