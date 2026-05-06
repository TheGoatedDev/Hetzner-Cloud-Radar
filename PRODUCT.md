# Product

## Register

product

## Users

Public, unauthenticated visitors. Three overlapping audiences:

- **Current Hetzner customers** planning a new deployment, deciding which datacentre can actually take a CCX or CAX right now.
- **Customers waiting for restock**, watching for a sold-out type to come back so they can scale or migrate.
- **Prospective customers and curious onlookers** sizing up Hetzner's regional capacity before committing, or just tracking the supply story over time.

Context of use: a tab opened while sizing up a deploy, or left open in the background as a stock-watch during a known shortage. Sessions are quick scans for "available now in region X" plus the occasional deeper read of the history when capacity has been tight for a while.

## Product Purpose

A third-party tracker for Hetzner Cloud server-type availability per region. Independent of Hetzner. Polls each datacentre for which server types are currently in stock, records history of stock-outs and restocks, and presents it honestly.

The pain it solves: Hetzner inventory routinely runs dry on popular types in popular datacentres (CCX dedicated lines in FSN1 and NBG1 especially). Customers find out only when the console refuses to provision. This site is the standing answer to "can I create a CCX33 in Falkenstein right now, or do I need to pick a different region."

Success looks like: when someone is choosing where to deploy a new server, or waiting for a sold-out type to come back, this is the page they leave open. Not because it's loud, but because it's the clearest read of what's actually in stock and what just changed.

## Brand Personality

Calm, editorial, informative. Three words: **measured, lucid, independent.**

Voice is that of a careful observer, not a hype account or a corporate status page. Plain prose where prose helps. Numbers where numbers help. No exclamation marks. No "we're on it" boilerplate, since there is no "we" running the infrastructure. The site reports; it does not apologise on Hetzner's behalf.

Emotional goal: when things are fine, the page feels quiet and trustworthy. When things are broken, the page feels honest and steady, not alarmist.

## Anti-references

- **Generic SaaS status pages** (Atlassian Statuspage clones, Instatus defaults). Big green check, identical service-row cards, "All Systems Operational" banner, gradient hero. The category cliché this project must not become.
- **Downdetector-style outage panic.** No big red spikes designed for engagement. No comment threads. No "report an outage" gamification.
- **Corporate status-page mimicry.** Don't impersonate Hetzner's own brand voice or visual identity. This is independent observation, and that distinction matters.

## Design Principles

1. **Truth over reassurance.** Never default to "in stock". Sold out is sold out, not "low stock", not "limited". Every cell maps to an actual recent poll, with the poll timestamp visible nearby.
2. **Editorial clarity.** Treat the history of stock-outs and restocks as a record worth reading, not a wall of bars. Prose summaries, named events, real timestamps and durations. The supply story over a year is itself the product.
3. **Glanceable, then deep.** The matrix answers "available right now in region X?" in under two seconds on any device. Per-type history, regional breakdowns, and raw poll logs are one interaction away, never on the same surface.
4. **Independent voice.** Third-party stance is a feature, not a disclaimer. Tone, layout, and copy should make clear this is observation, not Hetzner communication.
5. **Calm under load.** The design must hold up when half the popular types go sold out at once. No animations that distract, no colors that scream, no layout that breaks when an entire column goes red.

## Accessibility & Inclusion

- **WCAG 2.2 AA** as the floor for all public surfaces.
- **Color-blind safe.** Status is never carried by color alone. Pair every status color with a glyph, label, or pattern (operational / degraded / down / unknown all distinguishable in monochrome).
- **Reduced motion respected.** `prefers-reduced-motion` removes all decorative animation; functional state changes use opacity or instant swap.
- **Keyboard reachable.** All interactive history controls (date range, region filter, service drill-in) operable without a pointer.
- **Readable defaults.** Body text 16px floor, line length capped 65–75ch, sufficient contrast on every status color against its background.
