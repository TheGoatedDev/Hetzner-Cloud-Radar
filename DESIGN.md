<!-- SEED: re-run /impeccable document once there's code to capture the actual tokens and components. -->
---
name: Hetzner Cloud Radar
description: Independent uptime dispatch for Hetzner Cloud, monospaced and editorial.
---

# Design System: Hetzner Cloud Radar

## 1. Overview

**Creative North Star: "The Independent Dispatch"**

A standing wire desk for Hetzner Cloud availability. The site reads like a dispatch: monospaced, dated, signed, restrained. Numbers and timestamps anchor the page; prose explains what they mean. The voice is the careful observer from `PRODUCT.md`, never the spokesperson. When everything is fine, the page is quiet enough to ignore. When something is on fire, the page is steady enough to trust.

The aesthetic borrows from the indie-editorial changelog tradition (Linear changelog, The Browser Company changelog) and the dispatch tradition (Pitchfork's terse review headers, the date-stamped column inch). Type does most of the work; chrome does almost none. One restrained accent carries actionable meaning, never decoration.

What this system explicitly rejects (carried forward from `PRODUCT.md`): generic SaaS status-page chrome, downdetector-style outage panic, and any visual mimicry of Hetzner's own corporate brand. The page must be unmistakably independent at first glance.

**Key Characteristics:**
- Monospaced-first typography. Mono carries body and data; a humanist sans handles longer prose where mono fatigues.
- Restrained palette: tinted paper neutrals + one accent reserved for active status and primary actions, never above ~10% of the surface.
- Light-default, warm paper background. Dark mode supported via `prefers-color-scheme`, but the canonical tone is paper.
- Status communicated by glyph + label + color, never color alone.
- Layout governed by a measured baseline grid, not card grids. Horizontal rules and date stamps beat container chrome.
- Motion: state changes and quiet entrance fades. No choreography, no scroll theatre.

## 2. Colors

A restrained, paper-toned palette. One accent. Status roles are derived from the accent and a desaturated warning hue, not from a saturated traffic-light set.

### Primary
- **[Accent name to be resolved during implementation]** (`[to be resolved during implementation]`): Reserved for active links, primary actions, the "now" marker on timelines, and the operational status glyph. Used on ≤10% of any surface. Never decorative. Anchor hue family: warm and confident, not cyan-blue (avoid the observability-dark-blue first-order reflex). Candidate directions: oxidised copper, deep sienna, persimmon ink, or terracotta. Resolve in OKLCH; record the canonical value here and in the frontmatter on the next document pass.

### Stock states (derived; not a parallel palette)
- **Available**: a near-neutral graphite, paired with a filled circle glyph (`●`). The default-but-not-celebrated state. The colour does not shout when things are in stock.
- **Limited**: a desaturated amber, paired with a half-filled glyph (`◐`) and a label. Used sparingly: only when poll data genuinely flickers between in and out of stock.
- **Sold out**: a deep, low-chroma ember (warm, not fire-engine red), paired with a filled square (`■`) and a label. The visually loudest state, but never garish.
- **Not offered**: an interpunct (`·`) in `ink-faint`. Indicates this server type is not sold in this region at all (e.g. CAX in non-EU datacentres). Communicates "permanent absence", not "we don't know".
- **Unknown / Stale poll**: a dotted outline (`○`) in neutral. Reserved for transient unknowns when the most recent poll for a cell has aged past its tolerance.

All pairings must be legible in monochrome; the glyph and label carry the meaning if colour is stripped. The matrix must read at-a-glance even on a black-and-white printout.

### Neutral
- **Paper**: warm off-white background, tinted toward the accent hue (chroma ~0.005). Never `#fff`.
- **Ink**: near-black, tinted toward the accent hue (chroma ~0.005). Never `#000`. Used for body text and rules.
- **Margin**: the muted neutral between paper and ink, used for secondary text, timestamps, axis labels, low-emphasis chrome.
- **Hairline**: a single divider tone for rules and 1px borders. One width, one tone, used everywhere.

Exact OKLCH values: `[to be resolved during implementation]`. Lock them on the first scan-mode `/impeccable document` pass.

### Named Rules
**The One Accent Rule.** The accent appears on ≤10% of any rendered surface. If half the regions go red, the surface is ink-on-paper with status glyphs and labels carrying the load, not a sea of accent.

**The Never-Default-Green Rule.** Available state is graphite, not green. The category cliché of "all in stock, all green" is itself reassurance theatre, which `PRODUCT.md` rejects. A green matrix would be the failure state of this design, not the success state.

## 3. Typography

**Body / Data Font:** A humanist or technical monospace (e.g. JetBrains Mono, Berkeley Mono, Commit Mono, IBM Plex Mono). `[exact family to be chosen at implementation]`
**Prose Font:** A humanist sans for long-form incident write-ups and editorial copy where mono fatigues at length (e.g. Inter, Söhne, IBM Plex Sans). `[exact family to be chosen at implementation]`
**Display Font:** Same family as the body mono, used at larger sizes with tightened tracking for incident titles, region headers, date stamps.

**Character:** Dispatch type. The mono supplies the rhythm, the timestamp grid, and the technical cadence. The sans, used sparingly for paragraphs longer than ~3 lines, keeps long incident prose readable without bouncing the reader into a different visual register.

### Hierarchy

Use a fixed rem scale, not fluid clamp. Step ratio ~1.2 between adjacent levels. Specific px values resolved at implementation; directional sizes given for reference.

- **Display** (mono, semibold, ~32px, line-height 1.15): Incident titles. Region headers on the dispatch page. Used sparingly, never on a dashboard tile.
- **Headline** (mono, semibold, ~22px, line-height 1.2): Section headers, "current status" header, daily summary lead.
- **Title** (mono, medium, ~16px, line-height 1.3): Service / region row titles.
- **Body — data** (mono, regular, ~14px, line-height 1.4): The default. Probe results, timestamps, percentages, region codes, table cells.
- **Body — prose** (sans, regular, ~16px, line-height 1.55, max ~70ch): Incident write-ups, summaries, anything longer than a short sentence.
- **Label** (mono, medium, ~12px, letter-spacing +0.04em, uppercase): Status labels (`OPERATIONAL`, `DEGRADED`), region codes (`NBG1`, `FSN1`, `HEL1`), category tags. Uppercase here is the dispatch convention; nowhere else.

### Named Rules
**The Mono-Where-It-Matters Rule.** Anything that is data (timestamps, percentages, region codes, durations, dates) is mono, always, even mid-sentence. Mid-sentence mono runs in line with sans prose; the visual switch reinforces "this is a measurement".

**The Prose-Switch Rule.** When a single passage of running text exceeds three lines, switch to the sans. Mono prose at length is readable but exhausting; this is an editorial site, and long passages must reward reading.

**The Uppercase-Is-Status Rule.** Uppercase is reserved for status labels and region codes. Headings are sentence case. This protects the visual signal of a status label.

## 4. Elevation

Flat by default. The system uses tonal layering and hairline rules, not shadows. Depth comes from neutral steps (paper, slightly recessed paper, slightly raised paper) and 1px hairline dividers, not blur.

The only shadows allowed are functional: a single soft shadow on hover-revealed tooltips and on the active row of a long table when sticky-scrolled. No ambient shadows on cards. No "lifted" buttons.

### Named Rules
**The Flat-Dispatch Rule.** A page of dispatches is a single sheet. Surfaces do not float over surfaces. If something needs to feel separated, it gets a hairline rule and a date stamp, not a drop shadow.

**The No-Card-Grid Rule.** Repeating same-sized cards with icon + heading + text are an explicit anti-pattern (`PRODUCT.md` anti-reference: SaaS status page). Status rows are rows, not cards. Region groupings use rules and indentation, not bordered tiles.

## 5. Components

No components exist yet. This section will be filled by the next scan-mode `/impeccable document` pass once primitives are built. Direction notes for the upcoming implementation:

- Buttons: square or 2px-radius, mono label, sentence case for actions, uppercase reserved for status. Primary uses the accent on a paper background; ghost is ink-on-paper with hairline border.
- Status row: time-stamped left margin, mono label, glyph, region code, latency reading. No background fill. Hairline above and below, not a border-box.
- Timeline / history strip: horizontal mono ticks, date stamps every N units, accent for the "now" marker only. Status changes shown as stepped fills, not gradient bars.
- Inputs: hairline underline, no full border-box. Focus state is an accent underline at 1.5px, never a glow.
- Navigation: text-only, mono, sentence case. Active link uses the accent; no pill, no underline animation.

## 6. Do's and Don'ts

### Do:
- **Do** treat type as the primary visual material. The mono grid is the look.
- **Do** pair every status colour with a glyph and a label. Pull the screenshot test: if the page renders monochrome, can someone still tell operational from degraded from down? If no, fix it.
- **Do** keep the accent below ~10% of any surface, even during a multi-region outage. Density of red on the page is not the message.
- **Do** sign and timestamp every dispatch. Independent observation is the product; "observed at HH:MM:SS UTC from <probe location>" should be visible near every status reading.
- **Do** use hairline rules and date stamps to separate sections, not card chrome.
- **Do** respect `prefers-reduced-motion`. Disable entrance fades; functional state changes use opacity swaps under 100ms.

### Don't:
- **Don't** build a generic SaaS status page (PRODUCT.md anti-reference: Atlassian Statuspage clones, Instatus defaults). No big green check, no identical service-row cards, no "All Systems Operational" banner, no gradient hero.
- **Don't** ship downdetector-style outage panic (PRODUCT.md anti-reference). No giant red spikes, no engagement-bait outage counters, no comment threads.
- **Don't** mimic Hetzner's corporate brand voice or visual identity (PRODUCT.md anti-reference). Independence has to be visible at first glance.
- **Don't** default operational to green. Graphite plus glyph plus the word `OPERATIONAL`.
- **Don't** use `border-left` greater than 1px as a colored stripe on rows or callouts (shared absolute ban).
- **Don't** use gradient text or `background-clip: text` (shared absolute ban).
- **Don't** wrap status data in cards. Rows on paper, separated by hairlines.
- **Don't** introduce display fonts for UI labels, buttons, or data. Mono and sans, that's the system.
- **Don't** use uppercase for anything except status labels and region codes.
- **Don't** animate page entrances or scroll choreography. The site loads as a sheet, instantly.
- **Don't** use em dashes anywhere in copy; comma, colon, semicolon, period, or parentheses (shared global rule).
