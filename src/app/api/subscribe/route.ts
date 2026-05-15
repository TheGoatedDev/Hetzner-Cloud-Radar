import { z } from "zod";
import { syncMarketingContact } from "@/lib/marketing/resend";
import { sendSubscriptionConfirmationEmail } from "@/lib/marketing/subscription-email";

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
    await syncMarketingContact(parsed.data);

    sendSubscriptionConfirmationEmail(parsed.data).catch((error) => {
      console.error("Subscription confirmation email failed", error);
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
