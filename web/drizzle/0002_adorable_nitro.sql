CREATE TABLE "marketing_dispatch_sends" (
	"dispatch_id" text PRIMARY KEY NOT NULL,
	"event_state" text NOT NULL,
	"scope" text NOT NULL,
	"status" text NOT NULL,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"resend_email_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sent_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
