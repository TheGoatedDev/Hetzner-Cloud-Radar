"use client";

import { useEffect, useState } from "react";
import posthog from "posthog-js";

type ConsentStatus = "granted" | "denied" | "pending" | "";

export function CookieBanner() {
  const [consent, setConsent] = useState<ConsentStatus>("");

  useEffect(() => {
    setConsent(posthog.get_explicit_consent_status());
  }, []);

  if (consent !== "pending") return null;

  return (
    <div
      role="dialog"
      aria-label="Analytics cookies"
      className="border-hairline bg-paper-raised fixed inset-x-0 bottom-0 z-50 border-t px-4 py-3 shadow-[0_-4px_24px_oklch(0_0_0/0.08)] sm:px-6"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="font-sans text-sm leading-snug text-ink-soft">
          Analytics cookies (PostHog) help improve this site. Accept enables
          session replay. Decline keeps basic counts only, no cookies.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            className="min-h-11 rounded-edge border border-control-border bg-transparent px-4 py-2 font-mono text-sm text-ink hover:bg-paper-recessed"
            onClick={() => {
              posthog.opt_out_capturing();
              posthog.capture("cookie_consent", { choice: "declined" });
              setConsent("denied");
            }}
          >
            Decline
          </button>
          <button
            type="button"
            className="min-h-11 rounded-edge bg-accent px-4 py-2 font-mono text-sm font-medium text-paper hover:bg-accent-deep"
            onClick={() => {
              posthog.opt_in_capturing();
              posthog.capture("cookie_consent", { choice: "accepted" });
              setConsent("granted");
            }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
