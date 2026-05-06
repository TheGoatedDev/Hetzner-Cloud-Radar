CREATE TABLE "availability_current" (
	"server_type_code" text NOT NULL,
	"location_code" text NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"base_status" text NOT NULL,
	"display_status" text NOT NULL,
	"api_available" boolean,
	"api_recommended" boolean,
	CONSTRAINT "availability_current_server_type_code_location_code_pk" PRIMARY KEY("server_type_code","location_code")
);
--> statement-breakpoint
CREATE TABLE "availability_observations" (
	"id" text PRIMARY KEY NOT NULL,
	"poll_run_id" text NOT NULL,
	"server_type_code" text NOT NULL,
	"location_code" text NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"supported" boolean NOT NULL,
	"api_available" boolean,
	"api_recommended" boolean,
	"base_status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_availability_state" (
	"date_utc" text NOT NULL,
	"server_type_code" text NOT NULL,
	"location_code" text NOT NULL,
	"saw_available" boolean DEFAULT false NOT NULL,
	"saw_sold_out" boolean DEFAULT false NOT NULL,
	"poll_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "daily_availability_state_date_utc_server_type_code_location_code_pk" PRIMARY KEY("date_utc","server_type_code","location_code")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"code" text PRIMARY KEY NOT NULL,
	"api_name" text NOT NULL,
	"city" text NOT NULL,
	"country" text NOT NULL,
	"network_zone" text NOT NULL,
	"raw" jsonb NOT NULL,
	CONSTRAINT "locations_api_name_unique" UNIQUE("api_name")
);
--> statement-breakpoint
CREATE TABLE "poll_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" text NOT NULL,
	"http_status" integer,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "server_types" (
	"code" text PRIMARY KEY NOT NULL,
	"hetzner_id" integer NOT NULL,
	"family" text DEFAULT 'other' NOT NULL,
	"cores" integer NOT NULL,
	"memory_gb" integer NOT NULL,
	"disk_gb" integer NOT NULL,
	"architecture" text NOT NULL,
	"raw" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "availability_current" ADD CONSTRAINT "availability_current_server_type_code_server_types_code_fk" FOREIGN KEY ("server_type_code") REFERENCES "public"."server_types"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_current" ADD CONSTRAINT "availability_current_location_code_locations_code_fk" FOREIGN KEY ("location_code") REFERENCES "public"."locations"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_observations" ADD CONSTRAINT "availability_observations_poll_run_id_poll_runs_id_fk" FOREIGN KEY ("poll_run_id") REFERENCES "public"."poll_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_observations" ADD CONSTRAINT "availability_observations_server_type_code_server_types_code_fk" FOREIGN KEY ("server_type_code") REFERENCES "public"."server_types"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_observations" ADD CONSTRAINT "availability_observations_location_code_locations_code_fk" FOREIGN KEY ("location_code") REFERENCES "public"."locations"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_availability_state" ADD CONSTRAINT "daily_availability_state_server_type_code_server_types_code_fk" FOREIGN KEY ("server_type_code") REFERENCES "public"."server_types"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_availability_state" ADD CONSTRAINT "daily_availability_state_location_code_locations_code_fk" FOREIGN KEY ("location_code") REFERENCES "public"."locations"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "availability_observations_poll_type_location_idx" ON "availability_observations" USING btree ("poll_run_id","server_type_code","location_code");