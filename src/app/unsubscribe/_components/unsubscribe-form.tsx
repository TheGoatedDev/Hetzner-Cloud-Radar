"use client";

import { type FormEvent, useId, useState } from "react";
import { PreferenceMatrix } from "@/app/_components/preference-matrix";
import type {
  DispatchEvent,
  DispatchPreferences,
} from "@/lib/marketing/preferences";
import type { DcCode, FamilyId } from "@/lib/schema";

type Status = "idle" | "submitting" | "ok" | "error";
type FeedbackStatus = "idle" | "submitting" | "ok" | "error";
type FeedbackReason =
  | ""
  | "too_many_emails"
  | "not_useful_anymore"
  | "wrong_alerts"
  | "just_testing"
  | "other";

const feedbackReasons: Array<{
  value: Exclude<FeedbackReason, "">;
  label: string;
}> = [
  { value: "too_many_emails", label: "Too many emails" },
  { value: "not_useful_anymore", label: "Not useful anymore" },
  { value: "wrong_alerts", label: "Wrong alerts" },
  { value: "just_testing", label: "Just testing" },
  { value: "other", label: "Other" },
];

type Props = {
  prefilledEmail: string;
  prefilledToken: string;
  emailLocked: boolean;
  initialPreferences: DispatchPreferences | null;
  preferenceLoadError: string | null;
};

export function UnsubscribeForm({
  prefilledEmail,
  prefilledToken,
  emailLocked,
  initialPreferences,
  preferenceLoadError,
}: Props) {
  const [email, setEmail] = useState(prefilledEmail);
  const [events, setEvents] = useState<DispatchEvent[]>(
    initialPreferences?.events ?? [],
  );
  const [families, setFamilies] = useState<FamilyId[]>(
    initialPreferences?.families ?? [],
  );
  const [datacentres, setDatacentres] = useState<DcCode[]>(
    initialPreferences?.datacentres ?? [],
  );
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [resultFullUnsubscribe, setResultFullUnsubscribe] = useState(true);
  const [feedbackReason, setFeedbackReason] = useState<FeedbackReason>("");
  const [feedbackNote, setFeedbackNote] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<FeedbackStatus>("idle");
  const [feedbackErrorMsg, setFeedbackErrorMsg] = useState("");
  const emailId = useId();
  const errorId = useId();
  const feedbackReasonId = useId();
  const feedbackNoteId = useId();
  const feedbackErrorId = useId();

  const fullUnsubscribe =
    events.length === 0 || families.length === 0 || datacentres.length === 0;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (preferenceLoadError && emailLocked) {
      setStatus("error");
      setErrorMsg("Current preferences could not load. Try again in a minute.");
      return;
    }
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
          events,
          families,
          datacentres,
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

  async function onFeedbackSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!feedbackReason) {
      setFeedbackStatus("error");
      setFeedbackErrorMsg("Pick a reason.");
      return;
    }

    setFeedbackStatus("submitting");
    setFeedbackErrorMsg("");

    try {
      const response = await fetch("/api/unsubscribe/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email,
          token: prefilledToken || undefined,
          reason: feedbackReason,
          note: feedbackNote || undefined,
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Feedback failed.");
      }

      setFeedbackStatus("ok");
    } catch (error) {
      setFeedbackStatus("error");
      setFeedbackErrorMsg(
        error instanceof Error ? error.message : "Feedback failed.",
      );
    }
  }

  if (status === "ok") {
    return (
      <div className="flex flex-col gap-6 font-sans text-sm leading-[1.6]">
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

        {resultFullUnsubscribe ? (
          feedbackStatus === "ok" ? (
            <p className="text-ink-soft">Thanks. That note was sent.</p>
          ) : (
            <form
              onSubmit={onFeedbackSubmit}
              className="flex max-w-[42rem] flex-col gap-5 border-t border-hairline pt-5"
              noValidate
            >
              <fieldset className="flex flex-col gap-3">
                <legend className="mb-1 text-xs uppercase tracking-[0.1em] text-ink-faint">
                  Why are you leaving?
                </legend>
                <select
                  id={feedbackReasonId}
                  required
                  value={feedbackReason}
                  onChange={(e) =>
                    setFeedbackReason(e.target.value as FeedbackReason)
                  }
                  disabled={feedbackStatus === "submitting"}
                  aria-invalid={feedbackStatus === "error" || undefined}
                  aria-describedby={
                    feedbackStatus === "error" ? feedbackErrorId : undefined
                  }
                  className="max-w-[18rem] border-0 border-b-2 border-hairline-strong bg-transparent pb-2 font-mono text-sm text-ink focus:border-accent focus-visible:outline-none disabled:opacity-50"
                >
                  <option value="">Pick a reason</option>
                  {feedbackReasons.map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </fieldset>

              <label htmlFor={feedbackNoteId} className="flex flex-col gap-1.5">
                <span className="text-xs uppercase tracking-[0.1em] text-ink-faint">
                  Note
                </span>
                <textarea
                  id={feedbackNoteId}
                  value={feedbackNote}
                  onChange={(e) => setFeedbackNote(e.target.value)}
                  disabled={feedbackStatus === "submitting"}
                  maxLength={500}
                  rows={3}
                  placeholder="Optional"
                  className="resize-y border-0 border-b-2 border-hairline-strong bg-transparent pb-2 font-sans text-sm text-ink placeholder:text-ink-faint focus:border-accent focus-visible:outline-none disabled:opacity-50"
                />
              </label>

              {feedbackStatus === "error" && feedbackErrorMsg ? (
                <p
                  id={feedbackErrorId}
                  role="alert"
                  className="font-mono text-sm text-down"
                >
                  <span aria-hidden="true">✕ </span>
                  {feedbackErrorMsg}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={feedbackStatus === "submitting"}
                className="w-fit rounded-edge bg-accent px-5 py-2 font-mono text-sm font-medium text-paper transition-colors hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-50"
              >
                {feedbackStatus === "submitting" ? "Sending…" : "Send feedback"}
              </button>
            </form>
          )
        ) : null}
      </div>
    );
  }

  const disabled = status === "submitting";
  const preferenceControlsDisabled = disabled || Boolean(preferenceLoadError);
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

      {preferenceLoadError ? (
        <p role="alert" className="font-mono text-sm text-down">
          <span aria-hidden="true">✕ </span>
          Current preferences could not load. Try again in a minute.
        </p>
      ) : null}

      <p className="max-w-[60ch] font-sans text-xs leading-[1.55] text-ink-faint">
        Tick choices to keep that stream of alerts. Clearing any group entirely
        unsubscribes you from every dispatch.
      </p>

      <PreferenceMatrix
        events={events}
        families={families}
        datacentres={datacentres}
        onEventsChange={setEvents}
        onFamiliesChange={setFamilies}
        onDatacentresChange={setDatacentres}
        disabled={preferenceControlsDisabled}
      />

      <div className="flex items-baseline justify-between gap-4 border-t border-hairline pt-3 font-mono text-2xs uppercase tracking-[0.1em] text-ink-faint">
        <span>
          {fullUnsubscribe
            ? "→ Submit empties = full unsubscribe"
            : `→ ${wired} alert${wired === 1 ? "" : "s"} wired`}
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
