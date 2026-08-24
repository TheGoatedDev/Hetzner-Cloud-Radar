"use client";

import posthog from "posthog-js";
import { type FormEvent, useId, useState } from "react";
import { useDispatchPrefStore } from "@/lib/marketing/dispatch-pref-store";
import { PreferenceMatrix } from "./preference-matrix";

type Status = "idle" | "submitting" | "ok" | "error";

export function SubscribeForm() {
  const [email, setEmail] = useState("");
  const events = useDispatchPrefStore((s) => s.events);
  const families = useDispatchPrefStore((s) => s.families);
  const datacentres = useDispatchPrefStore((s) => s.datacentres);
  const setEvents = useDispatchPrefStore((s) => s.setEvents);
  const setFamilies = useDispatchPrefStore((s) => s.setFamilies);
  const setDatacentres = useDispatchPrefStore((s) => s.setDatacentres);
  const lock = useDispatchPrefStore((s) => s.lock);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const emailId = useId();
  const errorId = useId();

  function focusEmail() {
    queueMicrotask(() => {
      document.getElementById(emailId)?.focus();
    });
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (events.length === 0) {
      setStatus("error");
      setErrorMsg("Pick at least one type of event.");
      focusEmail();
      return;
    }
    if (families.length === 0) {
      setStatus("error");
      setErrorMsg("Pick at least one server family.");
      focusEmail();
      return;
    }
    if (datacentres.length === 0) {
      setStatus("error");
      setErrorMsg("Pick at least one datacentre.");
      focusEmail();
      return;
    }
    setStatus("submitting");
    setErrorMsg("");

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email,
          events,
          families,
          datacentres,
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Subscription failed. Try again.");
      }

      setStatus("ok");
      lock();
      posthog.identify(email, { email });
      posthog.capture("dispatch_subscription_created", {
        event_types_selected: events.length,
        server_families_selected: families.length,
        datacentres_selected: datacentres.length,
        alerts_wired: events.length * families.length * datacentres.length,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Subscription failed. Try again.";
      setStatus("error");
      setErrorMsg(message);
      focusEmail();
      posthog.capture("subscribe_failed", { error: message });
    }
  }

  if (status === "ok") {
    const wantsSoldOut = events.includes("soldout");
    const wantsRestock = events.includes("restock");
    const eventCopy =
      wantsSoldOut && wantsRestock
        ? "a server type goes sold out or returns to stock"
        : wantsSoldOut
          ? "a server type goes sold out"
          : "a server type returns to stock";

    return (
      <output
        className="flex flex-col gap-3 font-sans text-base leading-[1.6]"
        aria-live="polite"
      >
        <p className="text-ink">
          Thanks.{" "}
          <span className="font-mono text-ink" translate="no">
            {email}
          </span>{" "}
          is on the list. A short note will land when {eventCopy}.
        </p>
        <p className="text-ink-soft">
          Resend manages the address and preferences. Unsubscribe with the link
          in any dispatch.
        </p>
        <p className="text-ink-soft">
          Watching {families.map((family) => family.toUpperCase()).join(", ")}{" "}
          in {datacentres.join(", ")}.
        </p>
      </output>
    );
  }

  const disabled = status === "submitting";
  const wired = events.length * families.length * datacentres.length;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label
          htmlFor={emailId}
          className="flex min-w-0 flex-1 flex-col gap-1.5"
        >
          <span className="text-xs tracking-wide text-ink-faint">
            Email address
          </span>
          <input
            id={emailId}
            name="email"
            type="email"
            required
            disabled={disabled}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com…"
            autoComplete="email"
            spellCheck={false}
            aria-invalid={status === "error" || undefined}
            aria-describedby={status === "error" ? errorId : undefined}
            className="border-0 border-b-2 border-control-border bg-transparent pb-2 font-mono text-sm text-ink placeholder:text-ink-faint focus:border-accent disabled:opacity-50"
          />
        </label>
        <button
          type="submit"
          disabled={disabled}
          className="min-h-11 rounded-edge bg-accent px-5 py-2 font-mono text-sm font-medium text-paper transition-colors hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          {disabled ? "Subscribing…" : "Subscribe"}
        </button>
      </div>

      <PreferenceMatrix
        events={events}
        families={families}
        datacentres={datacentres}
        onEventsChange={setEvents}
        onFamiliesChange={setFamilies}
        onDatacentresChange={setDatacentres}
        disabled={disabled}
      />

      <div className="flex min-w-0 items-baseline justify-between gap-4 border-t border-hairline pt-3 font-mono text-2xs tracking-wide text-ink-faint">
        <span>
          → {wired} alert{wired === 1 ? "" : "s"} wired
        </span>
        <span aria-hidden="true">
          {events.length} × {families.length} × {datacentres.length}
        </span>
      </div>

      {status === "error" && errorMsg ? (
        <p id={errorId} role="alert" className="font-mono text-sm text-down">
          <span aria-hidden="true">✕ </span>
          {errorMsg}
        </p>
      ) : null}

      <p className="max-w-[60ch] font-sans text-base leading-[1.55] text-ink-soft">
        Resend manages the address and preferences. Product analytics via
        PostHog. Unsubscribe with the link in any dispatch.
      </p>
    </form>
  );
}
