-- Initial schema for D1 (sqlite)

CREATE TABLE IF NOT EXISTS poll_runs (
  id text PRIMARY KEY NOT NULL,
  started_at text NOT NULL,
  finished_at text,
  status text NOT NULL,
  http_status integer,
  error_message text
);

CREATE TABLE IF NOT EXISTS server_types (
  code text PRIMARY KEY NOT NULL,
  hetzner_id integer NOT NULL,
  family text NOT NULL,
  cores integer NOT NULL,
  memory_gb integer NOT NULL,
  disk_gb integer NOT NULL,
  architecture text NOT NULL,
  raw text NOT NULL
);

CREATE TABLE IF NOT EXISTS locations (
  code text PRIMARY KEY NOT NULL,
  api_name text NOT NULL UNIQUE,
  city text NOT NULL,
  country text NOT NULL,
  network_zone text NOT NULL,
  raw text NOT NULL
);

CREATE TABLE IF NOT EXISTS availability_current (
  server_type_code text NOT NULL,
  location_code text NOT NULL,
  observed_at text NOT NULL,
  base_status text NOT NULL,
  display_status text NOT NULL,
  api_available integer,
  api_recommended integer,
  PRIMARY KEY (server_type_code, location_code)
);

CREATE TABLE IF NOT EXISTS daily_availability_state (
  date_utc text NOT NULL,
  server_type_code text NOT NULL,
  location_code text NOT NULL,
  saw_available integer NOT NULL DEFAULT 0,
  saw_sold_out integer NOT NULL DEFAULT 0,
  poll_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (date_utc, server_type_code, location_code)
);

CREATE TABLE IF NOT EXISTS stock_events (
  id text PRIMARY KEY NOT NULL,
  observed_at text NOT NULL,
  server_type_code text NOT NULL,
  location_code text NOT NULL,
  base_status text NOT NULL,
  prev_status text,
  previous_sold_out_at text
);

CREATE INDEX IF NOT EXISTS stock_events_observed_at_idx ON stock_events (observed_at);
CREATE INDEX IF NOT EXISTS stock_events_cell_observed_at_idx ON stock_events (server_type_code, location_code, observed_at);

CREATE TABLE IF NOT EXISTS marketing_dispatch_sends (
  dispatch_id text PRIMARY KEY NOT NULL,
  event_state text NOT NULL,
  scope text NOT NULL,
  status text NOT NULL,
  recipient_count integer NOT NULL DEFAULT 0,
  resend_email_ids text NOT NULL DEFAULT '[]',
  sent_at text,
  error_message text,
  created_at text NOT NULL,
  updated_at text NOT NULL
);
