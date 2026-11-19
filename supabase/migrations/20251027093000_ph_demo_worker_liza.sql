-- PH demo worker (Makati) for nearby-match testing alongside Alicante seeds.

insert into public.profiles (
  id, email, phone, full_name, role, barangay, city,
  rating, jobs_completed, verified, bio, online, launch_jobs_remaining,
  lat, lng, hourly_rate, day_rate, priority_online, onboarding_complete,
  verification_status
) values (
  'a0000000-0000-4000-8000-000000000007',
  'liza@kagawa.demo',
  '0917 888 1212',
  'Liza Reyes',
  'worker',
  'San Antonio',
  'Makati',
  4.9,
  64,
  true,
  'Makati home cleaning — deep clean, tidy-up, laundry. Demo PH worker.',
  true,
  8,
  14.5652,
  121.0148,
  200,
  1500,
  true,
  true,
  'approved'
)
on conflict (id) do update set
  barangay = excluded.barangay,
  city = excluded.city,
  lat = excluded.lat,
  lng = excluded.lng,
  hourly_rate = excluded.hourly_rate,
  day_rate = excluded.day_rate,
  online = excluded.online,
  priority_online = excluded.priority_online,
  onboarding_complete = true,
  verification_status = 'approved',
  verified = true;

insert into public.worker_skills (worker_id, service_id) values
  ('a0000000-0000-4000-8000-000000000007', 'cleaning'),
  ('a0000000-0000-4000-8000-000000000007', 'laundry'),
  ('a0000000-0000-4000-8000-000000000007', 'errands'),
  ('a0000000-0000-4000-8000-000000000007', 'handyman')
on conflict do nothing;
