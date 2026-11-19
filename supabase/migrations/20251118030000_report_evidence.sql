-- Complaint photos. Not government ID scans.
alter table public.reports
  add column if not exists evidence_name text;

alter table public.reports
  add column if not exists evidence_data_url text;
