"use client";

import { type FormEvent, useId, useState } from "react";

type Status = "idle" | "submitting" | "ok" | "error";

export function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [soldOut, setSoldOut] = useState(true);
  const [restock, setRestock] = useState(true);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const emailId = useId();
  const errorId = useId();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!soldOut && !restock) {
      setStatus("error");
      setErrorMsg("Pick at least one type of event.");
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
          wantsSoldOut: soldOut,
          wantsRestock: restock,
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
    const eventCopy =
      soldOut && restock
        ? "a server type goes sold out or returns to stock"
        : soldOut
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
          <label className="flex cursor-pointer items-baseline gap-2">
            <input
              type="checkbox"
              checked={soldOut}
              onChange={(e) => setSoldOut(e.target.checked)}
              className="size-3.5 accent-accent"
            />
            <span className="text-ink">Sold-out events</span>
          </label>
          <label className="flex cursor-pointer items-baseline gap-2">
            <input
              type="checkbox"
              checked={restock}
              onChange={(e) => setRestock(e.target.checked)}
              className="size-3.5 accent-accent"
            />
            <span className="text-ink">Restocks</span>
          </label>
        </div>
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
