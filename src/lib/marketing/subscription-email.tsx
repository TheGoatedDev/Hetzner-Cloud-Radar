import SubscriptionConfirmation from "@/emails/subscription-confirmation";
import { hasResendEmailConfig, sendDispatch } from "../email/send";

type SubscriptionEmailInput = {
  email: string;
  wantsSoldOut: boolean;
  wantsRestock: boolean;
};

export async function sendSubscriptionConfirmationEmail(
  input: SubscriptionEmailInput,
) {
  if (!hasResendEmailConfig()) {
    return { sent: false, skippedReason: "RESEND_API_KEY is not configured" };
  }

  const result = await sendDispatch({
    to: input.email,
    subject: "You are subscribed to Hetzner Cloud Radar",
    react: (
      <SubscriptionConfirmation
        email={input.email}
        events={{
          soldOut: input.wantsSoldOut,
          restock: input.wantsRestock,
        }}
      />
    ),
    tags: [{ name: "kind", value: "subscription-confirmation" }],
  });

  return { sent: true, resendEmailId: result.id };
}
