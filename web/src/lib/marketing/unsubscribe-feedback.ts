import { getDiscordEnv } from "@/env";

export const unsubscribeFeedbackReasons = [
  "too_many_emails",
  "not_useful_anymore",
  "wrong_alerts",
  "just_testing",
  "other",
] as const;

export type UnsubscribeFeedbackReason =
  (typeof unsubscribeFeedbackReasons)[number];

export type UnsubscribeFeedbackSource = "verified_link" | "manual_email";

const reasonLabels: Record<UnsubscribeFeedbackReason, string> = {
  too_many_emails: "Too many emails",
  not_useful_anymore: "Not useful anymore",
  wrong_alerts: "Wrong alerts",
  just_testing: "Just testing",
  other: "Other",
};

type SendUnsubscribeFeedbackInput = {
  reason: UnsubscribeFeedbackReason;
  note?: string;
  source: UnsubscribeFeedbackSource;
};

function discordContent(input: SendUnsubscribeFeedbackInput) {
  const lines = [
    "Unsubscribe feedback",
    `Reason: ${reasonLabels[input.reason]}`,
    input.note ? `Note: ${input.note}` : null,
    `Source: ${input.source}`,
    `At: ${new Date().toISOString()}`,
  ].filter((line): line is string => line !== null);

  return lines.join("\n");
}

export async function sendUnsubscribeFeedback(
  input: SendUnsubscribeFeedbackInput,
) {
  const webhookUrl = getDiscordEnv().DISCORD_UNSUBSCRIBE_FEEDBACK_WEBHOOK_URL;

  if (!webhookUrl) {
    return { sent: false, skippedReason: "webhook not configured" };
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: discordContent(input) }),
  });

  if (!response.ok) {
    throw new Error(`Discord webhook failed with ${response.status}`);
  }

  return { sent: true };
}
