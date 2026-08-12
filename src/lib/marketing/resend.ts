import { getResendEnv } from "@/env";
import { resendJson } from "../email/send";
import {
  allTopicParts,
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

type ResendListResponse<T> = {
  object?: "list";
  has_more?: boolean;
  data: T[];
};

const topicIdsByName = new Map<string, string>();

async function resendGet<T>(path: string) {
  const result = await resendJson<T>(path);
  if (!result.data) {
    throw new Error(result.error?.message ?? `Resend GET ${path} failed`);
  }
  return result.data;
}

async function listAllTopics() {
  const topics: ResendTopic[] = [];
  let after: string | undefined;

  do {
    const params = new URLSearchParams({ limit: "100" });
    if (after) params.set("after", after);
    const page = await resendGet<ResendListResponse<ResendTopic>>(
      `/topics?${params.toString()}`,
    );

    topics.push(...page.data);
    after = page.data.at(-1)?.id;
    if (!page.has_more) break;
  } while (after);

  return topics;
}

async function refreshTopicCache() {
  for (const topic of await listAllTopics()) {
    topicIdsByName.set(topic.name, topic.id);
  }
}

export async function ensureTopicId(parts: TopicParts) {
  const name = topicKey(parts);
  const cached = topicIdsByName.get(name);
  if (cached) return cached;

  await refreshTopicCache();
  const refreshed = topicIdsByName.get(name);
  if (refreshed) return refreshed;

  throw new Error(`Resend topic ${name} is missing; run topic migration`);
}

async function ensureAllCurrentTopicIds() {
  const entries: Array<{ key: string; id: string }> = [];

  for (const parts of allTopicParts()) {
    entries.push({
      key: topicKey(parts),
      id: await ensureTopicId(parts),
    });
  }

  return entries;
}

async function ensureContact(email: string) {
  const updated = await resendJson<{ id: string }>(
    `/contacts/${encodeURIComponent(email)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ unsubscribed: false }),
    },
  );

  if (updated.data) return updated.data;

  if (updated.error?.statusCode !== 404) {
    throw new Error(updated.error?.message ?? "Resend contact update failed");
  }

  const env = getResendEnv();
  const created = await resendJson<{ id: string }>("/contacts", {
    method: "POST",
    body: JSON.stringify({
      email,
      unsubscribed: false,
      ...(env.RESEND_MARKETING_SEGMENT_ID
        ? { segments: [{ id: env.RESEND_MARKETING_SEGMENT_ID }] }
        : {}),
    }),
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

  const preferences = normalizeDispatchPreferences(input.preferences);
  const selected = new Set(selectedTopicKeys(preferences));

  await ensureContact(input.email);

  const segment = await resendJson<{ id: string }>(
    `/contacts/${encodeURIComponent(input.email)}/segments/${env.RESEND_MARKETING_SEGMENT_ID}`,
    { method: "POST", body: "{}" },
  );

  if (!segment.data && segment.error?.statusCode !== 409) {
    throw new Error(segment.error?.message ?? "Resend segment sync failed");
  }

  const topics: TopicSubscription[] = (await ensureAllCurrentTopicIds()).map(
    (topic) => ({
      id: topic.id,
      subscription: selected.has(topic.key) ? "opt_in" : "opt_out",
    }),
  );

  const topicUpdate = await resendJson<{ id?: string }>(
    `/contacts/${encodeURIComponent(input.email)}/topics`,
    {
      method: "PATCH",
      body: JSON.stringify({ topics }),
    },
  );

  if (!topicUpdate.data && topicUpdate.error) {
    throw new Error(topicUpdate.error.message ?? "Resend topic sync failed");
  }
}

export async function unsubscribeMarketingContact(input: { email: string }) {
  const topics: TopicSubscription[] = (await ensureAllCurrentTopicIds()).map(
    (topic) => ({
      id: topic.id,
      subscription: "opt_out",
    }),
  );

  const topicUpdate = await resendJson(
    `/contacts/${encodeURIComponent(input.email)}/topics`,
    {
      method: "PATCH",
      body: JSON.stringify({ topics }),
    },
  );

  if (!topicUpdate.data && topicUpdate.error?.statusCode !== 404) {
    throw new Error(
      topicUpdate.error?.message ?? "Resend topic opt-out failed",
    );
  }

  const updated = await resendJson(
    `/contacts/${encodeURIComponent(input.email)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ unsubscribed: true }),
    },
  );

  if (!updated.data && updated.error?.statusCode !== 404) {
    throw new Error(updated.error?.message ?? "Resend unsubscribe failed");
  }
}

export async function getMarketingContactPreferences(input: {
  email: string;
}): Promise<DispatchPreferences> {
  const listed = await resendJson<ResendListResponse<ContactTopic>>(
    `/contacts/${encodeURIComponent(input.email)}/topics`,
  );

  if (!listed.data) {
    throw new Error(
      listed.error?.message ?? "Resend topic preference lookup failed",
    );
  }

  const concrete = listed.data.data
    .filter((topic) => topic.subscription === "opt_in")
    .flatMap((topic) => {
      const parsed = parseTopicKey(topic.name);
      return parsed ? [parsed] : [];
    });

  return preferencesFromTopicParts(concrete);
}

function preferencesFromTopicParts(parts: TopicParts[]): DispatchPreferences {
  return normalizeDispatchPreferences({
    events: [...new Set(parts.map((part) => part.event))],
    families: [...new Set(parts.map((part) => part.family))],
    datacentres: [...new Set(parts.map((part) => part.datacentre))],
  });
}
