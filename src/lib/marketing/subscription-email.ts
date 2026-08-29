import { subscriptionConfirmationHtml } from "@/emails/html";
import { hasResendEmailConfig, sendDispatch } from "../email/send";
import type { DispatchPreferences } from "./preferences";

type SubscriptionEmailInput = {
    email: string;
    preferences: DispatchPreferences;
};

export async function sendSubscriptionConfirmationEmail(
    input: SubscriptionEmailInput,
) {
    if (!hasResendEmailConfig()) {
        return {
            sent: false,
            skippedReason: "RESEND_API_KEY is not configured",
        };
    }

    const wantsSoldOut = input.preferences.events.includes("soldout");
    const wantsRestock = input.preferences.events.includes("restock");
    const eventCopy =
        wantsSoldOut && wantsRestock
            ? "a server type goes sold out or returns to stock"
            : wantsSoldOut
              ? "a server type goes sold out"
              : "a server type returns to stock";

    const subscribedTo = [
        wantsSoldOut ? "Sold-out events" : null,
        wantsRestock ? "Restocks" : null,
        input.preferences.families.length > 0
            ? `Families: ${input.preferences.families.map((family) => family.toUpperCase()).join(", ")}`
            : null,
        input.preferences.datacentres.length > 0
            ? `Datacentres: ${input.preferences.datacentres.join(", ")}`
            : null,
    ]
        .filter(Boolean)
        .join(", ");

    const result = await sendDispatch({
        to: input.email,
        subject: "You are subscribed to Hetzner Cloud Radar",
        html: await subscriptionConfirmationHtml({
            email: input.email,
            eventCopy,
            subscribedTo,
        }),
        tags: [{ name: "kind", value: "subscription-confirmation" }],
    });

    return { sent: true, resendEmailId: result.id };
}
