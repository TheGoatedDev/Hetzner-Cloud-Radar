# Resend topics for dispatch filters

Hetzner Cloud Radar stores subscriber identity and delivery preferences in Resend, not in the application database. Dispatch filters will follow that boundary by mapping each deliverable stream to a private Resend Topic named `hcr:{event}:{family}:{dc}`, such as `hcr:soldout:cx:nbg1`; this avoids app-owned recipient storage while keeping broadcasts targeted to the subscriber's chosen server family and datacentre interests.

## Consequences

- A dispatch maps to one concrete topic derived from its event type, server family, and datacentre.
- Filter topics are created lazily and fail closed if creation or lookup fails.
- "All" is represented by explicit opt-ins to every currently known concrete topic, not by an omitted-key wildcard topic.
- Preference updates overwrite the full concrete-topic matrix for the chosen event streams.
- Existing broad sold-out/restock topic preferences will be migrated into concrete-topic opt-ins before the old broad topics are retired.
