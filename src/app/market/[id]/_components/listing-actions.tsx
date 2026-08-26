"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ListingStatus } from "@/lib/market/listings";

export function ListingActions({
  id,
  status,
}: {
  id: string;
  status: ListingStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function setStatus(next: "sold" | "removed" | "active") {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/market/listings/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Update failed");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-ink-soft">Your listing</p>
      <div className="flex flex-wrap gap-2">
        {status === "active" ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => setStatus("sold")}
              className="border border-control-border px-3 py-1.5 text-sm hover:border-ink disabled:opacity-50"
            >
              Mark sold
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setStatus("removed")}
              className="border border-control-border px-3 py-1.5 text-sm hover:border-ink disabled:opacity-50"
            >
              Remove
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => setStatus("active")}
            className="border border-control-border px-3 py-1.5 text-sm hover:border-ink disabled:opacity-50"
          >
            Relist
          </button>
        )}
      </div>
      {error ? (
        <p className="text-sm text-down" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
