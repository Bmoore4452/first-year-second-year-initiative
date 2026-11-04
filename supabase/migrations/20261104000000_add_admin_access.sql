-- Dashboard access for Brian and Tiaera.
-- The dashboard signs in with Supabase Auth (anon key + user session) and reads
-- responses directly, so RLS is what limits access to the emails listed below.

-- 1. Admins allow-list
create table if not exists public.admins (
  email text primary key,
  added_at timestamptz not null default now()
);

insert into public.admins (email) values
  ('brianlmoore803@gmail.com'),
  ('tiaerapaulette24@gmail.com')
on conflict (email) do nothing;

-- 2. A signed-in user can see only their own admin row.
-- The dashboard uses this to check "am I allowed in?"
alter table public.admins enable row level security;

drop policy if exists "users can see own admin row" on public.admins;
create policy "users can see own admin row"
  on public.admins for select
  to authenticated
  using (email = auth.jwt() ->> 'email');

-- 3. Admins can read every response. No insert/update/delete policies are added,
-- so the dashboard is read-only; the form still writes through the API's service role key.
drop policy if exists "admins can read responses" on public.responses;
create policy "admins can read responses"
  on public.responses for select
  to authenticated
  using (
    exists (
      select 1 from public.admins
      where email = auth.jwt() ->> 'email'
    )
  );
