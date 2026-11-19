-- Wallet QR fee payments (GoTyme / GCash / Maya)

alter table public.fee_payments
  drop constraint if exists fee_payments_provider_check;

alter table public.fee_payments
  add constraint fee_payments_provider_check
  check (provider in (
    'paymongo', 'xendit', 'demo_gcash', 'wallet_qr'
  ));

alter table public.fee_payments
  add column if not exists wallet text
  check (wallet is null or wallet in ('gotyme', 'gcash', 'maya'));
