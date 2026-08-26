import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { marketListings } from "@/lib/db/schema";
import { DCS, type DcCode } from "@/lib/schema";

export type ListingSource = "reddit" | "hetzner_forum";
export type ListingStatus = "active" | "closed" | "stale";

export type PublicListing = {
  id: string;
  source: ListingSource;
  externalUrl: string;
  title: string;
  body: string;
  author: string | null;
  serverType: string | null;
  locationCode: string | null;
  priceCents: number | null;
  currency: string;
  status: ListingStatus;
  sourceCreatedAt: string | null;
  lastSeenAt: string;
  createdAt: string;
};

export type UpsertExternalInput = {
  source: ListingSource;
  externalId: string;
  externalUrl: string;
  title: string;
  body?: string;
  author?: string | null;
  serverType?: string | null;
  locationCode?: string | null;
  priceCents?: number | null;
  sourceCreatedAt?: string | null;
};

const STALE_DAYS = 14;

function nowIso() {
  return new Date().toISOString();
}

export function formatPrice(cents: number, currency = "EUR") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function sourceLabel(source: ListingSource) {
  return source === "reddit" ? "Reddit" : "Hetzner Forum";
}

export function isValidDc(code: string): code is DcCode {
  return (DCS as readonly string[]).includes(code);
}

export async function listActiveListings(filters?: {
  serverType?: string;
  locationCode?: string;
}) {
  const db = await getDb();
  const conditions = [eq(marketListings.status, "active")];
  if (filters?.serverType) {
    conditions.push(eq(marketListings.serverType, filters.serverType));
  }
  if (filters?.locationCode) {
    conditions.push(eq(marketListings.locationCode, filters.locationCode));
  }

  const rows = await db
    .select({
      id: marketListings.id,
      source: marketListings.source,
      externalUrl: marketListings.externalUrl,
      title: marketListings.title,
      body: marketListings.body,
      author: marketListings.author,
      serverType: marketListings.serverType,
      locationCode: marketListings.locationCode,
      priceCents: marketListings.priceCents,
      currency: marketListings.currency,
      status: marketListings.status,
      sourceCreatedAt: marketListings.sourceCreatedAt,
      lastSeenAt: marketListings.lastSeenAt,
      createdAt: marketListings.createdAt,
    })
    .from(marketListings)
    .where(and(...conditions))
    .orderBy(
      desc(marketListings.sourceCreatedAt),
      desc(marketListings.createdAt),
    )
    .limit(100);

  return rows as PublicListing[];
}

export async function getListing(id: string): Promise<PublicListing | null> {
  const db = await getDb();
  const rows = await db
    .select({
      id: marketListings.id,
      source: marketListings.source,
      externalUrl: marketListings.externalUrl,
      title: marketListings.title,
      body: marketListings.body,
      author: marketListings.author,
      serverType: marketListings.serverType,
      locationCode: marketListings.locationCode,
      priceCents: marketListings.priceCents,
      currency: marketListings.currency,
      status: marketListings.status,
      sourceCreatedAt: marketListings.sourceCreatedAt,
      lastSeenAt: marketListings.lastSeenAt,
      createdAt: marketListings.createdAt,
    })
    .from(marketListings)
    .where(eq(marketListings.id, id))
    .limit(1);

  return (rows[0] as PublicListing | undefined) ?? null;
}

export async function upsertExternalListing(input: UpsertExternalInput) {
  const db = await getDb();
  const ts = nowIso();
  const existing = await db
    .select({ id: marketListings.id })
    .from(marketListings)
    .where(
      and(
        eq(marketListings.source, input.source),
        eq(marketListings.externalId, input.externalId),
      ),
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(marketListings)
      .set({
        externalUrl: input.externalUrl,
        title: input.title.slice(0, 300),
        body: (input.body ?? "").slice(0, 4000),
        author: input.author ?? null,
        serverType: input.serverType ?? null,
        locationCode: input.locationCode ?? null,
        priceCents: input.priceCents ?? null,
        status: "active",
        sourceCreatedAt: input.sourceCreatedAt ?? null,
        lastSeenAt: ts,
        updatedAt: ts,
      })
      .where(eq(marketListings.id, existing[0].id));
    return existing[0].id;
  }

  const id = crypto.randomUUID();
  await db.insert(marketListings).values({
    id,
    source: input.source,
    externalId: input.externalId,
    externalUrl: input.externalUrl,
    title: input.title.slice(0, 300),
    body: (input.body ?? "").slice(0, 4000),
    author: input.author ?? null,
    serverType: input.serverType ?? null,
    locationCode: input.locationCode ?? null,
    priceCents: input.priceCents ?? null,
    currency: "EUR",
    status: "active",
    sourceCreatedAt: input.sourceCreatedAt ?? null,
    lastSeenAt: ts,
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

export async function markStaleListings(beforeIso: string) {
  const db = await getDb();
  await db
    .update(marketListings)
    .set({ status: "stale", updatedAt: nowIso() })
    .where(
      and(
        eq(marketListings.status, "active"),
        sql`${marketListings.lastSeenAt} < ${beforeIso}`,
      ),
    );
}

export function staleCutoffIso(from = new Date()) {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() - STALE_DAYS);
  return d.toISOString();
}
