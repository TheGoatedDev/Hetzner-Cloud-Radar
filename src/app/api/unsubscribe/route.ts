import { z } from "zod";
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

  try {
    const fullUnsubscribe = !wantsSoldOut && !wantsRestock;

    if (fullUnsubscribe) {
      await unsubscribeMarketingContact({ email });
    } else {
      await syncMarketingContact({ email, wantsSoldOut, wantsRestock });
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
