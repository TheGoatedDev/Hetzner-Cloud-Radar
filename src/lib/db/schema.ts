import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";

export * from "./auth-schema";

export const pollRuns = sqliteTable("poll_runs", {
  id: text("id").primaryKey(),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  status: text("status", { enum: ["success", "failed"] }).notNull(),
  httpStatus: integer("http_status"),
  errorMessage: text("error_message"),
});

export const serverTypes = sqliteTable("server_types", {
  code: text("code").primaryKey(),
  hetznerId: integer("hetzner_id").notNull(),
  family: text("family").notNull(),
  cores: integer("cores").notNull(),
  memoryGb: integer("memory_gb").notNull(),
  diskGb: integer("disk_gb").notNull(),
  architecture: text("architecture").notNull(),
  raw: text("raw", { mode: "json" }).notNull().$type<Record<string, unknown>>(),
});

export const locations = sqliteTable("locations", {
  code: text("code").primaryKey(),
  apiName: text("api_name").notNull().unique(),
  city: text("city").notNull(),
  country: text("country").notNull(),
  networkZone: text("network_zone").notNull(),
  raw: text("raw", { mode: "json" }).notNull().$type<Record<string, unknown>>(),
});

// ponytail: observations dropped — history uses stock_events + current only

export const availabilityCurrent = sqliteTable(
  "availability_current",
  {
    serverTypeCode: text("server_type_code")
      .notNull()
      .references(() => serverTypes.code),
    locationCode: text("location_code")
      .notNull()
      .references(() => locations.code),
    observedAt: text("observed_at").notNull(),
    baseStatus: text("base_status", {
      enum: ["available", "sold-out", "not-offered", "unknown"],
    }).notNull(),
    displayStatus: text("display_status", {
      enum: ["available", "limited", "sold-out", "not-offered", "unknown"],
    }).notNull(),
    apiAvailable: integer("api_available", { mode: "boolean" }),
    apiRecommended: integer("api_recommended", { mode: "boolean" }),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.serverTypeCode, table.locationCode],
    }),
  }),
);

export const dailyAvailabilityState = sqliteTable(
  "daily_availability_state",
  {
    dateUtc: text("date_utc").notNull(),
    serverTypeCode: text("server_type_code")
      .notNull()
      .references(() => serverTypes.code),
    locationCode: text("location_code")
      .notNull()
      .references(() => locations.code),
    sawAvailable: integer("saw_available", { mode: "boolean" })
      .notNull()
      .default(false),
    sawSoldOut: integer("saw_sold_out", { mode: "boolean" })
      .notNull()
      .default(false),
    pollCount: integer("poll_count").notNull().default(0),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.dateUtc, table.serverTypeCode, table.locationCode],
    }),
  }),
);

export const stockEvents = sqliteTable(
  "stock_events",
  {
    id: text("id").primaryKey(),
    observedAt: text("observed_at").notNull(),
    serverTypeCode: text("server_type_code").notNull(),
    locationCode: text("location_code").notNull(),
    baseStatus: text("base_status", {
      enum: ["available", "sold-out", "not-offered", "unknown"],
    }).notNull(),
    prevStatus: text("prev_status", {
      enum: ["available", "sold-out", "not-offered", "unknown"],
    }),
    previousSoldOutAt: text("previous_sold_out_at"),
  },
  (table) => ({
    observedAtIdx: index("stock_events_observed_at_idx").on(table.observedAt),
    cellObservedAtIdx: index("stock_events_cell_observed_at_idx").on(
      table.serverTypeCode,
      table.locationCode,
      table.observedAt,
    ),
  }),
);

export const marketingDispatchSends = sqliteTable("marketing_dispatch_sends", {
  dispatchId: text("dispatch_id").primaryKey(),
  eventState: text("event_state", {
    enum: ["ongoing-out", "resolved-restock", "ongoing-rollout"],
  }).notNull(),
  scope: text("scope").notNull(),
  status: text("status", { enum: ["sent", "failed", "skipped"] }).notNull(),
  recipientCount: integer("recipient_count").notNull().default(0),
  resendEmailIds: text("resend_email_ids", { mode: "json" })
    .notNull()
    .default([])
    .$type<string[]>(),
  sentAt: text("sent_at"),
  errorMessage: text("error_message"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const marketListings = sqliteTable(
  "market_listings",
  {
    id: text("id").primaryKey(),
    sellerId: text("seller_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    serverType: text("server_type").notNull(),
    locationCode: text("location_code").notNull(),
    priceCents: integer("price_cents").notNull(),
    currency: text("currency").notNull().default("EUR"),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    includes: text("includes").notNull().default(""),
    status: text("status", {
      enum: ["active", "sold", "expired", "removed"],
    })
      .notNull()
      .default("active"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    expiresAt: text("expires_at").notNull(),
    soldAt: text("sold_at"),
  },
  (table) => ({
    statusLocTypeIdx: index("market_listings_status_loc_type_idx").on(
      table.status,
      table.locationCode,
      table.serverType,
    ),
    sellerIdx: index("market_listings_seller_idx").on(table.sellerId),
  }),
);
