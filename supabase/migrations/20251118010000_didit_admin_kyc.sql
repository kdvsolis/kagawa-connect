-- Didit reference on profiles (no ID images) + crime report reason.
-- Run after 20251026220000_admin_reports_rates.sql.

alter table public.profiles
  add column if not exists didit_session_id text;

alter table public.profiles
  add column if not exists didit_status text;

alter table public.profiles
  add column if not exists didit_vendor_data text;

alter table public.profiles
  add column if not exists didit_checked_at timestamptz;

create index if not exists profiles_didit_vendor_idx
  on public.profiles (didit_vendor_data);

create index if not exists profiles_role_created_idx
  on public.profiles (role, created_at desc);

-- Allow theft_crime alongside existing report reasons.
do $$
declare r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.reports'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%reason%'
  loop
    execute format('alter table public.reports drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.reports
  add constraint reports_reason_check
  check (reason in (
    'harassment',
    'unsafe',
    'theft_crime',
    'no_show',
    'payment',
    'fake_profile',
    'other'
  ));
