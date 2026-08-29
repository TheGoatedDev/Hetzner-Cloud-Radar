CREATE TABLE `daily_supply_by_family` (
	`date_utc` text NOT NULL,
	`family` text NOT NULL,
	`available` integer DEFAULT 0 NOT NULL,
	`limited` integer DEFAULT 0 NOT NULL,
	`sold_out` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`date_utc`, `family`)
);
--> statement-breakpoint
INSERT INTO `daily_supply_by_family` (`date_utc`, `family`, `available`, `limited`, `sold_out`)
SELECT
	`daily_availability_state`.`date_utc`,
	`server_types`.`family`,
	sum(case when `daily_availability_state`.`saw_available` and not `daily_availability_state`.`saw_sold_out` then 1 else 0 end),
	sum(case when `daily_availability_state`.`saw_available` and `daily_availability_state`.`saw_sold_out` then 1 else 0 end),
	sum(case when `daily_availability_state`.`saw_sold_out` and not `daily_availability_state`.`saw_available` then 1 else 0 end)
FROM `daily_availability_state`
INNER JOIN `server_types` ON `daily_availability_state`.`server_type_code` = `server_types`.`code`
GROUP BY `daily_availability_state`.`date_utc`, `server_types`.`family`;
