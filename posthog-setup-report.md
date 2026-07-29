# PostHog setup report

PostHog browser analytics, global exception capture, four newsletter conversion/churn events, and a starter dashboard were set up for the Next.js App Router application.

## What was installed and initialized

- Installed `posthog-js` 1.407.8 and `posthog-node` 5.46.1 with pnpm; both are recorded in `package.json` and `pnpm-lock.yaml`.
- Added `instrumentation-client.ts` as the single client initialization point. It reads `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` from the environment, initializes `posthog-js` once with standard defaults, and enables `capture_exceptions: true`.
- Added the PostHog environment variable names to `env.example`; the real values were configured in the project environment through the wizard.
- No server-side PostHog client was added because the instrumented actions are covered by browser-side success captures and no stable server-side distinct ID is available.

## Events instrumented

| Event | What it measures | File |
|---|---|---|
| `dispatch_subscription_created` | A visitor successfully subscribes to Hetzner availability dispatches. | `src/app/_components/subscribe-form.tsx` |
| `dispatch_preferences_updated` | A visitor successfully saves a non-empty set of dispatch preferences. | `src/app/unsubscribe/_components/unsubscribe-form.tsx` |
| `dispatch_subscription_cancelled` | A visitor successfully removes all dispatch preferences and unsubscribes. | `src/app/unsubscribe/_components/unsubscribe-form.tsx` |
| `unsubscribe_feedback_submitted` | A former subscriber successfully submits a structured unsubscribe reason. | `src/app/unsubscribe/_components/unsubscribe-form.tsx` |

Captures run only after their corresponding request succeeds. Event properties contain counts, structured reasons, and source context; email addresses and free-text feedback are excluded. The events are currently personless because no application-owned stable user or subscriber identifier exists.

## Identification

User identification was skipped. The application has no authentication, account, session, or persisted user model, and its only identity-like value is a newsletter email. Email was not used as a PostHog distinct ID. If a stable application-owned subscriber or account ID is introduced, wire `identify` after successful authentication or registration, keep email in person properties only, and reset on logout.

## Error tracking

Global browser exception tracking is enabled through `capture_exceptions: true` in `instrumentation-client.ts`. No additional error boundary or manual exception capture calls were added.

This run verified the configuration and successful build/TypeScript compilation, but it did **not** observe events or exceptions arriving in PostHog. Delivery and runtime ingestion remain unconfirmed.

## Dashboard

[Analytics basics (wizard)](https://eu.posthog.com/project/159701/dashboard/860269)

The dashboard contains four insights for subscription creation, preference updates, subscription cancellations, and the subscription lifecycle funnel. They are configured to render empty until events arrive; no event volume was required or observed during setup.

## Verification and conflicts

- `pnpm install` completed successfully with the lockfile up to date.
- `pnpm build` completed successfully twice, including compilation, TypeScript checking, and static page generation.
- Biome checks passed for the initialization and instrumented source files.
- Project-wide lint did not pass: it reports formatting differences in the generated workflow artifact `.posthog-wizard-cache/queue.json`. This artifact is outside the integration source changes.
- Build logs reported missing `DATABASE_URL` while static pages were generated, due to pre-existing validation in `src/env.ts`; the build still exited successfully.
- No Content-Security-Policy was present, so CSP changes were not applicable.
- The run did not exercise production delivery, so it cannot claim that any event was captured by PostHog.

## Before you merge

- [ ] Run a full production build in the target deployment environment and confirm the generated integration still compiles; the wizard build succeeded, but runtime delivery was not verified.
- [ ] Run the test suite and update any mocks or fixtures needed for the new `posthog.capture` calls in `src/app/_components/subscribe-form.tsx` and `src/app/unsubscribe/_components/unsubscribe-form.tsx`.
- [ ] Confirm `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` are set in every deployment environment, not only locally, and that the exact names documented in `env.example` are used.
- [ ] Trigger each successful subscribe, preference-update, full-unsubscribe, and feedback flow in a non-production or production-like environment and confirm the corresponding events arrive in PostHog; this run observed no ingestion.
- [ ] If the application later gains a stable subscriber or account ID, replace the personless attribution approach by wiring `identify` and `reset` according to the identity contract; there are currently no `DISTINCT_ID` placeholders to replace.
