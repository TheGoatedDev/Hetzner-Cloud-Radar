import { z } from "zod";
import {
  sendUnsubscribeFeedback,
  unsubscribeFeedbackReasons,
} from "@/lib/marketing/unsubscribe-feedback";
import { verifyEmailToken } from "@/lib/marketing/unsubscribe-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const feedbackSchema = z.object({
  email: z.email().transform((email) => email.toLowerCase()),
  token: z.string().optional(),
  reason: z.enum(unsubscribeFeedbackReasons),
  note: z
    .string()
    .trim()
    .max(500, "Keep the note under 500 characters.")
    .optional()
    .transform((note) => (note ? note : undefined)),
});

export async function POST(request: Request) {
  const parsed = feedbackSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return Response.json(
      {
        error:
          parsed.error.issues[0]?.message ??
          "Invalid unsubscribe feedback request",
      },
      { status: 400 },
    );
  }

  const { email, token, reason, note } = parsed.data;
  const source =
    token && verifyEmailToken(email, token) ? "verified_link" : "manual_email";

  try {
    await sendUnsubscribeFeedback({ reason, note, source });
  } catch (error) {
    console.error("Unsubscribe feedback webhook failed", error);
  }

  return Response.json({ ok: true });
}
