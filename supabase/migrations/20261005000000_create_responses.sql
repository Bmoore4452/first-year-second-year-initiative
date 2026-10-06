create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text,
  class_year text not null,
  fields_of_interest text[] not null default '{}',
  population_interests text[] not null default '{}',
  academic_topics text[] not null default '{}',
  professional_topics text[] not null default '{}'
);

-- The server uses the service role key, which bypasses RLS.
-- Enabling RLS with no policies blocks the public anon key from reading or writing.
alter table public.responses enable row level security;
