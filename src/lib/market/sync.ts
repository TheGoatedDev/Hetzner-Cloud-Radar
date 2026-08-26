import { fetchForumListings } from "./forum";
import {
  markStaleListings,
  staleCutoffIso,
  upsertExternalListing,
} from "./listings";
import { fetchRedditListings } from "./reddit";

export type MarketSyncResult = {
  reddit: { upserted: number; skipped: boolean; error?: string };
  forum: { upserted: number; skipped: boolean; error?: string };
  staleMarked: boolean;
};

export async function syncMarketListings(): Promise<MarketSyncResult> {
  const [reddit, forum] = await Promise.all([
    fetchRedditListings(),
    fetchForumListings(),
  ]);

  let redditUpserted = 0;
  for (const item of reddit.listings) {
    await upsertExternalListing(item);
    redditUpserted += 1;
  }

  let forumUpserted = 0;
  for (const item of forum.listings) {
    await upsertExternalListing(item);
    forumUpserted += 1;
  }

  await markStaleListings(staleCutoffIso());

  return {
    reddit: {
      upserted: redditUpserted,
      skipped: reddit.skipped,
      error: reddit.error,
    },
    forum: {
      upserted: forumUpserted,
      skipped: forum.skipped,
      error: forum.error,
    },
    staleMarked: true,
  };
}
