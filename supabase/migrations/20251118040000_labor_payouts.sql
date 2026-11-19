-- Production labor payouts. PayMongo checkout id is stored here so the
-- paid webhook can send the same amount to the worker GCash.
-- Safe to re-run.

create table if not exists public.labor_payouts (
  reference text primary key,
  job_id uuid,
  customer_id uuid,
  worker_id uuid,
  worker_name text not null,
  destination_number text not null,
  destination_name text not null,
  amount_php numeric(12,2) not null,
  checkout_id text,
  transfer_id text,
  status text not null,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.labor_payouts enable row level security;

drop policy if exists "kagawa_labor_payouts_all" on public.labor_payouts;
create policy "kagawa_labor_payouts_all" on public.labor_payouts
  for all to anon, authenticated using (true) with check (true);
