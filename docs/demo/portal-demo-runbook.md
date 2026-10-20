# Laundry portal demo: runbook

For the CEO's investor walkthrough of the laundry portal. Hosting is not decided yet, so URLs are placeholders.

## Credentials
- **Where they live:** credentials are **never in this repo**. They live in 1Password (vault "Wash & Go Demo") and on the CEO's phone.
- **The demo accounts:**

  | Role | Email | Notes |
  |---|---|---|
  | Shop owner | `DEMO_OWNER_EMAIL` (default `tatelgabrielle19@gmail.com`) | The CEO's own account. The scripts never create or change it: no password, not even email verification. If it doesn't exist yet, create it in the Firebase console or let the CEO sign up in the portal, then re-run the seed. |
  | Staff | `staff.demo@washandgo.ph` | Read-only view of the shop. |
  | Admin | `admin.demo@washandgo.ph` | Used by the driver to assign the rider. |
  | Rider | `rider.demo@washandgo.ph` | |
  | Customers | `customer1.demo@washandgo.ph` … `customer4.demo@washandgo.ph` | |

- **The password:** the staff, admin, rider and customer accounts share one password, `DEMO_PASSWORD`. If it is not set when the seed creates one of those accounts, the seed generates one and prints it **once**. Copy it into 1Password straight away; it is not saved anywhere else.
- **Firebase is opt-in.** The scripts only touch the Firebase project when **`DEMO_FIREBASE=1`** is set, even if `apps/api/.env` loads credentials. Without it they print "Firebase accounts skipped (set DEMO_FIREBASE=1)" and seed the database only.

## URLs (placeholders)
| What | URL |
|---|---|
| Portal (PWA) | `<PORTAL_URL>` |
| Admin | `<ADMIN_URL>` |
| API | `<API_URL>` |

## Commands
Run these from the repo root.
- **`demo:seed`** builds the dataset. It is safe to re-run; it converges to the same state.
  ```sh
  DEMO_FIREBASE=1 DATABASE_URL=… pnpm --filter @wash-and-go/api demo:seed
  ```
  With `NODE_ENV=production` the seed only creates the dataset the first time. Replacing existing demo orders needs `DEMO_RESET_CONFIRM=yes`, the same as reset.
- **`demo:reset`** deletes demo-marked rows only, then re-seeds. It refuses to run with `NODE_ENV=production` unless `DEMO_RESET_CONFIRM=yes`.
  ```sh
  DATABASE_URL=… pnpm --filter @wash-and-go/api demo:reset
  ```
- **`demo:order`** sends a live order during the demo. It stops at "At the shop" so the CEO can weigh it.
  ```sh
  DEMO_FIREBASE=1 API_URL=… FIREBASE_WEB_API_KEY=… DEMO_PASSWORD=… pnpm --filter @wash-and-go/api demo:order --run pitch-1
  ```
  - `--step-seconds 20` sets the pause between steps (20 is the default). `--no-wait` runs every step at once.
  - `--rider-only <code>` resumes an existing order.
  - Re-running with the same `--run` id never books a second order.

**Local rehearsal:** with the API started with `AUTH_DEV_BYPASS=1`, leave `DEMO_FIREBASE` unset. The scripts skip Firebase, and the demo users use the fixed uids `demo-owner`, `demo-customer-1`, and so on, through the `x-dev-uid` stub. The driver falls back to that stub too.

## What the dataset contains
Everything belongs to one shop, "Wash & Go Demo Laundry".
- **The shop:** verified, pinned in Tetuan, open Mon to Sat 08:00 to 18:00, 10 Express slots a day.
- **Services:** Wash, Dry & Fold ₱25/kg, Wash + Iron ₱35/kg, Dry Cleaning ₱120/piece.
- **14 orders over the last 3 days:**

  | Status | Count | Notes |
  |---|---|---|
  | Incoming | 2 | One assigned, one picked up. |
  | At the shop | 2 | A Medium Express, and a Large Scheduled one that asks for a second confirm if weighed at 20 kg. |
  | Washing | 2 | |
  | Ready | 1 | |
  | Delivered | 6 | One has a 5-star rating. |
  | Cancelled | 1 | |

- **Payouts:**
  - one paid batch, reference `GCASH-DEMO-0001`;
  - one pending batch;
  - the two newest deliveries are not batched yet, so the "Pending" card shows a total.
- **What reset touches:** demo rows are recognised by the markers below. Reset deletes only rows that carry them.
  - the shop name above;
  - display names that start with "Demo " (Demo Customer N, Demo Rider, Demo Staff, Demo Admin);
  - pickup addresses that start with "Demo ".

## Warm-up (15 minutes before)
1. Run `demo:reset` so the timestamps read "today" again.
2. Open the portal on the presenting phone and sign in as the owner. Check that the queue loads.
3. If the PWA is not installed yet, install it once.
4. Turn on the new-order chime (the bell on the queue) and turn the phone's volume up.
5. Have a laptop ready with the `demo:order` command typed out, and sign in to the admin as well.
6. Open each screen once so the API and the CDN are warm.

## The six-minute click path
1. **Queue (30 s).** Show the tabs: Incoming, Needs you, Washing, Ready. "Every order a laundry has, in one place."
2. **A live order (45 s).** Run `demo:order` on the laptop. The phone chimes and the new order appears under Incoming, then moves to At the shop.
3. **Weigh-in (60 s).** Open the Large order and enter 20 kg. The portal asks for a second confirmation because the weight is well above the booking estimate. Confirm, and the price updates.
4. **Washing → Ready (30 s).** Move the weighed order to Washing, then to Ready.
5. **Payouts (60 s).** Show the pending total, the paid batch with its reference, and a batch's order lines. Export the CSV.
6. **Services (30 s).** Show the rates per kilo and per piece, and the turnaround.
7. **Shop (30 s).** Show the profile, hours, Express capacity and the logo slot.
8. **Staff (30 s).** Show the team list and invite by email. Staff see a read-only view.
9. **Install (30 s).** Show the home-screen icon. It opens offline into the last snapshot.

## What is gated, and the one-line answer
| Topic | One-line answer |
|---|---|
| Payments | "Cash on delivery at launch; GCash in-app is next." |
| Rates approval | "Shops set their own rates today; an admin approval step is a founder decision we're keeping open." |
| Payout account | "Optional for now; payouts are sent manually with a reference until the payout rail is chosen." |
| Documents upload | "Live once storage is switched on; until then ops collects permits directly." |
| Customer app and rider app | "Separate apps on the same API; today we're showing the laundry side." |

## Troubleshooting
- **Cold start.** The first request after idle can take 10 to 30 seconds. Warm-up step 6 avoids this. If it happens on stage, pull to refresh once.
- **429 "Too many requests".** The API allows 60 requests a minute per client. Close any extra tabs, wait about a minute, and the polling queue recovers by itself.
- **Sign-in fails.**
  - Check the password in 1Password.
  - The staff, admin, rider and customer accounts are created with a verified email. Reset their passwords with `DEMO_FIREBASE=1 DEMO_PASSWORD=… DEMO_RESET_PASSWORDS=yes demo:seed`.
  - The owner is the CEO's own account; the scripts never touch it. Reset that password through Firebase's normal "forgot password" flow.
- **`demo:order` prints `4xx`/`5xx`.** The response body is printed. Typical causes:
  - "No express capacity": more than 10 Express orders today. Run `demo:reset`.
  - "Rider is over the cash limit": run `demo:reset`; the seed records the rider's deposit.
  - "Not your order to move": auto-dispatch gave the order to another rider. Turn auto-dispatch off in admin config for the demo.
- **The queue looks stale.** Run `demo:reset`, then pull to refresh.

## Standalone demo build

This build needs no API, no database and no Firebase. Everything runs in the browser, and nothing is sent anywhere. Use it when the hosted API is down or there is no signal. It also works fully offline once the page has loaded.

- **URL:** `<STANDALONE_DEMO_URL>` (placeholder until it is deployed).
- **Build:** `pnpm --filter @wash-and-go/e2e build:portal-demo`. This sets `NEXT_PUBLIC_DEMO=1` and writes to `apps/laundry-portal/.next-e2e`.
- **Serve locally:** `cd apps/laundry-portal && NEXT_DIST_DIR=.next-e2e npx next start -p 3010`.
- **Check:** `pnpm --filter @wash-and-go/e2e smoke:portal-demo`. This also proves that a normal build contains none of the demo code.
- **Logins:**
  - Owner: `demo.owner@washandgo.ph`, already filled in. Any password of 4 or more characters works.
  - Staff (read-only rates and team): `staff.demo@washandgo.ph`, with any password of 4 or more characters.
  - Forgot password and signup show a short "not available in the demo" note.
- **Data:** the same shop and orders as the seeded demo API above.
  - The shop: "Wash & Go Demo Laundry", Mon-Sat 08:00-18:00, 10 Express slots.
  - Rates: wash, dry & fold ₱25/kg; wash + iron ₱35/kg; dry cleaning ₱120 a piece.
  - Orders: 14 in every state, one paid batch (`GCASH-DEMO-0001`) and one pending batch.
  - Order times are relative to the moment the demo was first opened (or last reset).
  - Edits (rates, hours, profile, payout account, invites) stay in this browser until Reset.

**Click path:**
1. Sign in as the owner.
2. On **Orders**, show the Needs you, Washing and Ready counts.
3. Weigh the **Large** order and enter 20 kg. The "more than double the estimate" check appears, and the button reads "Yes, confirm ₱…".
4. Mark it washing.
5. Open **Payouts** to show the pending total and the paid batch reference.
6. On **Services**, change a rate and save it. Reload to show it stuck.
7. Use **New order arrives** (More, the left rail, or Help; **Shift+N** on a laptop). The order is picked up after 15 s and reaches the shop after 30 s. The Orders tab count, the tab title and the New ring update, and the chime plays if it is on.

**Reset:** use **Reset demo** in the same controls. After a confirm, every order, rate and setting goes back to the start, and you stay signed in.

**The "Demo data" chip** next to Verified in the header (shortened to "Demo" on a phone) tells the audience that the data is sample data. Build with `NEXT_PUBLIC_DEMO_BADGE=0` to hide it.
