import type { ReactElement } from "react";
import { Resend } from "resend";
import { getResendEnv } from "@/env";

type SendInput = {
  to: string | string[];
  subject: string;
  react: ReactElement;
  replyTo?: string;
  headers?: Record<string, string>;
  tags?: { name: string; value: string }[];
  topicId?: string;
};

let cachedClient: Resend | null = null;

function client() {
  if (cachedClient) return cachedClient;
  const env = getResendEnv();
  cachedClient = new Resend(env.RESEND_API_KEY);
  return cachedClient;
}

const fromName = "Hetzner Cloud Radar";

export function hasResendEmailConfig() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendDispatch(input: SendInput) {
  const env = getResendEnv();
  const result = await client().emails.send({
    from: `${fromName} <${env.RESEND_FROM_EMAIL}>`,
    to: input.to,
    subject: input.subject,
    react: input.react,
    replyTo: input.replyTo,
    headers: input.headers,
    tags: input.tags,
    topicId: input.topicId,
  });

  if (!result.data) {
    throw new Error(result.error?.message ?? "Resend dispatch send failed");
  }

  return { id: result.data.id };
}
