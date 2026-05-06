import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { mailingSubscribers } from "@/lib/db/schema";
import { syncMarketingContact } from "@/lib/marketing/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const subscribeSchema = z
  .object({
    email: z.email().transform((email) => email.toLowerCase()),
    wantsSoldOut: z.boolean(),
    wantsRestock: z.boolean(),
  })
  .refine((value) => value.wantsSoldOut || value.wantsRestock, {
    message: "Pick at least one type of event.",
    path: ["wantsSoldOut"],
  });

export async function POST(request: Request) {
  const parsed = subscribeSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid subscribe request" },
      { status: 400 },
    );
  }

  try {
    const { contactId } = await syncMarketingContact(parsed.data);
    const now = new Date();
    const db = getDb();

    await db
      .insert(mailingSubscribers)
      .values({
        email: parsed.data.email,
        wantsSoldOut: parsed.data.wantsSoldOut,
        wantsRestock: parsed.data.wantsRestock,
        resendContactId: contactId,
        resendSyncedAt: now,
        resendErrorMessage: null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: mailingSubscribers.email,
        set: {
          wantsSoldOut: sql`excluded.wants_sold_out`,
          wantsRestock: sql`excluded.wants_restock`,
          resendContactId: sql`excluded.resend_contact_id`,
          resendSyncedAt: sql`excluded.resend_synced_at`,
          resendErrorMessage: null,
          updatedAt: now,
        },
      });

    return Response.json({ ok: true, email: parsed.data.email });
  } catch (error) {
    console.error("Subscribe failed", error);

    return Response.json(
      { error: "Subscription failed. Try again in a minute." },
      { status: 500 },
    );
  }
}
