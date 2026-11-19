# Decisions

Short notes for review. These are the choices a reader should not have to reverse-engineer.

## KaGawa is a bridge

The customer picks the worker. KaGawa does not employ them, does not investigate crimes, and does not pay claims. Reports can pause or ban an account. The in-app copy says that in every language.

## Two kinds of money

The booking fee is KaGawa’s. It is a small percent of that country’s published daily minimum (5 percent), not a cut of the labor. Philippines uses the NCR daily minimum; Spain uses the SMI-based daily figure in `src/lib/markets.ts`. Unknown places use the Philippines figure until a market is added.

Labor is separate. The customer pays the worker. The job closes when the worker enters the customer’s 4-digit Bayad Code. There is no satisfaction hold and no refund escrow.

## Production labor payout

PayMongo Checkout collects labor into the KaGawa wallet (GCash, Maya, or card). After PayMongo confirms the checkout is paid, an InstaPay batch transfer sends that same amount to the worker’s GCash. The booking fee is not included. Minimum checkout is ₱100. Spain jobs stay cash because this rail is PHP only.

InstaPay can sit pending (up to about 20 minutes). A wrong account leaves the money in the KaGawa wallet. Child PayMongo accounts were not used: every worker would need their own activated PayMongo account.

Simulation never calls this path. Card `4242424242424242` only works when `KAGAWA_MODE=simulation`.

## KYC

Didit runs the ID check. KaGawa stores the session id, status, and vendor key. It does not store the decision JSON or a second copy of the ID photo. Simulation writes a fake Approved session and does not call Didit.

## Admin

Admin accounts are not profiles. Login is username and password, then an httpOnly JWT (`kagawa_admin`). Until `admin_accounts` exists and `SUPABASE_SERVICE_ROLE_KEY` is set, login checks `ADMIN_USERNAME` and `ADMIN_PASSWORD`. Ban columns and the Didit columns are in SQL files; if the live database does not have them yet, the directory still loads without those fields.

## Nearby jobs

Workers see open jobs within about 8 km when both sides have coordinates, otherwise the same city. Brand-new jobs are visible first to workers who turned Priority on.

## Emergency number

The call button uses the phone’s GPS. If GPS is denied, it uses the booking pin. Coordinates go to Groq, which returns the country and the general emergency number. The answer is cached per 1-degree cell in `.cache/emergency-numbers.json` (gitignored) so the same area is not asked again. Wages are not priced by Groq. If Groq fails, the Philippines / Spain table in `markets.ts` is the temporary number and is not stored as a Groq answer.

The configured `GROQ_MODEL` may 404. The lookup then retries `openai/gpt-oss-20b`.

## What is not built

- Authorize-and-hold or a refund if the customer is unhappy
- PayMongo child accounts and split settlement
- Closed-app Web Push (needs VAPID). The service worker and an in-page notification exist
- Email or SMS provider. Contact is `tel:` and `sms:`
- A support hotline
