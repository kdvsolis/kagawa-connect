-- Admin / reports / worker rates / priority / onboarding flags
-- Run after earlier KaGawa migrations.

-- ---------------------------------------------------------------------------
-- Profiles: rates, priority, onboarding, moderation
-- (phone already exists — used as public contact after match)
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists hourly_rate numeric(10,2);

alter table public.profiles
  add column if not exists day_rate numeric(10,2);

alter table public.profiles
  add column if not exists priority_online boolean not null default false;

alter table public.profiles
  add column if not exists onboarding_complete boolean not null default false;

alter table public.profiles
  add column if not exists paused boolean not null default false;

-- pending | approved | rejected — complements boolean verified
alter table public.profiles
  add column if not exists verification_status text
  check (
    verification_status is null
    or verification_status in ('pending', 'approved', 'rejected')
  );

-- Seeded demo accounts already verified
update public.profiles
  set onboarding_complete = true,
      verification_status = 'approved',
      verified = true
  where id in (
    'a0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000004',
    'a0000000-0000-4000-8000-000000000005',
    'a0000000-0000-4000-8000-000000000006'
  );

-- Sample worker rates (match app seeds)
update public.profiles set hourly_rate = 350, day_rate = 2500, priority_online = true
  where id = 'a0000000-0000-4000-8000-000000000002';
update public.profiles set hourly_rate = 180, day_rate = 1400
  where id = 'a0000000-0000-4000-8000-000000000003';
update public.profiles set hourly_rate = 400, day_rate = 2800
  where id = 'a0000000-0000-4000-8000-000000000004';
update public.profiles set hourly_rate = 300, day_rate = 2200
  where id = 'a0000000-0000-4000-8000-000000000006';

-- ---------------------------------------------------------------------------
-- Jobs: pricing mode + no flat booking fee by default
-- ---------------------------------------------------------------------------

alter table public.jobs
  add column if not exists pricing_mode text
  check (pricing_mode is null or pricing_mode in ('hourly', 'daily'));

update public.jobs set pricing_mode = 'hourly' where pricing_mode is null;

alter table public.jobs
  alter column booking_fee set default 0;

-- ---------------------------------------------------------------------------
-- Reports (customer ↔ worker → KaGawa admin)
-- ---------------------------------------------------------------------------

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id),
  reported_id uuid references public.profiles(id),
  job_id uuid references public.jobs(id) on delete set null,
  role text not null check (role in ('customer', 'worker')),
  reason text not null check (reason in (
    'harassment',
    'unsafe',
    'no_show',
    'payment',
    'fake_profile',
    'other'
  )),
  details text not null default '',
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  admin_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists reports_status_idx on public.reports (status, created_at desc);
create index if not exists reports_job_idx on public.reports (job_id);

alter table public.reports enable row level security;

drop policy if exists "kagawa_reports_all" on public.reports;
create policy "kagawa_reports_all" on public.reports
  for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.reports to anon, authenticated;
