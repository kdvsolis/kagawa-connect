# KaGawa

On-demand home help. Customers book an hourly worker (cleaning, plumbing, electrical, and the rest). Workers go online and accept nearby jobs. KaGawa is the booking bridge: it is not the employer, and it does not hold labor cash for a satisfaction refund.

## Stack

Next.js (App Router) · React · TypeScript · Tailwind · Zustand · Supabase · PayMongo · Didit · Leaflet · PWA

Languages: English (default), Filipino, Chinese, Korean, Japanese, Spanish.

## Run locally

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open http://127.0.0.1:43123.

`KAGAWA_MODE=simulation` (the default in `.env.example`) runs the happy path: test ID check and card `4242424242424242`. Real Didit and PayMongo keys are used only when `KAGAWA_MODE=production`.

## Architecture

| Piece | Role |
| --- | --- |
| Customer | Onboarding, map pin, booking fee, job status, Bayad Code, report |
| Worker | Skills, online / priority, nearby feed (~8 km), accept, complete with Bayad Code |
| Admin | Separate username/password and JWT. Not a row in `profiles` |
| Payments | Booking fee stays with KaGawa. In production, labor is checked out into the KaGawa wallet and sent to the worker GCash by InstaPay |
| KYC | Didit session reference only. ID photos stay at Didit |
| Emergency call | Phone GPS (booking pin if GPS is off) → cached country emergency number |

Details and tradeoffs: [DECISIONS.md](DECISIONS.md).

## Supabase

The publishable key can read and write rows. It cannot create tables. Run the SQL files in `supabase/migrations/` in filename order in the Supabase SQL editor, or:

```bash
DATABASE_URL=postgresql://postgres:PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres npm run db:setup
```

Later files add chat, fees, reports, Didit columns, `admin_accounts`, bans, report evidence, and `labor_payouts`. Until those are applied, the app falls back (legacy profile columns, env admin login, in-memory payouts).

Do not commit `.env.local`. Copy names from `.env.example`.

## Demo accounts

Password for every seeded account: **`kagawa123`** (prefilled on `/accounts`).

| Role | Username | Name |
| --- | --- | --- |
| Customer | `ana` | Ana Reyes |
| Customer | `ben` | Ben Cruz |
| Worker | `juan` | Juan Dela Cruz |
| Worker | `maria` | Maria Santos |
| Worker | `rico` | Rico Mendoza |
| Worker | `worker` | Paolo Garcia |
| Worker | `liza` | Liza Reyes |

New signups complete onboarding. In simulation, ID check and worker clearance can use the test buttons.

## Five-minute demo (simulation)

1. Landing → **Book help** → sign in as `ana` / `kagawa123`, or create a new customer.
2. Book a service. Pay the booking fee with `4242424242424242`, expiry `12/34`, cvc `123`.
3. Open a second session → **I'm a worker** → go online with Priority → accept the job.
4. Customer starts the job. Labor closes with the 4-digit Bayad Code. The production “pay the worker” button is hidden in simulation.
5. `/admin` is a separate login (`ADMIN_USERNAME` / `ADMIN_PASSWORD`). It lists customers, workers, and reports.

## Deploy

Any Node host that runs `npm run build` and `npm start` (port 43123). Set the same variables as `.env.example`. Production payments need `KAGAWA_MODE=production`, a real `PAYMONGO_SECRET_KEY`, an activated wallet, and a public `POST {APP_URL}/api/payments/webhook`. Didit needs `DIDIT_API_KEY` and its webhook. Admin passwords stay in `admin_accounts` only after that migration and `SUPABASE_SERVICE_ROLE_KEY`.

## Scripts

```bash
npm run dev
npm run build
npm test
npm run db:setup
```
