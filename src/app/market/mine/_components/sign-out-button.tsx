"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

export function SignOutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="text-ink-soft underline-offset-4 hover:text-accent hover:underline"
      onClick={async () => {
        await authClient.signOut();
        router.push("/market");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
