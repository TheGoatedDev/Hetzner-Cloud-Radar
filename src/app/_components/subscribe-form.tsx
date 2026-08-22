"use client";

import posthog from "posthog-js";
import { type FormEvent, useId, useState } from "react";
import {
  DEFAULT_DISPATCH_PREFERENCES,
  type DispatchEvent,
} from "@/lib/marketing/preferences";
import type { DcCode, FamilyId } from "@/lib/schema";
import { PreferenceMatrix } from "./preference-matrix";

type Status = "idle" | "submitting" | "ok" | "error";

export function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [events, setEvents] = useState<DispatchEvent[]>(
    DEFAULT_DISPATCH_PREFERENCES.events,
  );
  const [families, setFamilies] = useState<FamilyId[]>(
    DEFAULT_DISPATCH_PREFERENCES.families,
  );
  const [datacentres, setDatacentres] = useState<DcCode[]>(
    DEFAULT_DISPATCH_PREFERENCES.datacentres,
  );
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const emailId = useId();
  const errorId = useId();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (events.length === 0) {
      setStatus("error");
      setErrorMsg("Pick at least one type of event.");
      return;
    }
    if (families.length === 0) {
      setStatus("error");
      setErrorMsg("Pick at least one server family.");
      return;
    }
    if (datacentres.length === 0) {
      setStatus("error");
      setErrorMsg("Pick at least one datacentre.");
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
        throw new Error(body?.error ?? "Subscription failed.");
      }

      setStatus("ok");
      posthog.capture("dispatch_subscription_created", {
        event_types_selected: events.length,
        server_families_selected: families.length,
        datacentres_selected: datacentres.length,
        alerts_wired: events.length * families.length * datacentres.length,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Subscription failed.";
      setStatus("error");
      setErrorMsg(message);
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
      <div className="flex flex-col gap-3 font-sans text-sm leading-[1.6]">
        <p className="text-ink">
          Thanks. <span className="font-mono text-ink">{email}</span> is on the
          list. A short note will land when {eventCopy}.
        </p>
        <p className="text-ink-soft">
          Resend manages the address and preferences. Unsubscribe with the link
          in any dispatch.
        </p>
        <p className="text-ink-soft">
          Watching {families.map((family) => family.toUpperCase()).join(", ")}{" "}
          in {datacentres.join(", ")}.
        </p>
      </div>
    );
  }

  const disabled = status === "submitting";
  const wired = events.length * families.length * datacentres.length;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label htmlFor={emailId} className="flex flex-1 flex-col gap-1.5">
          <span className="text-xs uppercase tracking-[0.1em] text-ink-faint">
            Email address
          </span>
          <input
            id={emailId}
            type="email"
            required
            disabled={disabled}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            aria-invalid={status === "error" || undefined}
            aria-describedby={status === "error" ? errorId : undefined}
            className="border-0 border-b-2 border-hairline-strong bg-transparent pb-2 font-mono text-sm text-ink placeholder:text-ink-faint focus:border-accent focus-visible:outline-none disabled:opacity-50"
          />
        </label>
        <button
          type="submit"
          disabled={disabled}
          className="rounded-edge bg-accent px-5 py-2 font-mono text-sm font-medium text-paper transition-colors hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-50"
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

      <div className="flex items-baseline justify-between gap-4 border-t border-hairline pt-3 font-mono text-2xs uppercase tracking-[0.1em] text-ink-faint">
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

      <p className="max-w-[60ch] font-sans text-xs leading-[1.55] text-ink-faint">
        Resend manages the address and preferences. No third-party analytics.
        Unsubscribe with the link in any dispatch.
      </p>
    </form>
  );
}
