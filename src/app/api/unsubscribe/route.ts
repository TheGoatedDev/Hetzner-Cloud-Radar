import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { mailingSubscribers } from "@/lib/db/schema";
import {
  syncMarketingContact,
  unsubscribeMarketingContact,
} from "@/lib/marketing/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const unsubscribeSchema = z.object({
  email: z.email().transform((email) => email.toLowerCase()),
  token: z.string().optional(),
  wantsSoldOut: z.boolean(),
  wantsRestock: z.boolean(),
});

export async function POST(request: Request) {
  const parsed = unsubscribeSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return Response.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid unsubscribe request",
      },
      { status: 400 },
    );
  }

  const { email, wantsSoldOut, wantsRestock } = parsed.data;
  const db = getDb();

  try {
    const existing = await db
      .select({ email: mailingSubscribers.email })
      .from(mailingSubscribers)
      .where(eq(mailingSubscribers.email, email))
      .limit(1);

    if (existing.length === 0) {
      return Response.json({ ok: true, fullUnsubscribe: true });
    }

    const fullUnsubscribe = !wantsSoldOut && !wantsRestock;
    const now = new Date();

    if (fullUnsubscribe) {
      await unsubscribeMarketingContact({ email });
      await db
        .update(mailingSubscribers)
        .set({
          wantsSoldOut: false,
          wantsRestock: false,
          unsubscribedAt: now,
          updatedAt: now,
        })
        .where(eq(mailingSubscribers.email, email));
    } else {
      await syncMarketingContact({ email, wantsSoldOut, wantsRestock });
      await db
        .update(mailingSubscribers)
        .set({
          wantsSoldOut,
          wantsRestock,
          unsubscribedAt: null,
          resendSyncedAt: now,
          resendErrorMessage: null,
          updatedAt: now,
        })
        .where(eq(mailingSubscribers.email, email));
    }

    return Response.json({ ok: true, fullUnsubscribe });
  } catch (error) {
    console.error("Unsubscribe failed", error);

    return Response.json(
      { error: "Unsubscribe failed. Try again in a minute." },
      { status: 500 },
    );
  }
}
