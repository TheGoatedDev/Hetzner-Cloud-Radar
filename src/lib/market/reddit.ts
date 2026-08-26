import type { UpsertExternalInput } from "./listings";
import { isCloudTransferPost, parseListingFields } from "./parse";

const UA =
  process.env.REDDIT_USER_AGENT ??
  "hetzner-cloud-radar/0.1 (transfer index; contact via site)";

type RedditToken = { access_token: string; token_type: string };

type RedditListingChild = {
  data: {
    id: string;
    name: string;
    title: string;
    selftext?: string;
    author?: string;
    permalink: string;
    created_utc?: number;
    stickied?: boolean;
  };
};

type RedditSearchResponse = {
  data?: { children?: RedditListingChild[] };
};

async function getAccessToken(): Promise<string | null> {
  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  if (!id || !secret) return null;

  const basic = btoa(`${id}:${secret}`);
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      authorization: `Basic ${basic}`,
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": UA,
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) return null;
  const json = (await res.json()) as RedditToken;
  return json.access_token ?? null;
}

async function search(
  token: string,
  q: string,
): Promise<UpsertExternalInput[]> {
  const url = new URL("https://oauth.reddit.com/r/hetzner/search");
  url.searchParams.set("q", q);
  url.searchParams.set("restrict_sr", "true");
  url.searchParams.set("sort", "new");
  url.searchParams.set("t", "year");
  url.searchParams.set("limit", "100");
  url.searchParams.set("type", "link");

  const res = await fetch(url, {
    headers: {
      authorization: `Bearer ${token}`,
      "user-agent": UA,
    },
  });
  if (!res.ok) return [];

  const json = (await res.json()) as RedditSearchResponse;
  const out: UpsertExternalInput[] = [];
  const seen = new Set<string>();

  for (const child of json.data?.children ?? []) {
    const p = child.data;
    if (!p?.id || p.stickied) continue;
    if (seen.has(p.id)) continue;
    seen.add(p.id);

    const title = p.title ?? "";
    const body = p.selftext ?? "";
    if (!isCloudTransferPost(title, body)) continue;

    const fields = parseListingFields(title, body);
    const permalink = p.permalink.startsWith("http")
      ? p.permalink
      : `https://www.reddit.com${p.permalink}`;

    out.push({
      source: "reddit",
      externalId: p.id,
      externalUrl: permalink.split("?")[0] ?? permalink,
      title,
      body,
      author: p.author && p.author !== "[deleted]" ? p.author : null,
      serverType: fields.serverType,
      locationCode: fields.locationCode,
      priceCents: fields.priceCents,
      sourceCreatedAt:
        typeof p.created_utc === "number"
          ? new Date(p.created_utc * 1000).toISOString()
          : null,
    });
  }

  return out;
}

export async function fetchRedditListings(): Promise<{
  listings: UpsertExternalInput[];
  skipped: boolean;
  error?: string;
}> {
  const token = await getAccessToken();
  if (!token) {
    return {
      listings: [],
      skipped: true,
      error: "REDDIT_CLIENT_ID/SECRET not set",
    };
  }

  try {
    const queries = [
      "transfer (cloud OR CCX OR CAX OR CPX OR CX)",
      '"project invite" OR "take over" cloud',
      "handoff OR handoff cloud",
    ];
    const merged = new Map<string, UpsertExternalInput>();
    for (const q of queries) {
      const batch = await search(token, q);
      for (const item of batch) merged.set(item.externalId, item);
    }
    return { listings: [...merged.values()], skipped: false };
  } catch (err) {
    return {
      listings: [],
      skipped: false,
      error: err instanceof Error ? err.message : "reddit fetch failed",
    };
  }
}
