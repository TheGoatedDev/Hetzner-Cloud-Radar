import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

let cachedDatabaseEnv: ReturnType<typeof createDatabaseEnv> | undefined;
let cachedCronEnv: ReturnType<typeof createCronEnv> | undefined;
let cachedHetznerEnv: ReturnType<typeof createHetznerEnv> | undefined;
let cachedResendEnv: ReturnType<typeof createResendEnv> | undefined;
let cachedUnsubscribeEnv: ReturnType<typeof createUnsubscribeEnv> | undefined;

const commonOptions = {
  emptyStringAsUndefined: true,
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
};

function createDatabaseEnv() {
  return createEnv({
    server: {
      DATABASE_URL: z.url(),
    },
    runtimeEnv: {
      DATABASE_URL: process.env.DATABASE_URL,
    },
    ...commonOptions,
  });
}

function createCronEnv() {
  return createEnv({
    server: {
      CRON_SECRET: z.string().min(1),
    },
    runtimeEnv: {
      CRON_SECRET: process.env.CRON_SECRET,
    },
    ...commonOptions,
  });
}

function createHetznerEnv() {
  return createEnv({
    server: {
      HETZNER_API_TOKEN: z.string().min(1),
    },
    runtimeEnv: {
      HETZNER_API_TOKEN: process.env.HETZNER_API_TOKEN,
    },
    ...commonOptions,
  });
}

function createResendEnv() {
  return createEnv({
    server: {
      RESEND_API_KEY: z.string().min(1),
      RESEND_FROM_EMAIL: z.email().default("dispatches@hetzner.thegoated.dev"),
      RESEND_MARKETING_SEGMENT_ID: z.string().min(1).optional(),
      RESEND_SOLD_OUT_TOPIC_ID: z.string().min(1).optional(),
      RESEND_RESTOCK_TOPIC_ID: z.string().min(1).optional(),
    },
    runtimeEnv: {
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
      RESEND_MARKETING_SEGMENT_ID: process.env.RESEND_MARKETING_SEGMENT_ID,
      RESEND_SOLD_OUT_TOPIC_ID: process.env.RESEND_SOLD_OUT_TOPIC_ID,
      RESEND_RESTOCK_TOPIC_ID: process.env.RESEND_RESTOCK_TOPIC_ID,
    },
    ...commonOptions,
  });
}

function createUnsubscribeEnv() {
  return createEnv({
    server: {
      UNSUBSCRIBE_SECRET: z.string().min(32),
    },
    runtimeEnv: {
      UNSUBSCRIBE_SECRET: process.env.UNSUBSCRIBE_SECRET,
    },
    ...commonOptions,
  });
}

export function getDatabaseEnv() {
  cachedDatabaseEnv ??= createDatabaseEnv();

  return cachedDatabaseEnv;
}

export function getCronEnv() {
  cachedCronEnv ??= createCronEnv();

  return cachedCronEnv;
}

export function getHetznerEnv() {
  cachedHetznerEnv ??= createHetznerEnv();

  return cachedHetznerEnv;
}

export function getResendEnv() {
  cachedResendEnv ??= createResendEnv();

  return cachedResendEnv;
}

export function getUnsubscribeEnv() {
  cachedUnsubscribeEnv ??= createUnsubscribeEnv();

  return cachedUnsubscribeEnv;
}
