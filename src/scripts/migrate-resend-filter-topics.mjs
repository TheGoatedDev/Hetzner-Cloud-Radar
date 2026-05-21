import { config } from "dotenv";
import { Resend } from "resend";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const APPLY = process.argv.includes("--apply");
const EVENTS = ["soldout", "restock"];
const FAMILIES = ["cx", "cax", "cpx", "ccx"];
const DCS = ["NBG1", "FSN1", "HEL1", "ASH", "HIL", "SIN"];
const TOPIC_PREFIX = "hcr";
const PAGE_LIMIT = 100;
const REQUEST_DELAY_MS = 250;

const apiKey = process.env.RESEND_API_KEY;
const segmentId = process.env.RESEND_MARKETING_SEGMENT_ID;
const oldSoldOutTopicId = process.env.RESEND_SOLD_OUT_TOPIC_ID;
const oldRestockTopicId = process.env.RESEND_RESTOCK_TOPIC_ID;

if (!apiKey) throw new Error("RESEND_API_KEY is required");
if (!segmentId) throw new Error("RESEND_MARKETING_SEGMENT_ID is required");
if (!oldSoldOutTopicId) throw new Error("RESEND_SOLD_OUT_TOPIC_ID is required");
if (!oldRestockTopicId) throw new Error("RESEND_RESTOCK_TOPIC_ID is required");

const resend = new Resend(apiKey);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function topicKey(event, family, dc) {
  return [TOPIC_PREFIX, event, family, dc.toLowerCase()].join(":");
}

function topicDescription(event, family, dc) {
  return `Hetzner Cloud Radar ${event} dispatches for ${family.toUpperCase()} in ${dc}`;
}

function allTopicParts() {
  return EVENTS.flatMap((event) =>
    FAMILIES.flatMap((family) => DCS.map((dc) => ({ event, family, dc }))),
  );
}

async function resendCall(label, fn, attempt = 1) {
  await sleep(REQUEST_DELAY_MS);
  const result = await fn();

  if (result.data) return result.data;

  const statusCode = result.error?.statusCode;
  if ((statusCode === 429 || statusCode >= 500) && attempt < 5) {
    await sleep(REQUEST_DELAY_MS * 2 ** attempt);
    return resendCall(label, fn, attempt + 1);
  }

  throw new Error(result.error?.message ?? `${label} failed`);
}

async function listAllContacts() {
  const contacts = [];
  let after;

  do {
    const page = await resendCall("List contacts", () =>
      resend.contacts.list({ segmentId, limit: PAGE_LIMIT, after }),
    );
    contacts.push(...page.data);
    after = page.data.at(-1)?.id;
    if (!page.has_more) break;
  } while (after);

  return contacts;
}

async function listAllTopics() {
  const listed = await resendCall("List topics", () => resend.topics.list());

  return new Map(listed.data.map((topic) => [topic.name, topic.id]));
}

async function ensureTopicIds() {
  const topicsByName = await listAllTopics();
  const topicIds = new Map();

  for (const part of allTopicParts()) {
    const name = topicKey(part.event, part.family, part.dc);
    const existing = topicsByName.get(name);

    if (existing) {
      topicIds.set(name, existing);
      continue;
    }

    if (!APPLY) {
      topicIds.set(name, `dry-run:${name}`);
      continue;
    }

    const created = await resendCall(`Create topic ${name}`, () =>
      resend.topics.create({
        name,
        description: topicDescription(part.event, part.family, part.dc),
        defaultSubscription: "opt_out",
        visibility: "private",
      }),
    );
    topicIds.set(name, created.id);
  }

  return topicIds;
}

async function contactTopicEvents(email) {
  const listed = await resendCall("List contact topics", () =>
    resend.contacts.topics.list({ email, limit: PAGE_LIMIT }),
  );
  const optedInIds = new Set(
    listed.data
      .filter((topic) => topic.subscription === "opt_in")
      .map((topic) => topic.id),
  );

  return {
    soldout: optedInIds.has(oldSoldOutTopicId),
    restock: optedInIds.has(oldRestockTopicId),
  };
}

function targetTopicIds(events, topicIds) {
  return EVENTS.filter((event) => events[event]).flatMap((event) =>
    FAMILIES.flatMap((family) =>
      DCS.map((dc) => topicIds.get(topicKey(event, family, dc))),
    ),
  );
}

const contacts = await listAllContacts();
const topicIds = await ensureTopicIds();
const summary = {
  apply: APPLY,
  contacts: contacts.length,
  skippedUnsubscribed: 0,
  skippedNoLegacyPreference: 0,
  wouldUpdate: 0,
  updated: 0,
  failed: 0,
};

for (const [index, contact] of contacts.entries()) {
  if (contact.unsubscribed) {
    summary.skippedUnsubscribed += 1;
    continue;
  }

  try {
    const events = await contactTopicEvents(contact.email);
    const ids = targetTopicIds(events, topicIds);

    if (ids.length === 0) {
      summary.skippedNoLegacyPreference += 1;
      continue;
    }

    summary.wouldUpdate += 1;

    if (APPLY) {
      await resendCall("Update contact topics", () =>
        resend.contacts.topics.update({
          email: contact.email,
          topics: ids.map((id) => ({ id, subscription: "opt_in" })),
        }),
      );
      summary.updated += 1;
    }
  } catch (error) {
    summary.failed += 1;
    console.error(
      `Contact ${index + 1}/${contacts.length} failed: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
  }
}

console.log(JSON.stringify(summary, null, 2));

if (summary.failed > 0) {
  process.exitCode = 1;
}
