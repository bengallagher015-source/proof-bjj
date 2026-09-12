-- PROOF cloud sync — one row per user, the whole record as a jsonb blob.
-- Safe to run repeatedly. Run in Supabase → SQL Editor (project tawgickecvgsxfrsbcgl,
-- shared with REBUILD so one login covers both apps). RLS: a user can only ever
-- see or write their own row. Nobody else can read it — not even a coach.

create table if not exists public.proof_users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  name        text,
  data        jsonb not null default '{}'::jsonb,
  saved_at    bigint not null default 0,         -- mirrors state.savedAt for conflict checks
  updated_at  timestamptz not null default now()
);
alter table public.proof_users enable row level security;

drop policy if exists proof_own_select on public.proof_users;
drop policy if exists proof_own_insert on public.proof_users;
drop policy if exists proof_own_update on public.proof_users;

create policy proof_own_select on public.proof_users for select using (auth.uid() = id);
create policy proof_own_insert on public.proof_users for insert with check (auth.uid() = id);
create policy proof_own_update on public.proof_users for update using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;
drop trigger if exists proof_users_touch on public.proof_users;
create trigger proof_users_touch before update on public.proof_users for each row execute function public.touch_updated_at();

notify pgrst, 'reload schema';
