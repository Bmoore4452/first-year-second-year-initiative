-- Tiaera's dashboard login uses her CAU student email instead of her Gmail.
-- Supabase Auth stores emails in lowercase, and RLS compares against the JWT email,
-- so allow-list entries must be lowercase too.

delete from public.admins where email = 'tiaerapaulette24@gmail.com';

insert into public.admins (email) values
  ('tiaera.pritchett@students.cau.edu')
on conflict (email) do nothing;

alter table public.admins
  drop constraint if exists admins_email_lowercase,
  add constraint admins_email_lowercase check (email = lower(email));
