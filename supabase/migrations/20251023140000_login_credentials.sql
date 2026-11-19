-- Additive: username/password for demo login (already applied DBs).
-- Safe to re-run. Demo plaintext until Supabase Auth.

alter table public.profiles
  add column if not exists username text;

alter table public.profiles
  add column if not exists password text;

create unique index if not exists profiles_username_uidx
  on public.profiles (username)
  where username is not null;

update public.profiles set username = 'ana',    password = 'kagawa123'
  where id = 'a0000000-0000-4000-8000-000000000001';
update public.profiles set username = 'ben',    password = 'kagawa123'
  where id = 'a0000000-0000-4000-8000-000000000005';
update public.profiles set username = 'juan',   password = 'kagawa123'
  where id = 'a0000000-0000-4000-8000-000000000002';
update public.profiles set username = 'maria',  password = 'kagawa123'
  where id = 'a0000000-0000-4000-8000-000000000003';
update public.profiles set username = 'rico',   password = 'kagawa123'
  where id = 'a0000000-0000-4000-8000-000000000004';
update public.profiles set username = 'worker', password = 'kagawa123'
  where id = 'a0000000-0000-4000-8000-000000000006';
