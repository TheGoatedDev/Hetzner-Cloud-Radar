import { Resend } from "resend";
import { getResendEnv } from "@/env";
import {
  allTopicParts,
  DEFAULT_DISPATCH_PREFERENCES,
  type DispatchEvent,
  type DispatchPreferences,
  normalizeDispatchPreferences,
  parseTopicKey,
  selectedTopicKeys,
  type TopicParts,
  topicKey,
} from "./preferences";

type TopicSubscription = {
  id: string;
  subscription: "opt_in" | "opt_out";
};

type ResendTopic = {
  id: string;
  name: string;
};

type ContactTopic = ResendTopic & {
  subscription: "opt_in" | "opt_out";
};

type TopicCreateInput = {
  name: string;
  description?: string;
  defaultSubscription: "opt_in" | "opt_out";
  visibility?: "public" | "private";
};

const topicIdsByName = new Map<string, string>();

function resendClient() {
  return new Resend(getResendEnv().RESEND_API_KEY);
}

function topicDescription(parts: TopicParts) {
  return `Hetzner Cloud Radar ${parts.event} dispatches for ${parts.family.toUpperCase()} in ${parts.datacentre}`;
}

async function refreshTopicCache(resend: Resend) {
  const listed = await resend.topics.list();

  if (!listed.data) {
    throw new Error(listed.error?.message ?? "Resend topic list failed");
  }

  for (const topic of listed.data.data as ResendTopic[]) {
    topicIdsByName.set(topic.name, topic.id);
  }
}

export async function ensureTopicId(
  parts: TopicParts,
  resend = resendClient(),
) {
  const name = topicKey(parts);
  const cached = topicIdsByName.get(name);
  if (cached) return cached;

  await refreshTopicCache(resend);
  const refreshed = topicIdsByName.get(name);
  if (refreshed) return refreshed;

  const created = await resend.topics.create({
    name,
    description: topicDescription(parts),
    defaultSubscription: "opt_out",
    visibility: "private",
  } as TopicCreateInput);

  if (!created.data) {
    throw new Error(created.error?.message ?? "Resend topic create failed");
  }

  topicIdsByName.set(name, created.data.id);

  return created.data.id;
}

async function ensureAllCurrentTopicIds(resend: Resend) {
  const entries: Array<{ key: string; id: string }> = [];

  for (const parts of allTopicParts()) {
    entries.push({
      key: topicKey(parts),
      id: await ensureTopicId(parts, resend),
    });
  }

  return entries;
}

async function ensureContact(resend: Resend, email: string) {
  const updated = await resend.contacts.update({
    email,
    unsubscribed: false,
  });

  if (updated.data) {
    return updated.data;
  }

  if (updated.error?.statusCode !== 404) {
    throw new Error(updated.error?.message ?? "Resend contact update failed");
  }

  const env = getResendEnv();
  const created = await resend.contacts.create({
    email,
    unsubscribed: false,
    ...(env.RESEND_MARKETING_SEGMENT_ID
      ? { segments: [{ id: env.RESEND_MARKETING_SEGMENT_ID }] }
      : {}),
  });

  if (!created.data) {
    throw new Error(created.error?.message ?? "Resend contact create failed");
  }

  return created.data;
}

export async function syncMarketingContact(input: {
  email: string;
  preferences: DispatchPreferences;
}) {
  const env = getResendEnv();
  if (!env.RESEND_MARKETING_SEGMENT_ID) {
    throw new Error("RESEND_MARKETING_SEGMENT_ID is not configured");
  }

  const resend = resendClient();
  const preferences = normalizeDispatchPreferences(input.preferences);
  const selected = new Set(selectedTopicKeys(preferences));

  await ensureContact(resend, input.email);

  const segment = await resend.contacts.segments.add({
    email: input.email,
    segmentId: env.RESEND_MARKETING_SEGMENT_ID,
  });

  if (!segment.data && segment.error?.statusCode !== 409) {
    throw new Error(segment.error?.message ?? "Resend segment sync failed");
  }

  const topics: TopicSubscription[] = (
    await ensureAllCurrentTopicIds(resend)
  ).map((topic) => ({
    id: topic.id,
    subscription: selected.has(topic.key) ? "opt_in" : "opt_out",
  }));

  const topicUpdate = await resend.contacts.topics.update({
    email: input.email,
    topics,
  });

  if (!topicUpdate.data) {
    throw new Error(topicUpdate.error?.message ?? "Resend topic sync failed");
  }
}

export async function unsubscribeMarketingContact(input: { email: string }) {
  const resend = resendClient();
  const topics: TopicSubscription[] = (
    await ensureAllCurrentTopicIds(resend)
  ).map((topic) => ({
    id: topic.id,
    subscription: "opt_out",
  }));

  const topicUpdate = await resend.contacts.topics.update({
    email: input.email,
    topics,
  });

  if (!topicUpdate.data && topicUpdate.error?.statusCode !== 404) {
    throw new Error(
      topicUpdate.error?.message ?? "Resend topic opt-out failed",
    );
  }

  const updated = await resend.contacts.update({
    email: input.email,
    unsubscribed: true,
  });

  if (!updated.data && updated.error?.statusCode !== 404) {
    throw new Error(updated.error?.message ?? "Resend unsubscribe failed");
  }
}

export async function getMarketingContactPreferences(input: {
  email: string;
}): Promise<DispatchPreferences> {
  const env = getResendEnv();
  const resend = resendClient();
  const listed = await resend.contacts.topics.list({ email: input.email });

  if (!listed.data) {
    throw new Error(
      listed.error?.message ?? "Resend topic preference lookup failed",
    );
  }

  const topics = listed.data.data as ContactTopic[];
  const optedIn = topics.filter((topic) => topic.subscription === "opt_in");
  const concrete = optedIn.flatMap((topic) => {
    const parsed = parseTopicKey(topic.name);

    return parsed ? [parsed] : [];
  });

  if (concrete.length === 0) {
    return legacyPreferencesFromTopics(optedIn, env);
  }

  return preferencesFromTopicParts(concrete);
}

function legacyPreferencesFromTopics(
  topics: ContactTopic[],
  env: ReturnType<typeof getResendEnv>,
): DispatchPreferences {
  const events: DispatchEvent[] = [];
  const optedInIds = new Set(topics.map((topic) => topic.id));

  if (
    env.RESEND_SOLD_OUT_TOPIC_ID &&
    optedInIds.has(env.RESEND_SOLD_OUT_TOPIC_ID)
  ) {
    events.push("soldout");
  }
  if (
    env.RESEND_RESTOCK_TOPIC_ID &&
    optedInIds.has(env.RESEND_RESTOCK_TOPIC_ID)
  ) {
    events.push("restock");
  }

  if (events.length === 0) {
    return { events: [], families: [], datacentres: [] };
  }

  return {
    ...DEFAULT_DISPATCH_PREFERENCES,
    events,
  };
}

function preferencesFromTopicParts(parts: TopicParts[]): DispatchPreferences {
  return normalizeDispatchPreferences({
    events: [...new Set(parts.map((part) => part.event))],
    families: [...new Set(parts.map((part) => part.family))],
    datacentres: [...new Set(parts.map((part) => part.datacentre))],
  });
}
