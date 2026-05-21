# Availability history popover

Hovering (or tapping on mobile) an availability dot for a given server type and datacentre opens a popover showing 14 days of minute-grain availability history. The history is fetched on demand per cell, transmitted as run-length-encoded state transitions rather than raw observations, rendered as a continuous segmented Gantt strip with a one-line summary, and gaps in polling longer than three times the poll cadence are surfaced as `unknown` segments rather than carried forward.

## Consequences

- A cell's availability history is the canonical 14-day record for one (server type, datacentre) pair; it is not aggregated across a family or across datacentres.
- The wire format is a list of runs `{ from, to, state }` rather than per-minute points; payload stays small (kilobytes, not megabytes) and the API contract is stable against future cadence changes.
- The history endpoint is fetched lazily after a 150 ms hover-intent delay; cursor sweeps across the table do not fire requests.
- Each cell's runs are cached client-side for the page session and server-side for 60 seconds (one poll cycle), so concurrent hovers collapse to at most one database read per cell per minute.
- A gap of more than 180 seconds between consecutive observations renders as an `unknown` segment; shorter gaps are treated as continuation of the prior state. This makes poller outages visible rather than masquerading as availability.
- The popover summary line ("13d 4h available · 18h sold-out · 2h unknown · last change 4h ago") doubles as the screen-reader label; the strip itself is `aria-hidden`.
- Stacked-by-day and sparkline renderings were rejected to keep the strip aligned with the table's discrete glyph language; diurnal patterns are out of scope for the hover surface.
