CREATE TABLE `server_types` (
	`code` text PRIMARY KEY NOT NULL,
	`hetzner_id` integer NOT NULL,
	`family` text NOT NULL,
	`cores` integer NOT NULL,
	`memory_gb` integer NOT NULL,
	`disk_gb` integer NOT NULL,
	`architecture` text NOT NULL,
	`raw` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`code` text PRIMARY KEY NOT NULL,
	`api_name` text NOT NULL,
	`city` text NOT NULL,
	`country` text NOT NULL,
	`network_zone` text NOT NULL,
	`raw` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `locations_api_name_unique` ON `locations` (`api_name`);
--> statement-breakpoint
CREATE TABLE `availability_current` (
	`server_type_code` text NOT NULL,
	`location_code` text NOT NULL,
	`observed_at` text NOT NULL,
	`base_status` text NOT NULL,
	`display_status` text NOT NULL,
	`api_available` integer,
	`api_recommended` integer,
	PRIMARY KEY(`server_type_code`, `location_code`),
	FOREIGN KEY (`server_type_code`) REFERENCES `server_types`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`location_code`) REFERENCES `locations`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `daily_availability_state` (
	`date_utc` text NOT NULL,
	`server_type_code` text NOT NULL,
	`location_code` text NOT NULL,
	`saw_available` integer DEFAULT false NOT NULL,
	`saw_sold_out` integer DEFAULT false NOT NULL,
	`poll_count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`date_utc`, `server_type_code`, `location_code`),
	FOREIGN KEY (`server_type_code`) REFERENCES `server_types`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`location_code`) REFERENCES `locations`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stock_events` (
	`id` text PRIMARY KEY NOT NULL,
	`observed_at` text NOT NULL,
	`server_type_code` text NOT NULL,
	`location_code` text NOT NULL,
	`base_status` text NOT NULL,
	`prev_status` text,
	`previous_sold_out_at` text
);
--> statement-breakpoint
CREATE INDEX `stock_events_observed_at_idx` ON `stock_events` (`observed_at`);
--> statement-breakpoint
CREATE INDEX `stock_events_cell_observed_at_idx` ON `stock_events` (`server_type_code`,`location_code`,`observed_at`);
--> statement-breakpoint
CREATE TABLE `poll_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`status` text NOT NULL,
	`http_status` integer,
	`error_message` text
);
--> statement-breakpoint
CREATE TABLE `marketing_dispatch_sends` (
	`dispatch_id` text PRIMARY KEY NOT NULL,
	`event_state` text NOT NULL,
	`scope` text NOT NULL,
	`status` text NOT NULL,
	`recipient_count` integer DEFAULT 0 NOT NULL,
	`resend_email_ids` text DEFAULT '[]' NOT NULL,
	`sent_at` text,
	`error_message` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
