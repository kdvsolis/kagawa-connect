-- Separate admin accounts (not profiles) and a ban flag.
-- admin_accounts is service-role only. No anon/authenticated policies.

create table if not exists public.admin_accounts (
  id uuid primary key,
  username text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

alter table public.admin_accounts enable row level security;

revoke all on table public.admin_accounts from anon, authenticated;

alter table public.profiles
  add column if not exists banned boolean not null default false;

alter table public.profiles
  add column if not exists banned_at timestamptz;

alter table public.profiles
  add column if not exists ban_reason text;

create or replace function public.block_banned_job()
returns trigger
language plpgsql
as $$
declare
  cust_banned boolean;
  work_banned boolean;
begin
  select banned into cust_banned
  from public.profiles
  where id = new.customer_id;
  if coalesce(cust_banned, false) then
    raise exception 'customer is banned';
  end if;

  if new.worker_id is not null then
    select banned into work_banned
    from public.profiles
    where id = new.worker_id;
    if coalesce(work_banned, false) then
      raise exception 'worker is banned';
    end if;
  end if;

  return new;
end $$;

drop trigger if exists jobs_block_banned on public.jobs;
create trigger jobs_block_banned
before insert or update of customer_id, worker_id, status
on public.jobs
for each row execute function public.block_banned_job();

create or replace function public.block_banned_online()
returns trigger
language plpgsql
as $$
begin
  if coalesce(new.banned, false) and coalesce(new.online, false) then
    new.online := false;
  end if;
  return new;
end $$;

drop trigger if exists profiles_block_banned_online on public.profiles;
create trigger profiles_block_banned_online
before insert or update of banned, online
on public.profiles
for each row execute function public.block_banned_online();
