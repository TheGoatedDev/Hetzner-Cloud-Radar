"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useId, useState } from "react";
import { DC_META, DCS } from "@/lib/schema";

export function NewListingForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const errId = useId();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const priceEuros = Number(fd.get("priceEuros"));
    const payload = {
      serverType: String(fd.get("serverType") ?? ""),
      locationCode: String(fd.get("locationCode") ?? ""),
      priceEuros,
      title: String(fd.get("title") ?? ""),
      body: String(fd.get("body") ?? ""),
      includes: String(fd.get("includes") ?? ""),
    };

    try {
      const res = await fetch("/api/market/listings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => null)) as {
        id?: string;
        error?: string;
      } | null;
      if (!res.ok || !body?.id) {
        throw new Error(body?.error ?? "Could not create listing");
      }
      router.push(`/market/${body.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create listing");
      setBusy(false);
    }
  }

  const field =
    "border border-control-border bg-paper-raised px-3 py-2 text-sm text-ink";

  return (
    <form onSubmit={onSubmit} className="flex max-w-lg flex-col gap-4">
      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        Server type
        <input
          name="serverType"
          required
          placeholder="CCX33"
          className={`${field} font-mono uppercase`}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        Datacentre
        <select name="locationCode" required className={field} defaultValue="">
          <option value="" disabled>
            Select
          </option>
          {DCS.map((code) => (
            <option key={code} value={code}>
              {code} · {DC_META[code].city}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        Price (EUR, whole euros)
        <input
          name="priceEuros"
          type="number"
          required
          min={1}
          step={1}
          className={field}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        Title
        <input
          name="title"
          required
          maxLength={120}
          placeholder="CCX33 FSN1, clean Ubuntu, IPv4"
          className={field}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        Description
        <textarea name="body" rows={4} maxLength={4000} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        Includes (IPs, volumes, …)
        <input name="includes" maxLength={500} className={field} />
      </label>
      {error ? (
        <p id={errId} className="text-sm text-down" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy}
        className="w-fit border border-ink bg-ink px-4 py-2 text-sm text-paper hover:bg-accent hover:border-accent disabled:opacity-50"
      >
        {busy ? "Publishing…" : "Publish listing"}
      </button>
    </form>
  );
}
