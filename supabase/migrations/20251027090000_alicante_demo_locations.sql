-- Move seeded demo profiles to Alicante for local geo testing (~8 km radius).

update public.profiles
set barangay = 'Centro',
    city = 'Alicante',
    lat = 38.3452,
    lng = -0.4815
where id in (
  'a0000000-0000-4000-8000-000000000001', -- Ana (customer)
  'a0000000-0000-4000-8000-000000000002', -- Juan
  'a0000000-0000-4000-8000-000000000005'  -- Ben
);

update public.profiles
set barangay = 'Carolinas',
    city = 'Alicante',
    lat = 38.3535,
    lng = -0.4905
where id = 'a0000000-0000-4000-8000-000000000003'; -- Maria

update public.profiles
set barangay = 'Benalua',
    city = 'Alicante',
    lat = 38.338,
    lng = -0.495
where id = 'a0000000-0000-4000-8000-000000000004'; -- Rico

update public.profiles
set barangay = 'San Blas',
    city = 'Alicante',
    lat = 38.357,
    lng = -0.475
where id = 'a0000000-0000-4000-8000-000000000006'; -- Paolo

update public.jobs
set barangay = 'Centro',
    city = 'Alicante',
    lat = 38.3452,
    lng = -0.4815
where customer_id in (
  'a0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000005'
);
