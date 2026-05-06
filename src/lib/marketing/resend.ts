import { Resend } from "resend";
import { getResendEnv } from "@/env";

type SubscribeInput = {
  email: string;
  wantsSoldOut: boolean;
  wantsRestock: boolean;
};

type TopicSubscription = {
  id: string;
  subscription: "opt_in" | "opt_out";
};

function contactTopics(input: SubscribeInput): TopicSubscription[] {
  const env = getResendEnv();

  return [
    env.RESEND_SOLD_OUT_TOPIC_ID
      ? ({
          id: env.RESEND_SOLD_OUT_TOPIC_ID,
          subscription: input.wantsSoldOut ? ("opt_in" as const) : "opt_out",
        } satisfies TopicSubscription)
      : null,
    env.RESEND_RESTOCK_TOPIC_ID
      ? ({
          id: env.RESEND_RESTOCK_TOPIC_ID,
          subscription: input.wantsRestock ? ("opt_in" as const) : "opt_out",
        } satisfies TopicSubscription)
      : null,
  ].filter((topic): topic is TopicSubscription => topic !== null);
}

async function ensureContact(resend: Resend, input: SubscribeInput) {
  const updated = await resend.contacts.update({
    email: input.email,
    unsubscribed: false,
  });

  if (updated.data) {
    return updated.data;
  }

  if (updated.error?.statusCode !== 404) {
    throw new Error(updated.error?.message ?? "Resend contact update failed");
  }

  const env = getResendEnv();
  const topics = contactTopics(input);
  const created = await resend.contacts.create({
    email: input.email,
    unsubscribed: false,
    ...(env.RESEND_MARKETING_SEGMENT_ID
      ? { segments: [{ id: env.RESEND_MARKETING_SEGMENT_ID }] }
      : {}),
    ...(topics.length > 0 ? { topics } : {}),
  });

  if (!created.data) {
    throw new Error(created.error?.message ?? "Resend contact create failed");
  }

  return created.data;
}

export async function syncMarketingContact(input: SubscribeInput) {
  const env = getResendEnv();
  const resend = new Resend(env.RESEND_API_KEY);
  const contact = await ensureContact(resend, input);
  const topics = contactTopics(input);

  if (env.RESEND_MARKETING_SEGMENT_ID) {
    const segment = await resend.contacts.segments.add({
      email: input.email,
      segmentId: env.RESEND_MARKETING_SEGMENT_ID,
    });

    if (!segment.data && segment.error?.statusCode !== 409) {
      throw new Error(segment.error?.message ?? "Resend segment sync failed");
    }
  }

  if (topics.length > 0) {
    const topicUpdate = await resend.contacts.topics.update({
      email: input.email,
      topics,
    });

    if (!topicUpdate.data) {
      throw new Error(topicUpdate.error?.message ?? "Resend topic sync failed");
    }
  }

  if (!contact.id) {
    throw new Error("Resend contact response did not include an id");
  }

  return { contactId: contact.id };
}
