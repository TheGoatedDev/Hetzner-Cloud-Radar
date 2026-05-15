"use client";

import { type FormEvent, useId, useState } from "react";

type Status = "idle" | "submitting" | "ok" | "error";

type Props = {
  prefilledEmail: string;
  prefilledToken: string;
  emailLocked: boolean;
};

export function UnsubscribeForm({
  prefilledEmail,
  prefilledToken,
  emailLocked,
}: Props) {
  const [email, setEmail] = useState(prefilledEmail);
  const [soldOut, setSoldOut] = useState(false);
  const [restock, setRestock] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [resultFullUnsubscribe, setResultFullUnsubscribe] = useState(true);
  const emailId = useId();
  const errorId = useId();

  const fullUnsubscribe = !soldOut && !restock;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    try {
      const response = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email,
          token: prefilledToken || undefined,
          wantsSoldOut: soldOut,
          wantsRestock: restock,
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        fullUnsubscribe?: boolean;
      } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Unsubscribe failed.");
      }

      setResultFullUnsubscribe(body?.fullUnsubscribe ?? fullUnsubscribe);
      setStatus("ok");
    } catch (error) {
      setStatus("error");
      setErrorMsg(
        error instanceof Error ? error.message : "Unsubscribe failed.",
      );
    }
  }

  if (status === "ok") {
    return (
      <div className="flex flex-col gap-3 font-sans text-sm leading-[1.6]">
        <p className="text-ink">
          {resultFullUnsubscribe ? (
            <>
              Done. <span className="font-mono text-ink">{email}</span> has been
              removed from the list. No more dispatches will arrive.
            </>
          ) : (
            <>
              Preferences updated for{" "}
              <span className="font-mono text-ink">{email}</span>.
            </>
          )}
        </p>
        <p className="text-ink-soft">
          Changed your mind? Resubscribe any time from the homepage.
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
            disabled={disabled || emailLocked}
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
          {disabled
            ? "Working…"
            : fullUnsubscribe
              ? "Unsubscribe"
              : "Update preferences"}
        </button>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-xs uppercase tracking-[0.1em] text-ink-faint">
          Keep receiving
        </legend>
        <p className="font-sans text-xs leading-[1.55] text-ink-faint">
          Leave both unchecked to unsubscribe entirely. Tick one to keep that
          stream of alerts.
        </p>
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

      {emailLocked ? null : (
        <p className="max-w-[60ch] font-sans text-xs leading-[1.55] text-ink-faint">
          Enter the email address you subscribed with. You only need this manual
          step if you arrived here without clicking the unsubscribe link in a
          recent dispatch.
        </p>
      )}
    </form>
  );
}
