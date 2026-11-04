-- Fantasy Archive: per-device opt-in subscriptions.
create table if not exists public.push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null unique,
 p256dh text not null,
 auth_secret text not null,
 created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
create policy "Own subscriptions read" on public.push_subscriptions for select to authenticated using (user_id = (select auth.uid()));
create policy "Own subscriptions insert" on public.push_subscriptions for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Own subscriptions delete" on public.push_subscriptions for delete to authenticated using (user_id = (select auth.uid()));
-- Do not add a public read policy: subscription endpoints and encryption keys are private.
-- Server-side push delivery must use a trusted service role and check realm membership.
