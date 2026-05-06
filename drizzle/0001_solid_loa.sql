CREATE TABLE "mailing_subscribers" (
	"email" text PRIMARY KEY NOT NULL,
	"wants_sold_out" boolean DEFAULT true NOT NULL,
	"wants_restock" boolean DEFAULT true NOT NULL,
	"resend_contact_id" text,
	"resend_synced_at" timestamp with time zone,
	"resend_error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
