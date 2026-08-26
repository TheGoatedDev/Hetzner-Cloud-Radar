import type { UpsertExternalInput } from "./listings";
import { isCloudTransferPost, parseListingFields } from "./parse";

// Forum Marktplatz is login-walled for non-customers. Soft-fail unless
// optional cookie/session env is provided later.
const FORUM_BOARD =
  process.env.HETZNER_FORUM_MARKTPLATZ_URL ??
  "https://forum.hetzner.com/wcf/index.php?board/47-marktplatz/";

const UA =
  process.env.REDDIT_USER_AGENT ??
  "hetzner-cloud-radar/0.1 (transfer index; contact via site)";

function decodeHtml(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractThreads(html: string): UpsertExternalInput[] {
  const out: UpsertExternalInput[] = [];
  const seen = new Set<string>();

  // WoltLab thread links: ...thread/123-slug/ or threadID=123
  const linkRe =
    /href="(https?:\/\/forum\.hetzner\.com[^"]*?(?:thread\/(\d+)[^"]*|threadID=(\d+)[^"]*))"[^>]*>([^<]{8,200})</gi;

  const matches = html.matchAll(linkRe);
  for (const m of matches) {
    const url = decodeHtml(m[1] ?? "");
    const id = m[2] ?? m[3];
    const title = decodeHtml((m[4] ?? "").trim());
    if (!id || !title || seen.has(id)) continue;
    seen.add(id);

    if (!isCloudTransferPost(title, "")) continue;
    const fields = parseListingFields(title, "");

    out.push({
      source: "hetzner_forum",
      externalId: id,
      externalUrl: url.split("?")[0] ?? url,
      title,
      body: "",
      author: null,
      serverType: fields.serverType,
      locationCode: fields.locationCode,
      priceCents: fields.priceCents,
      sourceCreatedAt: null,
    });
  }

  return out;
}

export async function fetchForumListings(): Promise<{
  listings: UpsertExternalInput[];
  skipped: boolean;
  error?: string;
}> {
  try {
    const headers: Record<string, string> = {
      "user-agent": UA,
      accept: "text/html,application/xhtml+xml",
    };
    const cookie = process.env.HETZNER_FORUM_COOKIE;
    if (cookie) headers.cookie = cookie;

    const res = await fetch(FORUM_BOARD, {
      headers,
      redirect: "follow",
    });

    if (!res.ok) {
      return {
        listings: [],
        skipped: res.status === 401 || res.status === 403,
        error: `forum HTTP ${res.status}`,
      };
    }

    const html = await res.text();
    if (
      /must be logged-in|you must log in|login required/i.test(html) &&
      !cookie
    ) {
      return {
        listings: [],
        skipped: true,
        error: "forum login-walled (set HETZNER_FORUM_COOKIE to enable)",
      };
    }

    return { listings: extractThreads(html), skipped: false };
  } catch (err) {
    return {
      listings: [],
      skipped: false,
      error: err instanceof Error ? err.message : "forum fetch failed",
    };
  }
}
