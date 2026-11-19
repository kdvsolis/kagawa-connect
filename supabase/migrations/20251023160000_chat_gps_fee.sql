-- Chat, GPS coords, booking fee paid flag. Safe to re-run.

alter table public.profiles
  add column if not exists lat double precision;

alter table public.profiles
  add column if not exists lng double precision;

alter table public.jobs
  add column if not exists lat double precision;

alter table public.jobs
  add column if not exists lng double precision;

alter table public.jobs
  add column if not exists booking_fee_paid boolean not null default false;

alter table public.jobs
  add column if not exists booking_fee_paid_at timestamptz;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text not null,
  flagged boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists messages_job_created_idx
  on public.messages (job_id, created_at);

alter table public.messages enable row level security;

drop policy if exists "kagawa_messages_all" on public.messages;
create policy "kagawa_messages_all" on public.messages
  for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.messages to anon, authenticated;

-- Seed coords for demo profiles (Makati barangays)
update public.profiles set lat = 14.5652, lng = 121.0148
  where id in (
    'a0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000006'
  );
update public.profiles set lat = 14.5658, lng = 121.0295
  where id in (
    'a0000000-0000-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000005'
  );
update public.profiles set lat = 14.5631, lng = 121.0272
  where id = 'a0000000-0000-4000-8000-000000000004';

update public.jobs set lat = 14.5652, lng = 121.0148, booking_fee_paid = true
  where id = 'b0000000-0000-4000-8000-000000000001';
update public.jobs set lat = 14.5652, lng = 121.0148, booking_fee_paid = true
  where id = 'b0000000-0000-4000-8000-000000000002';
