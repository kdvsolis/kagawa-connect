-- KaGawa schema + seed (English-first demo marketplace)
-- Safe to re-run: drops demo objects then recreates.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  username text unique,
  -- Demo-only plaintext password until Supabase Auth; do not use in production.
  password text,
  phone text,
  full_name text not null,
  role text not null check (role in ('customer', 'worker')),
  barangay text not null default '',
  city text not null default '',
  rating numeric(3,2) not null default 5.00,
  jobs_completed integer not null default 0,
  verified boolean not null default false,
  bio text,
  online boolean not null default false,
  launch_jobs_remaining integer not null default 20,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.worker_skills (
  worker_id uuid not null references public.profiles(id) on delete cascade,
  service_id text not null,
  primary key (worker_id, service_id)
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  service_id text not null,
  customer_id uuid not null references public.profiles(id),
  worker_id uuid references public.profiles(id),
  status text not null check (status in (
    'searching', 'accepted', 'en_route', 'in_progress',
    'awaiting_payment', 'completed', 'cancelled'
  )),
  address text not null,
  barangay text not null,
  city text not null,
  notes text not null default '',
  estimated_hours numeric(4,1) not null default 1,
  hourly_rate numeric(10,2) not null,
  booking_fee numeric(10,2) not null default 25,
  materials_estimate numeric(10,2) not null default 0,
  tip numeric(10,2) not null default 0,
  bayad_code text,
  customer_rating integer check (customer_rating is null or customer_rating between 1 and 5),
  worker_rating integer check (worker_rating is null or worker_rating between 1 and 5),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists jobs_status_idx on public.jobs (status);
create index if not exists jobs_city_service_idx on public.jobs (city, service_id);
create index if not exists profiles_role_idx on public.profiles (role);

-- ---------------------------------------------------------------------------
-- RLS — open for demo (publishable key). Tighten when Auth ships.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.worker_skills enable row level security;
alter table public.jobs enable row level security;

drop policy if exists "kagawa_profiles_all" on public.profiles;
create policy "kagawa_profiles_all" on public.profiles
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "kagawa_skills_all" on public.worker_skills;
create policy "kagawa_skills_all" on public.worker_skills
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "kagawa_jobs_all" on public.jobs;
create policy "kagawa_jobs_all" on public.jobs
  for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.profiles to anon, authenticated;
grant select, insert, update, delete on public.worker_skills to anon, authenticated;
grant select, insert, update, delete on public.jobs to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Seed users (fixed UUIDs so the app can "sign in as" them)
-- ---------------------------------------------------------------------------

-- Clear previous demo rows (by fixed ids)
delete from public.jobs where customer_id in (
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'a0000000-0000-4000-8000-000000000005'::uuid
) or worker_id in (
  'a0000000-0000-4000-8000-000000000002'::uuid,
  'a0000000-0000-4000-8000-000000000003'::uuid,
  'a0000000-0000-4000-8000-000000000004'::uuid,
  'a0000000-0000-4000-8000-000000000006'::uuid
);

delete from public.worker_skills where worker_id in (
  'a0000000-0000-4000-8000-000000000002'::uuid,
  'a0000000-0000-4000-8000-000000000003'::uuid,
  'a0000000-0000-4000-8000-000000000004'::uuid,
  'a0000000-0000-4000-8000-000000000006'::uuid
);

delete from public.profiles where id in (
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'a0000000-0000-4000-8000-000000000002'::uuid,
  'a0000000-0000-4000-8000-000000000003'::uuid,
  'a0000000-0000-4000-8000-000000000004'::uuid,
  'a0000000-0000-4000-8000-000000000005'::uuid,
  'a0000000-0000-4000-8000-000000000006'::uuid
);

insert into public.profiles (
  id, email, username, password, phone, full_name, role, barangay, city, rating,
  jobs_completed, verified, bio, online, launch_jobs_remaining
) values
  (
    'a0000000-0000-4000-8000-000000000001',
    'ana@kagawa.demo',
    'ana',
    'kagawa123',
    '0917 555 0101',
    'Ana Reyes',
    'customer',
    'San Antonio',
    'Makati',
    4.90,
    3,
    true,
    'Homeowner who books on-demand help.',
    false,
    0
  ),
  (
    'a0000000-0000-4000-8000-000000000005',
    'ben@kagawa.demo',
    'ben',
    'kagawa123',
    '0917 555 0202',
    'Ben Cruz',
    'customer',
    'Poblacion',
    'Makati',
    5.00,
    1,
    true,
    'First-time KaGawa customer.',
    false,
    0
  ),
  (
    'a0000000-0000-4000-8000-000000000002',
    'juan@kagawa.demo',
    'juan',
    'kagawa123',
    '0918 222 3344',
    'Juan Dela Cruz',
    'worker',
    'San Antonio',
    'Makati',
    4.80,
    86,
    true,
    '10 years plumbing & general repair. Fast and tidy.',
    true,
    0
  ),
  (
    'a0000000-0000-4000-8000-000000000003',
    'maria@kagawa.demo',
    'maria',
    'kagawa123',
    '0919 333 4455',
    'Maria Santos',
    'worker',
    'Poblacion',
    'Makati',
    4.95,
    142,
    true,
    'On-call cleaning & laundry. Supplies available on request.',
    true,
    12
  ),
  (
    'a0000000-0000-4000-8000-000000000004',
    'rico@kagawa.demo',
    'rico',
    'kagawa123',
    '0920 444 5566',
    'Rico Mendoza',
    'worker',
    'Bel-Air',
    'Makati',
    4.70,
    54,
    true,
    'Licensed electrician. Aircon & appliance specialist.',
    false,
    20
  ),
  (
    'a0000000-0000-4000-8000-000000000006',
    'worker@kagawa.demo',
    'worker',
    'kagawa123',
    '0917 000 0000',
    'Demo Worker',
    'worker',
    'San Antonio',
    'Makati',
    5.00,
    0,
    true,
    'Your demo worker account — go Online to take bookings.',
    false,
    20
  );

insert into public.worker_skills (worker_id, service_id) values
  ('a0000000-0000-4000-8000-000000000002', 'plumbing'),
  ('a0000000-0000-4000-8000-000000000002', 'handyman'),
  ('a0000000-0000-4000-8000-000000000002', 'carpentry'),
  ('a0000000-0000-4000-8000-000000000003', 'cleaning'),
  ('a0000000-0000-4000-8000-000000000003', 'laundry'),
  ('a0000000-0000-4000-8000-000000000003', 'errands'),
  ('a0000000-0000-4000-8000-000000000004', 'electrical'),
  ('a0000000-0000-4000-8000-000000000004', 'appliance'),
  ('a0000000-0000-4000-8000-000000000004', 'aircon'),
  ('a0000000-0000-4000-8000-000000000006', 'cleaning'),
  ('a0000000-0000-4000-8000-000000000006', 'plumbing'),
  ('a0000000-0000-4000-8000-000000000006', 'electrical'),
  ('a0000000-0000-4000-8000-000000000006', 'appliance'),
  ('a0000000-0000-4000-8000-000000000006', 'carpentry'),
  ('a0000000-0000-4000-8000-000000000006', 'painting'),
  ('a0000000-0000-4000-8000-000000000006', 'aircon'),
  ('a0000000-0000-4000-8000-000000000006', 'pest'),
  ('a0000000-0000-4000-8000-000000000006', 'laundry'),
  ('a0000000-0000-4000-8000-000000000006', 'gardening'),
  ('a0000000-0000-4000-8000-000000000006', 'errands'),
  ('a0000000-0000-4000-8000-000000000006', 'handyman');

-- Sample completed job + one open search so the worker feed looks alive
insert into public.jobs (
  id, service_id, customer_id, worker_id, status, address, barangay, city,
  notes, estimated_hours, hourly_rate, booking_fee, materials_estimate,
  bayad_code, worker_rating, created_at, accepted_at, started_at, completed_at
) values (
  'b0000000-0000-4000-8000-000000000001',
  'cleaning',
  'a0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000003',
  'completed',
  '12 Blessing Continues St.',
  'San Antonio',
  'Makati',
  'Kitchen and CR deep clean before guests arrive.',
  3,
  180,
  25,
  0,
  '4821',
  5,
  now() - interval '2 days',
  now() - interval '2 days' + interval '5 minutes',
  now() - interval '2 days' + interval '25 minutes',
  now() - interval '2 days' + interval '3 hours'
);

insert into public.jobs (
  id, service_id, customer_id, status, address, barangay, city,
  notes, estimated_hours, hourly_rate, booking_fee, materials_estimate, created_at
) values (
  'b0000000-0000-4000-8000-000000000002',
  'plumbing',
  'a0000000-0000-4000-8000-000000000005',
  'searching',
  '88 Mabini Ave.',
  'San Antonio',
  'Makati',
  'Clogged kitchen sink — water backs up when washing dishes.',
  1,
  350,
  25,
  150,
  now() - interval '2 minutes'
);
