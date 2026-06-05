# ADR 0003: Semi-Dynamic Server Families

## Decision

Server family IDs are derived from the leading lowercase letters in Hetzner server type codes, such as `CX23 -> cx` and `CAX11 -> cax`. Polling stores every valid derived family from the live Hetzner API, including families not yet exposed publicly.

Local metadata gates exposure. `visible` controls dashboard and public availability APIs. `dispatchEnabled` controls subscription preferences and Resend topic routing. A family cannot be dispatch-enabled while hidden.

## Consequences

- Unknown live families are stored hidden, preserving history from first discovery.
- Public read models, dispatch lists, supply history, and history popovers include visible families only.
- Marketing dispatches are sent only for dispatch-enabled families; hidden or non-dispatch-enabled families are skipped.
- Resend topics are created by explicit migration scripts, not runtime requests.
- `pnpm families:audit` compares live Hetzner families against acknowledged local metadata and fails on unknown families or malformed server type codes.

## Rationale

Hetzner can add product lines without code changes to polling. Public presentation and email routing still need deliberate product copy, ordering, and Resend topic setup. This split keeps data capture broad while keeping public UI and email behavior safe.
