# Hetzner Cloud Radar

Hetzner Cloud Radar tracks third-party observations of Hetzner Cloud server availability and the dispatches people can subscribe to when availability changes.

## Language

**Dispatch**:
An email alert about a server availability change observed by Hetzner Cloud Radar.
_Avoid_: Notification, blast

**Full unsubscribe**:
A subscriber's choice to stop receiving all Hetzner Cloud Radar dispatches.
_Avoid_: Unsubscribe, cancellation

**Preference update**:
A subscriber's choice to keep receiving at least one dispatch type while stopping another.
_Avoid_: Partial unsubscribe

**Dispatch filter**:
A subscriber's rule limiting future dispatches by the infrastructure they care about.
_Avoid_: Notification filter, alert filter

**Server family**:
A Hetzner Cloud product line grouping related server types under one label.
_Avoid_: Server class, server category

**Datacentre**:
A Hetzner Cloud place where a server type may be available, sold out, or not offered.
_Avoid_: Location, region

**Unsubscribe feedback**:
An optional reason or note a subscriber gives after choosing a full unsubscribe.
_Avoid_: Feedback, review

**Availability history**:
The 14-day minute-grain record of stock states for one server type in one datacentre, surfaced as a popover when a reader hovers or taps an availability dot.
_Avoid_: Cell timeline, stock trail, region history

## Relationships

- A **Dispatch** belongs to one availability-change type.
- A **Full unsubscribe** stops all future **Dispatches** for the subscriber.
- A **Preference update** keeps one or more future **Dispatch** types enabled for the subscriber.
- A **Dispatch filter** narrows future **Dispatches** by one or more **Server families** and **Datacentres**.
- **Unsubscribe feedback** belongs to a **Full unsubscribe**.

## Example dialogue

> **Dev:** "Should we ask for **Unsubscribe feedback** when someone makes a **Preference update**?"
> **Domain expert:** "No. **Unsubscribe feedback** only belongs to a **Full unsubscribe**."
>
> **Dev:** "If someone only cares about CX in NBG1, FSN1, and HEL1, is that a **Preference update**?"
> **Domain expert:** "No — the sold-out/restock choice is the **Preference update**; CX plus those datacentres is a **Dispatch filter**."

## Flagged Ambiguities

- "feedback" was used broadly; resolved as **Unsubscribe feedback**, an optional reason or note attached only to a **Full unsubscribe**.
