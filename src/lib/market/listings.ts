import { and, desc, eq, gt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { marketListings, user } from "@/lib/db/schema";
import { DCS, type DcCode } from "@/lib/schema";

const LISTING_TTL_DAYS = 21;

export type ListingStatus = "active" | "sold" | "expired" | "removed";

export type PublicListing = {
  id: string;
  serverType: string;
  locationCode: string;
  priceCents: number;
  currency: string;
  title: string;
  body: string;
  includes: string;
  status: ListingStatus;
  createdAt: string;
  expiresAt: string;
  soldAt: string | null;
};

export type ListingDetail = PublicListing & {
  sellerEmail: string | null;
  sellerId: string;
  isOwner: boolean;
};

function nowIso() {
  return new Date().toISOString();
}

function expiresIso(from = new Date()) {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + LISTING_TTL_DAYS);
  return d.toISOString();
}

export function formatPrice(cents: number, currency = "EUR") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function isValidDc(code: string): code is DcCode {
  return (DCS as readonly string[]).includes(code);
}

export async function listActiveListings(filters?: {
  serverType?: string;
  locationCode?: string;
}) {
  const db = await getDb();
  const now = nowIso();
  const conditions = [
    eq(marketListings.status, "active"),
    gt(marketListings.expiresAt, now),
  ];
  if (filters?.serverType) {
    conditions.push(eq(marketListings.serverType, filters.serverType));
  }
  if (filters?.locationCode) {
    conditions.push(eq(marketListings.locationCode, filters.locationCode));
  }

  const rows = await db
    .select({
      id: marketListings.id,
      serverType: marketListings.serverType,
      locationCode: marketListings.locationCode,
      priceCents: marketListings.priceCents,
      currency: marketListings.currency,
      title: marketListings.title,
      body: marketListings.body,
      includes: marketListings.includes,
      status: marketListings.status,
      createdAt: marketListings.createdAt,
      expiresAt: marketListings.expiresAt,
      soldAt: marketListings.soldAt,
    })
    .from(marketListings)
    .where(and(...conditions))
    .orderBy(desc(marketListings.createdAt))
    .limit(100);

  return rows as PublicListing[];
}

export async function listMyListings(sellerId: string) {
  const db = await getDb();
  const rows = await db
    .select({
      id: marketListings.id,
      serverType: marketListings.serverType,
      locationCode: marketListings.locationCode,
      priceCents: marketListings.priceCents,
      currency: marketListings.currency,
      title: marketListings.title,
      body: marketListings.body,
      includes: marketListings.includes,
      status: marketListings.status,
      createdAt: marketListings.createdAt,
      expiresAt: marketListings.expiresAt,
      soldAt: marketListings.soldAt,
    })
    .from(marketListings)
    .where(eq(marketListings.sellerId, sellerId))
    .orderBy(desc(marketListings.createdAt))
    .limit(100);

  return rows as PublicListing[];
}

export async function getListing(
  id: string,
  viewerId?: string | null,
): Promise<ListingDetail | null> {
  const db = await getDb();
  const rows = await db
    .select({
      id: marketListings.id,
      sellerId: marketListings.sellerId,
      serverType: marketListings.serverType,
      locationCode: marketListings.locationCode,
      priceCents: marketListings.priceCents,
      currency: marketListings.currency,
      title: marketListings.title,
      body: marketListings.body,
      includes: marketListings.includes,
      status: marketListings.status,
      createdAt: marketListings.createdAt,
      expiresAt: marketListings.expiresAt,
      soldAt: marketListings.soldAt,
      sellerEmail: user.email,
    })
    .from(marketListings)
    .innerJoin(user, eq(marketListings.sellerId, user.id))
    .where(eq(marketListings.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const isOwner = Boolean(viewerId && viewerId === row.sellerId);
  const showEmail =
    isOwner ||
    (Boolean(viewerId) && row.status === "active" && row.expiresAt > nowIso());

  return {
    id: row.id,
    sellerId: row.sellerId,
    serverType: row.serverType,
    locationCode: row.locationCode,
    priceCents: row.priceCents,
    currency: row.currency,
    title: row.title,
    body: row.body,
    includes: row.includes,
    status: row.status as ListingStatus,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    soldAt: row.soldAt,
    sellerEmail: showEmail ? row.sellerEmail : null,
    isOwner,
  };
}

export type CreateListingInput = {
  sellerId: string;
  serverType: string;
  locationCode: string;
  priceCents: number;
  title: string;
  body?: string;
  includes?: string;
};

export async function createListing(input: CreateListingInput) {
  const db = await getDb();
  const id = crypto.randomUUID();
  const ts = nowIso();
  await db.insert(marketListings).values({
    id,
    sellerId: input.sellerId,
    serverType: input.serverType.trim().toUpperCase(),
    locationCode: input.locationCode.trim().toUpperCase(),
    priceCents: input.priceCents,
    currency: "EUR",
    title: input.title.trim().slice(0, 120),
    body: (input.body ?? "").trim().slice(0, 4000),
    includes: (input.includes ?? "").trim().slice(0, 500),
    status: "active",
    createdAt: ts,
    updatedAt: ts,
    expiresAt: expiresIso(),
  });
  return id;
}

export async function updateListingStatus(
  id: string,
  sellerId: string,
  status: "sold" | "removed" | "active",
) {
  const db = await getDb();
  const ts = nowIso();
  const result = await db
    .update(marketListings)
    .set({
      status,
      updatedAt: ts,
      soldAt: status === "sold" ? ts : null,
      ...(status === "active" ? { expiresAt: expiresIso() } : {}),
    })
    .where(
      and(eq(marketListings.id, id), eq(marketListings.sellerId, sellerId)),
    )
    .returning({ id: marketListings.id });

  return result[0]?.id ?? null;
}

// expire on read path for listings past TTL still marked active
export async function expireStaleListings() {
  const db = await getDb();
  await db
    .update(marketListings)
    .set({ status: "expired", updatedAt: nowIso() })
    .where(
      and(
        eq(marketListings.status, "active"),
        sql`${marketListings.expiresAt} <= ${nowIso()}`,
      ),
    );
}
