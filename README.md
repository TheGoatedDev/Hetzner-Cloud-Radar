# Hetzner Cloud Radar

Independent availability radar for Hetzner Cloud server types.

The app polls Hetzner Cloud, stores raw availability observations in Postgres,
derives current stock state, renders a public dashboard, and syncs mailing-list
subscribers into Resend Contacts for marketing dispatches.

## Stack

- Next.js 16 App Router
- React 19
- TanStack Query, server-prefetched and hydrated
- Postgres
- Drizzle ORM and Drizzle Kit
- Zod + T3 Env
- Biome
- pnpm

## Features

- One-shot worker poll every 5 minutes (`pnpm worker` / `Dockerfile.worker`).
- Hetzner `GET /v1/server_types` integration.
- Raw poll history in `availability_observations`.
- Current per server-type/location state in `availability_current`.
- Daily flicker tracking in `daily_availability_state`.
- `limited` display state when latest stock is available but same UTC day also
  saw sold-out.
- ISR for `/` and `/api/availability` with 5 minute revalidation.
- Resend-backed subscriber capture and React Email marketing dispatches.
- DB-backed homepage with no mock-data dependency.

## Status Rules

Base status:

- location exists and `available: true` -> `available`
- location exists and `available: false` -> `sold-out`
- tracked location missing from server type -> `not-offered`
- parse/fetch uncertainty -> `unknown`

Display status:

- latest `sold-out` stays `sold-out`
- latest `available` plus same UTC day saw both available and sold-out -> `limited`
- latest `available` without flicker -> `available`
- `not-offered` and `unknown` pass through

Server types are discovered from the live Hetzner API by family prefix, so
current active types such as `CX23`, `CX33`, `CX43`, and `CX53` are shown instead
of stale legacy codes. Family metadata in `src/lib/server-families.ts` controls
which discovered families are visible publicly and which are dispatch-enabled.
Run `pnpm families:audit` to detect new Hetzner server families that need local
metadata review.

## Environment

Create `.env.local` from `env.example`:

```bash
cp env.example .env.local
```

Required variables:

```bash
DATABASE_URL=postgres://postgres:password@localhost:5432/hetzner_cloud_radar
HETZNER_API_TOKEN=
RESEND_API_KEY=
RESEND_FROM_EMAIL=dispatches@hetzner.thegoated.dev
RESEND_MARKETING_SEGMENT_ID=
RESEND_SOLD_OUT_TOPIC_ID=
RESEND_RESTOCK_TOPIC_ID=
SKIP_ENV_VALIDATION=false
```

`RESEND_FROM_EMAIL` must be a verified sender/domain in Resend. It defaults to
`dispatches@hetzner.thegoated.dev` if omitted. `RESEND_MARKETING_SEGMENT_ID`,
`RESEND_SOLD_OUT_TOPIC_ID`, and `RESEND_RESTOCK_TOPIC_ID` are optional. If topic
IDs are configured, new contacts are created with matching opt-in/opt-out topic
preferences and dispatch emails are tagged with the matching topic.

Do not commit `.env.local` or real tokens.

## Local Development

Install dependencies:

```bash
pnpm install
```

Create the local database and run migrations:

```bash
pnpm db:setup:local
```

Start the app:

```bash
pnpm dev
```

Open:

```text
http://localhost:3000
```

## Polling

One-shot worker (local or Railway cron via `Dockerfile.worker`):

```bash
pnpm worker
```

Needs `DATABASE_URL` + `HETZNER_API_TOKEN` (plus Resend vars if you want dispatch emails).

## CDN Caching

Public read routes should be cached at the CDN:

- `/`
- `/api/availability`
- `/dispatches`
- `/feed.atom`

The app sends `Cloudflare-CDN-Cache-Control` for those routes with a 5 minute
fresh TTL, 15 minute stale-while-revalidate window, and 24 hour stale-if-error
window. Cloudflare still needs a Cache Rule that caches HTML and JSON for these
paths; Cloudflare does not cache HTML or JSON by default.

Do not apply the cache rule to `/api/subscribe`, `/api/unsubscribe`, or
`/api/unsubscribe/feedback`.

## Database

Schema lives in:

```text
src/lib/db/schema.ts
```

Tables:

- `poll_runs`
- `server_types`
- `locations`
- `availability_observations`
- `availability_current`
- `daily_availability_state`
- `marketing_dispatch_sends`

Generate migrations:

```bash
pnpm db:generate
```

Apply migrations:

```bash
pnpm db:migrate
```

Open Drizzle Studio:

```bash
pnpm db:studio
```

## API

Public read endpoint:

```text
GET /api/availability
```

Returns the same shape used by the dashboard:

- `families`
- `observedAt`
- `observedDate`
- `pollCadence`
- `topLine`
- `events`
- `supplyHistory`
- `usingFallback`

Subscribe endpoint:

```text
POST /api/subscribe
```

Body:

```json
{
  "email": "you@example.com",
  "wantsSoldOut": true,
  "wantsRestock": true
}
```

The endpoint syncs the address and preferences to Resend Contacts, Segments,
and Topics. The app does not store subscriber email addresses locally.

## Project Layout

```text
src/app/                         Next.js routes and UI
src/app/api/availability/         Public availability JSON
src/app/api/subscribe/            Resend-backed subscriber endpoint
src/lib/availability/             Hetzner polling and read model
src/lib/db/                       Drizzle client and schema
src/lib/marketing/                Resend contact sync
src/scripts/                      Local DB setup helpers
worker.ts                         One-shot poll entrypoint
Dockerfile.worker                 Worker image
drizzle/                          Generated migrations
```

## Verification

Run:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

Known lint output: Biome currently warns about `!important` rules in
`src/app/globals.css` for reduced-motion overrides. The command exits with code
0.

## Out Of Scope

- User accounts
- Admin UI
- Public API docs
- Alerting
- Automated broadcast creation/sending
- Long-form historical dispatch generation
