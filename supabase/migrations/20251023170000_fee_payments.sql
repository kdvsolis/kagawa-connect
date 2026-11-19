-- Automated booking-fee payments with proof / receipt.

create table if not exists public.fee_payments (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  receipt_code text not null unique,
  amount_php numeric(10,2) not null default 25,
  currency text not null default 'PHP',
  status text not null check (status in (
    'pending', 'processing', 'paid', 'failed', 'expired'
  )),
  provider text not null check (provider in ('paymongo', 'xendit', 'demo_gcash')),
  provider_txn_id text,
  customer_id uuid references public.profiles(id),
  job_id uuid references public.jobs(id),
  checkout_url text,
  proof_note text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists fee_payments_customer_idx on public.fee_payments (customer_id);
create index if not exists fee_payments_status_idx on public.fee_payments (status);

alter table public.jobs
  add column if not exists fee_payment_id uuid references public.fee_payments(id);

alter table public.fee_payments enable row level security;

drop policy if exists "kagawa_fee_payments_all" on public.fee_payments;
create policy "kagawa_fee_payments_all" on public.fee_payments
  for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.fee_payments to anon, authenticated;
