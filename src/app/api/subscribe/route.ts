import { z } from "zod";
import {
  DISPATCH_EVENTS,
  DISPATCH_SERVER_FAMILIES,
} from "@/lib/marketing/preferences";
import { syncMarketingContact } from "@/lib/marketing/resend";
import { sendSubscriptionConfirmationEmail } from "@/lib/marketing/subscription-email";
import { DCS } from "@/lib/schema";
import { verifyTurnstileToken } from "@/lib/turnstile";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const subscribeSchema = z
  .object({
    email: z.email().transform((email) => email.toLowerCase()),
    events: z.array(z.enum(DISPATCH_EVENTS)),
    families: z.array(
      z
        .string()
        .transform((family) => family.toLowerCase())
        .refine((family) => DISPATCH_SERVER_FAMILIES.includes(family)),
    ),
    datacentres: z.array(z.enum(DCS)),
    turnstileToken: z.string().min(1),
  })
  .refine((value) => value.events.length > 0, {
    message: "Pick at least one type of event.",
    path: ["events"],
  })
  .refine((value) => value.families.length > 0, {
    message: "Pick at least one server family.",
    path: ["families"],
  })
  .refine((value) => value.datacentres.length > 0, {
    message: "Pick at least one datacentre.",
    path: ["datacentres"],
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

  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  const human = await verifyTurnstileToken(parsed.data.turnstileToken, ip);
  if (!human) {
    return Response.json(
      { error: "Bot check failed. Refresh and try again." },
      { status: 403 },
    );
  }

  try {
    const { email, events, families, datacentres } = parsed.data;
    const preferences = { events, families, datacentres };

    await syncMarketingContact({ email, preferences });

    sendSubscriptionConfirmationEmail({ email, preferences }).catch((error) => {
      console.error("Subscription confirmation email failed", error);
    });

    return Response.json({ ok: true, email });
  } catch (error) {
    console.error("Subscribe failed", error);

    return Response.json(
      { error: "Subscription failed. Try again in a minute." },
      { status: 500 },
    );
  }
}
