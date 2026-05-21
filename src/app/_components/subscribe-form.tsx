"use client";

import { type FormEvent, useId, useState } from "react";
import {
  DEFAULT_DISPATCH_PREFERENCES,
  DISPATCH_EVENTS,
  type DispatchEvent,
  SERVER_FAMILIES,
} from "@/lib/marketing/preferences";
import { DCS, type DcCode, type FamilyId } from "@/lib/schema";

type Status = "idle" | "submitting" | "ok" | "error";

const EVENT_LABELS: Record<DispatchEvent, string> = {
  soldout: "Sold-out events",
  restock: "Restocks",
};

function toggleValue<T extends string>(
  values: T[],
  value: T,
  checked: boolean,
) {
  return checked
    ? [...new Set([...values, value])]
    : values.filter((item) => item !== value);
}

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
    } catch (error) {
      setStatus("error");
      setErrorMsg(
        error instanceof Error ? error.message : "Subscription failed.",
      );
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

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-7" noValidate>
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

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-xs uppercase tracking-[0.1em] text-ink-faint">
          Tell me about
        </legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {DISPATCH_EVENTS.map((event) => (
            <label
              key={event}
              className="flex cursor-pointer items-baseline gap-2"
            >
              <input
                type="checkbox"
                checked={events.includes(event)}
                onChange={(e) =>
                  setEvents((current) =>
                    toggleValue(current, event, e.target.checked),
                  )
                }
                className="size-3.5 accent-accent"
              />
              <span className="text-ink">{EVENT_LABELS[event]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-xs uppercase tracking-[0.1em] text-ink-faint">
          Server families
        </legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {SERVER_FAMILIES.map((family) => (
            <label
              key={family}
              className="flex cursor-pointer items-baseline gap-2"
            >
              <input
                type="checkbox"
                checked={families.includes(family)}
                onChange={(e) =>
                  setFamilies((current) =>
                    toggleValue(current, family, e.target.checked),
                  )
                }
                className="size-3.5 accent-accent"
              />
              <span className="text-ink">{family.toUpperCase()}</span>
            </label>
          ))}
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setFamilies([...SERVER_FAMILIES])}
          className="w-fit font-mono text-xs text-accent underline-offset-4 hover:underline disabled:opacity-50"
        >
          Select all families
        </button>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-xs uppercase tracking-[0.1em] text-ink-faint">
          Datacentres
        </legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {DCS.map((datacentre) => (
            <label
              key={datacentre}
              className="flex cursor-pointer items-baseline gap-2"
            >
              <input
                type="checkbox"
                checked={datacentres.includes(datacentre)}
                onChange={(e) =>
                  setDatacentres((current) =>
                    toggleValue(current, datacentre, e.target.checked),
                  )
                }
                className="size-3.5 accent-accent"
              />
              <span className="text-ink">{datacentre}</span>
            </label>
          ))}
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setDatacentres([...DCS])}
          className="w-fit font-mono text-xs text-accent underline-offset-4 hover:underline disabled:opacity-50"
        >
          Select all datacentres
        </button>
      </fieldset>

      {status === "error" && errorMsg ? (
        <p id={errorId} role="alert" className="font-sans text-sm text-down">
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
