import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

let cachedDatabaseEnv: ReturnType<typeof createDatabaseEnv> | undefined;
let cachedCronEnv: ReturnType<typeof createCronEnv> | undefined;
let cachedHetznerEnv: ReturnType<typeof createHetznerEnv> | undefined;

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
