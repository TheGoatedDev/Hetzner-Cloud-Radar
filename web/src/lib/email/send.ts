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

type BroadcastInput = {
  segmentId: string;
  subject: string;
  react: ReactElement;
  name?: string;
  previewText?: string;
  replyTo?: string | string[];
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

export async function sendBroadcast(input: BroadcastInput) {
  const env = getResendEnv();
  const created = await client().broadcasts.create({
    from: `${fromName} <${env.RESEND_FROM_EMAIL}>`,
    segmentId: input.segmentId,
    subject: input.subject,
    react: input.react,
    name: input.name,
    previewText: input.previewText,
    replyTo: input.replyTo,
    topicId: input.topicId,
  });

  if (!created.data) {
    throw new Error(created.error?.message ?? "Resend broadcast create failed");
  }

  const sent = await client().broadcasts.send(created.data.id);

  if (!sent.data) {
    throw new Error(sent.error?.message ?? "Resend broadcast send failed");
  }

  return { id: sent.data.id };
}
