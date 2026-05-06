import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const pollRuns = pgTable("poll_runs", {
  id: text("id").primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true, mode: "date" }),
  status: text("status", { enum: ["success", "failed"] }).notNull(),
  httpStatus: integer("http_status"),
  errorMessage: text("error_message"),
});

export const serverTypes = pgTable("server_types", {
  code: text("code").primaryKey(),
  hetznerId: integer("hetzner_id").notNull(),
  family: text("family", { enum: ["cx", "cax", "cpx", "ccx", "other"] })
    .notNull()
    .default("other"),
  cores: integer("cores").notNull(),
  memoryGb: integer("memory_gb").notNull(),
  diskGb: integer("disk_gb").notNull(),
  architecture: text("architecture").notNull(),
  raw: jsonb("raw").notNull(),
});

export const locations = pgTable("locations", {
  code: text("code").primaryKey(),
  apiName: text("api_name").notNull().unique(),
  city: text("city").notNull(),
  country: text("country").notNull(),
  networkZone: text("network_zone").notNull(),
  raw: jsonb("raw").notNull(),
});

export const availabilityObservations = pgTable(
  "availability_observations",
  {
    id: text("id").primaryKey(),
    pollRunId: text("poll_run_id")
      .notNull()
      .references(() => pollRuns.id, { onDelete: "cascade" }),
    serverTypeCode: text("server_type_code")
      .notNull()
      .references(() => serverTypes.code),
    locationCode: text("location_code")
      .notNull()
      .references(() => locations.code),
    observedAt: timestamp("observed_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    supported: boolean("supported").notNull(),
    apiAvailable: boolean("api_available"),
    apiRecommended: boolean("api_recommended"),
    baseStatus: text("base_status", {
      enum: ["available", "sold-out", "not-offered", "unknown"],
    }).notNull(),
  },
  (table) => ({
    pollTypeLocation: uniqueIndex(
      "availability_observations_poll_type_location_idx",
    ).on(table.pollRunId, table.serverTypeCode, table.locationCode),
  }),
);

export const availabilityCurrent = pgTable(
  "availability_current",
  {
    serverTypeCode: text("server_type_code")
      .notNull()
      .references(() => serverTypes.code),
    locationCode: text("location_code")
      .notNull()
      .references(() => locations.code),
    observedAt: timestamp("observed_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    baseStatus: text("base_status", {
      enum: ["available", "sold-out", "not-offered", "unknown"],
    }).notNull(),
    displayStatus: text("display_status", {
      enum: ["available", "limited", "sold-out", "not-offered", "unknown"],
    }).notNull(),
    apiAvailable: boolean("api_available"),
    apiRecommended: boolean("api_recommended"),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.serverTypeCode, table.locationCode],
    }),
  }),
);

export const dailyAvailabilityState = pgTable(
  "daily_availability_state",
  {
    dateUtc: text("date_utc").notNull(),
    serverTypeCode: text("server_type_code")
      .notNull()
      .references(() => serverTypes.code),
    locationCode: text("location_code")
      .notNull()
      .references(() => locations.code),
    sawAvailable: boolean("saw_available").notNull().default(false),
    sawSoldOut: boolean("saw_sold_out").notNull().default(false),
    pollCount: integer("poll_count").notNull().default(0),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.dateUtc, table.serverTypeCode, table.locationCode],
    }),
  }),
);

export const mailingSubscribers = pgTable("mailing_subscribers", {
  email: text("email").primaryKey(),
  wantsSoldOut: boolean("wants_sold_out").notNull().default(true),
  wantsRestock: boolean("wants_restock").notNull().default(true),
  resendContactId: text("resend_contact_id"),
  resendSyncedAt: timestamp("resend_synced_at", {
    withTimezone: true,
    mode: "date",
  }),
  resendErrorMessage: text("resend_error_message"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const marketingDispatchSends = pgTable("marketing_dispatch_sends", {
  dispatchId: text("dispatch_id").primaryKey(),
  eventState: text("event_state", {
    enum: ["ongoing-out", "resolved-restock", "ongoing-rollout"],
  }).notNull(),
  scope: text("scope").notNull(),
  status: text("status", { enum: ["sent", "failed", "skipped"] }).notNull(),
  recipientCount: integer("recipient_count").notNull().default(0),
  resendEmailIds: jsonb("resend_email_ids").notNull().default([]),
  sentAt: timestamp("sent_at", { withTimezone: true, mode: "date" }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});
