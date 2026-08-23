# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Public, unauthenticated visitors. Three overlapping audiences; **primary job** is the deploy-now availability check.

- **Primary: current Hetzner customers planning a deploy**, deciding which datacentre can take a given server type right now (especially CCX / CAX in FSN1 and NBG1).
- **Customers waiting for restock**, watching sold-out types and optional email dispatches so they can scale or migrate.
- **Prospective customers and curious onlookers**, sizing regional capacity or following the supply story over time.

Context of use: a tab opened while sizing a deploy, or left open as a stock-watch during a known shortage. Sessions are quick scans for "available now in region X", plus occasional deeper history when capacity has been tight.

## Product Purpose

A third-party tracker for Hetzner Cloud server-type availability per region. Independent of Hetzner. Polls each datacentre for which server types are in stock, records stock-outs and restocks, and presents the result honestly.

Pain: Hetzner inventory routinely runs dry on popular types in popular datacentres. Customers often learn only when the console refuses to provision. This site answers: "can I create a CCX33 in Falkenstein right now, or do I need another region?"

Success: when someone chooses where to deploy, or waits for a restock, this is the page they leave open, because it is the clearest read of current stock and recent change, not because it is loud.

## Positioning

Independent observation of the public Hetzner Cloud API, not Hetzner status or marketing. The product is the stock matrix plus the signed history of change (dispatches, supply trend, methodology). A neighbor could clone a green/red grid; they could not truthfully claim the same third-party stance, poll-backed cells, and editorial dispatch record without doing the same observation work.

## Operating Context

- Home: live availability matrix by server family and datacentre, supply trend, legend, subscribe, recent dispatches.
- Drill-in: per-cell 24-hour history popover; optional mail-alert prefs wired into subscribe.
- `/dispatches`: full dispatch archive (grouped by month).
- `/methodology`: how states are derived, cadence, independence stance.
- `/feed.atom` and `/md` variants for machine-readable / plain consumption.
- `/unsubscribe`: preference edit or full leave, plus optional feedback.
- Email: Resend-backed dispatches on sold-out / restock for selected families and DCs.
- Deploy: Cloudflare (OpenNext), D1, GitHub Actions CD on `main`. Public site: `https://hetzner.thegoated.dev`.

## Capabilities and Constraints

**Shipped**
- Poll public Hetzner Cloud API on a fixed cadence; store current stock and change events.
- Matrix cells: available, limited (history-derived flicker), sold-out, not-offered, unknown.
- Glyph + label + color for every stock state (never color alone).
- Supply history chart; recent and archived dispatches with timestamps and durations.
- Email subscribe with event / family / datacentre prefs; unsubscribe and preference update.
- Atom feed; markdown page mirrors; PostHog product analytics (disclosed on subscribe surfaces).

**Constraints**
- Unauthenticated public product; no user accounts.
- Read-only observation of the public API; no Hetzner affiliation or official incident voice.
- "Limited" is derived from poll history; the API purchase signal is effectively binary.
- Failed polls must not rewrite cell state as a false stock-out.
- No comment threads, outage gamification, or fabricated social proof.

**Terminology**
- Datacentre codes: NBG1, FSN1, HEL1, ASH, HIL, SIN.
- Server families: CX, CAX, CPX, CCX (and any families the catalog exposes).
- Dispatch: a named stock-out, restock, or rollout event with observation timestamp.
- Stock states: Available, Limited, Sold out, Not offered, Unknown.

## Brand Commitments

- Name: **Hetzner Cloud Radar**.
- Voice: careful observer. Three words: **measured, lucid, independent.**
- Plain prose and numbers; no exclamation marks; no "we're on it" infrastructure apology.
- Site reports; does not speak for Hetzner.
- Emotional goal: quiet and trustworthy when fine; honest and steady when stock is bad, never alarmist.

**Anti-references (binding)**
- Generic SaaS status pages (Statuspage / Instatus clichés).
- Downdetector-style outage panic and engagement bait.
- Mimicry of Hetzner's corporate brand or official status voice.

## Evidence on Hand

- Live and historical stock derived from polls and `stock_events` (product data, not marketing claims).
- Real dispatch copy generated from observed changes.
- Methodology page stating independence and method.
- Public GitHub repo linked from the masthead.

**Must not fabricate**
- Testimonials, named customers, fake user quotes.
- Press, rankings, partner badges, or Hetzner endorsement.
- Benchmarks or uptime SLAs the product does not measure.

## Product Principles

1. **Truth over reassurance.** Never default to "in stock". Sold out is sold out. Every cell maps to a recent poll; observation time stays visible nearby.
2. **Glanceable, then deep.** Matrix answers "available right now in region X?" in under two seconds. History and prefs are one interaction away, not dumped on the same surface.
3. **Editorial record.** Stock-outs and restocks are a signed dispatch history worth reading, not only a wall of bars.
4. **Independent voice.** Third-party stance is a feature. Layout and copy must read as observation, not Hetzner communication.
5. **Calm under load.** Hold when half the popular types go sold out: no panic chrome, no layout collapse, no screaming color field.

## Accessibility & Inclusion

- **WCAG 2.2 AA** floor on all public surfaces.
- **Color-blind safe:** status never by color alone; glyph + label required.
- **`prefers-reduced-motion`:** decorative motion off; functional changes stay clear.
- **Keyboard:** interactive history and form controls operable without a pointer.
- **Readable defaults:** body text 16px floor where prose runs; line length ~65–75ch; contrast on status colors against paper.
