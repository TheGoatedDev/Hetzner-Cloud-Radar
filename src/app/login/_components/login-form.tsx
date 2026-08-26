"use client";

import { type FormEvent, useId, useState } from "react";
import { authClient } from "@/lib/auth/client";

type Status = "idle" | "submitting" | "sent" | "error";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const emailId = useId();
  const errorId = useId();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    const { error } = await authClient.signIn.magicLink({
      email: email.trim(),
      callbackURL: nextPath,
      name: email.trim().split("@")[0] || "seller",
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message ?? "Could not send magic link.");
      return;
    }

    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <output className="font-sans text-base text-ink-soft">
        Check <span className="text-ink">{email}</span> for the sign-in link.
        Expires in 5 minutes.
      </output>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor={emailId} className="text-xs text-ink-soft">
          Email
        </label>
        <input
          id={emailId}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={status === "error"}
          aria-describedby={status === "error" ? errorId : undefined}
          className="border border-control-border bg-paper-raised px-3 py-2 text-sm text-ink"
        />
      </div>
      {status === "error" ? (
        <p id={errorId} className="text-sm text-down" role="alert">
          {errorMsg}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-fit border border-ink bg-ink px-4 py-2 text-sm text-paper hover:bg-accent hover:border-accent disabled:opacity-50"
      >
        {status === "submitting" ? "Sending…" : "Email magic link"}
      </button>
    </form>
  );
}
