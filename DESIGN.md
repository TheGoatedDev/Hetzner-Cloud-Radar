---
name: Hetzner Cloud Radar
description: Independent availability dispatch for Hetzner Cloud, monospaced and editorial.
colors:
  paper: "oklch(0.985 0.005 70)"
  paper-recessed: "oklch(0.965 0.006 70)"
  paper-raised: "oklch(0.995 0.004 70)"
  ink: "oklch(0.18 0.008 60)"
  ink-soft: "oklch(0.45 0.005 60)"
  ink-faint: "oklch(0.53 0.005 60)"
  hairline: "oklch(0.88 0.005 70)"
  hairline-strong: "oklch(0.78 0.005 70)"
  control-border: "oklch(0.659 0.005 70)"
  accent: "oklch(0.56 0.14 35)"
  accent-deep: "oklch(0.46 0.15 35)"
  status-available: "oklch(0.3 0.005 60)"
  status-limited: "oklch(0.562 0.11 75)"
  status-sold-out: "oklch(0.45 0.13 30)"
  status-unknown: "oklch(0.65 0.005 60)"
  focus-ring: "oklch(0.56 0.14 35 / 0.75)"
typography:
  data:
    fontFamily: "ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.4
  prose:
    fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  headline:
    fontFamily: "ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: 1.2
  label:
    fontFamily: "ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.12em"
rounded:
  sharp: "0"
  edge: "2px"
spacing:
  0: "0"
  px: "1px"
  0.5: "0.125rem"
  1: "0.25rem"
  1.5: "0.375rem"
  2: "0.5rem"
  3: "0.75rem"
  4: "1rem"
  5: "1.25rem"
  6: "1.5rem"
  8: "2rem"
  10: "2.5rem"
  12: "3rem"
  14: "3.5rem"
  16: "4rem"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.paper}"
    rounded: "{rounded.edge}"
    padding: "0.5rem 1.25rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.edge}"
  input-underline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
---

# Design System: Hetzner Cloud Radar

## 1. Overview

**Creative North Star: "The Independent Dispatch"**

A standing wire desk for Hetzner Cloud availability. The site reads like a dispatch: monospaced, dated, signed, restrained. Numbers and timestamps anchor the page; prose explains what they mean. The voice is the careful observer from `PRODUCT.md`, never the spokesperson. When everything is fine, the page is quiet enough to ignore. When something is on fire, the page is steady enough to trust.

The aesthetic borrows from the indie-editorial changelog tradition (Linear changelog, The Browser Company changelog) and the dispatch tradition (Pitchfork's terse review headers, the date-stamped column inch). Type does most of the work; chrome does almost none. One restrained accent carries actionable meaning, never decoration.

What this system explicitly rejects (carried forward from `PRODUCT.md`): generic SaaS status-page chrome, downdetector-style outage panic, and any visual mimicry of Hetzner's own corporate brand. The page must be unmistakably independent at first glance.

**Key Characteristics:**
- Monospaced-first typography. Mono carries body and data; system sans handles longer prose where mono fatigues.
- Restrained palette: tinted paper neutrals + one oxidised-copper accent reserved for links, primary actions, and focus, never above ~10% of the surface.
- Light-default, warm paper background. Dark mode via `prefers-color-scheme`; canonical tone is paper.
- Status communicated by glyph + label + color, never color alone.
- Layout governed by hairline rules and date stamps, not card grids.
- Motion: functional state only. No choreography, no scroll theatre. `prefers-reduced-motion` collapses animation/transition duration.

Source of truth for CSS custom properties: `src/app/globals.css`.

## 2. Colors

### Primary
- **Oxidised copper** (`oklch(0.56 0.14 35)`, `--accent`): Active links, primary buttons, focus ring, selection. Used on ≤10% of any surface. Never decorative. Deep variant `--accent-deep` for hover.

### Stock states (`src/lib/schema.ts` `STOCK`)
- **Available** (`●`, `--status-operational` graphite): default-but-not-celebrated.
- **Limited** (`◐`, `--status-degraded` desaturated amber): poll flicker only.
- **Sold out** (`■`, `--status-down` low-chroma ember): loudest state, never garish.
- **Not offered** (`·`, `--ink-faint`): permanent absence in region.
- **Unknown** (`○`, `--status-unknown` / ink-faint): stale or missing poll.

Labels render uppercase only in status chrome (glyph + label pairs). Sentence-case labels live in `STOCK[state].label`.

### Neutral
| Token | Light OKLCH | Role |
|-------|-------------|------|
| `--paper` | `0.985 0.005 70` | Page background |
| `--paper-recessed` | `0.965 0.006 70` | Recessed surface |
| `--paper-raised` | `0.995 0.004 70` | Popover / tooltip surface |
| `--ink` | `0.18 0.008 60` | Body text |
| `--ink-soft` | `0.45 0.005 60` | Secondary text |
| `--ink-faint` | `0.53 0.005 60` | Meta, eyebrows, axis labels (≥4.5:1 on paper) |
| `--hairline` | `0.88 0.005 70` | Default 1px rules |
| `--hairline-strong` | `0.78 0.005 70` | Section / masthead rules |
| `--control-border` | `0.659 0.005 70` | Input underline at rest |

Dark values swap under `@media (prefers-color-scheme: dark)` in `globals.css`.

### Named Rules
**The One Accent Rule.** Accent ≤10% of any surface. Density of sold-out cells is glyphs + labels, not a sea of accent.

**The Never-Default-Green Rule.** Available is graphite, not green.

## 3. Typography

**Body / Data:** system mono stack (`--font-mono` in `globals.css`).
**Prose:** system UI sans (`--font-sans`).
**Display:** same mono at larger sizes with tight tracking.

Emails may use IBM Plex Mono/Sans in the HTML stack for client reliability; the site itself stays system fonts (Worker size).

**Email type ramp (intentional parallel):** 10px kicker, 11px status, 12px meta, 13px detail rows, 15px prose, 20px title. Not the web rem scale; document here so detectors treat it as designed, not drift. Hex colors live in `src/emails/_components/theme.ts` as sRGB peers of the OKLCH tokens.

**OG image:** sRGB hex peers of light tokens in `opengraph-image.tsx` (`#fcfaf7` paper, `#14110e` ink, `#6e6b69` faint, `#575552` soft, `#b75037` accent).

### Hierarchy (implemented)
- **Masthead / section title** (mono, medium/semibold, `text-lg`–`text-xl`)
- **Body data** (mono, `text-sm` / `text-xs`, tabular nums for timestamps)
- **Body prose** (sans, `text-base`, max ~68ch; 16px floor)
- **Eyebrow / form label** (mono or plain, `text-xs`, sentence case, tracking-wide; not uppercase)
- **Status label / region code** (mono, `text-xs`, uppercase, tracking ~0.1–0.12em): only place uppercase is allowed

### Named Rules
**The Mono-Where-It-Matters Rule.** Data (timestamps, percentages, region codes, durations, type codes) is mono always.

**The Prose-Switch Rule.** Running text longer than ~3 lines uses sans.

**The Uppercase-Is-Status Rule.** Uppercase only for stock status labels and datacentre codes (`NBG1`, `FSN1`, …). Headings, eyebrows, form labels, buttons, and table column titles are sentence case.

## 4. Layout

Dispatch layout is a single column on paper. Spacing is a fixed Tailwind rem scale (base 4px). Prefer the named steps below; do not invent one-off values (e.g. `gap-7`, `pt-11`, `py-3.5`).

### Scale (Tailwind step → rem → px @ 16)

| Step | rem | px | Use |
|------|-----|-----|-----|
| `0.5` | 0.125 | 2 | Micro stack inside a tight group (fieldset inner) |
| `1` | 0.25 | 4 | **Dense row pad** (matrix cells, preference check rows) |
| `1.5` | 0.375 | 6 | Label-to-control inside a field |
| `2` | 0.5 | 8 | Default tight cluster; header pad; button vertical pad |
| `3` | 0.75 | 12 | Inline group; popover pad; section-header bottom pad |
| `4` | 1 | 16 | Default stack inside a section or form group |
| `5` | 1.25 | 20 | Section content stack (right-now, supply) |
| `6` | 1.5 | 24 | Form block stack; masthead bottom pad; page shell (mobile) |
| `8` | 2 | 32 | Month group / mid section break |
| `10` | 2.5 | 40 | **Default section top** (`pt-10`); page shell ≥sm horizontal |
| `12` | 3 | 48 | Between family blocks |
| `14` | 3.5 | 56 | Dispatches block top |
| `16` | 4 | 64 | Subscribe / footer top (`pt-16` / `mt-16`) |

### Roles (pick by job, not by eye)

| Role | Tokens | Where |
|------|--------|--------|
| **Dense row** | `py-1`, `px-1`–`px-2` | Family matrix type/spec/stock cells; preference check rows |
| **Tight cluster** | `gap-1`–`gap-2` | Glyph + label, counter pairs, popover internals |
| **Section stack** | `gap-4`–`gap-5` | Content under a section header |
| **Form stack** | `gap-4` groups, `gap-6` form root | Subscribe / unsubscribe |
| **Section top** | `pt-10` default; `pt-12` / `pt-14` / `pt-16` when the block needs more air | Family, legend, supply, subscribe, dispatches |
| **Section rule pad** | `pb-3` under section header; `pb-6` masthead; `pt-6` footer | Hairline companions |
| **Page shell** | `page-shell`: `1.5rem` pad (mobile), `2.5rem` horizontal ≥sm; safe-area aware | All pages |
| **Content width** | `max-w-5xl` home / wide archive; `max-w-3xl` methodology / unsubscribe | `PageFrame` / `RadarView` |
| **Prose measure** | `max-w-[68ch]` (forms may use `60ch`) | Blurbs, dispatch bodies, methodology |
| **Popover** | `p-3`, `w-[min(360px,calc(100vw-16px))]` | Stock cell history |

### Named Rules

**The Dense-Data Rule.** Tables and preference matrices stay dense: row pad is `py-1`, not card padding. Vertical rhythm comes from hairlines between rows, not fat cells.

**The Section-Rhythm Rule.** Major blocks open with `pt-10` (or the larger steps above). Do not stack arbitrary `pt-7` / `mt-9`. Space between siblings inside a block is `gap-4` or `gap-5`, not mixed.

**The Shell-Not-Card Rule.** Page margin is `page-shell` only. Components do not add their own outer page padding. Nested chrome (popover) uses `p-3`, never a second full shell.

**The Scale-Only Rule.** Spacing values come from the table. If a new step is needed, add it here first, then use it.

## 5. Elevation

Flat by default. Tonal steps (`paper` / `paper-recessed` / `paper-raised`) and 1px hairlines. Soft shadow only on hover-revealed popovers/tooltips (`shadow-sm`).

### Named Rules
**The Flat-Dispatch Rule.** No floating card chrome.

**The No-Card-Grid Rule.** Status is rows on paper, separated by hairlines.

## 6. Components

- **Primary button:** `rounded-edge` (2px), mono label, sentence case, `min-h-11` on primary CTAs, `px-5 py-2`, `bg-accent` / `text-paper`, hover `bg-accent-deep`.
- **Ghost / secondary control:** hairline border, ink text, accent on hover; dense contexts may drop the 44px floor (matrix, preference rows).
- **Input:** bottom border only (`border-b-2 border-control-border`), focus `border-accent`, no glow; label `gap-1.5` above.
- **Stock cell:** glyph control `size-8`, cell `py-1`; popover with 24h history strip + optional mail prefs.
- **Stock glyph + label:** always paired; never color alone.
- **Family table:** hairline row separators; cells `align-middle`; DC headers uppercase; Type/Spec sentence case; dense `py-1`.
- **Preference matrix:** group stack `gap-4`; rows `py-1`; fieldset inner `gap-0.5`.
- **Dispatch row:** `py-6` per entry; timestamp left, title + sans body right; status tag uppercase with glyph.
- **Eyebrow:** sentence-case meta line above sections (`Eyebrow` component).
- **Navigation:** text links, sentence case, accent on hover; no pills.

## 7. Do's and Don'ts

### Do
- Pair every status colour with glyph and label.
- Keep accent below ~10% of any surface.
- Timestamp observations near status readings.
- Separate sections with hairlines and date stamps.
- Respect `prefers-reduced-motion`.
- Use the spacing scale and role table for pad/gap/margin.
- Keep data tables dense (`py-1`); put air between sections, not inside rows.

### Don't
- Build a generic SaaS status page (big green check, service-row cards, gradient hero).
- Ship downdetector-style panic chrome.
- Mimic Hetzner corporate brand.
- Default available to green.
- Use `border-left` >1px colored stripes, gradient text, or card grids for status.
- Use uppercase outside status labels and region codes.
- Use em dashes in copy; prefer comma, colon, semicolon, period, or parentheses.
- Animate page entrances or scroll choreography.
- Invent off-scale spacing (`gap-7`, `pt-11`, `p-3.5`) without updating this file.
- Pad matrix or preference rows like cards.
