DROP TABLE IF EXISTS `market_listings`;
--> statement-breakpoint
DROP TABLE IF EXISTS `session`;
--> statement-breakpoint
DROP TABLE IF EXISTS `account`;
--> statement-breakpoint
DROP TABLE IF EXISTS `verification`;
--> statement-breakpoint
DROP TABLE IF EXISTS `user`;
--> statement-breakpoint
CREATE TABLE `market_listings` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`external_id` text NOT NULL,
	`external_url` text NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`author` text,
	`server_type` text,
	`location_code` text,
	`price_cents` integer,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`source_created_at` text,
	`last_seen_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `market_listings_source_ext_uidx` ON `market_listings` (`source`,`external_id`);
--> statement-breakpoint
CREATE INDEX `market_listings_status_loc_type_idx` ON `market_listings` (`status`,`location_code`,`server_type`);
--> statement-breakpoint
CREATE INDEX `market_listings_source_seen_idx` ON `market_listings` (`source`,`last_seen_at`);
