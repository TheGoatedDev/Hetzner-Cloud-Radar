function must(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export function getHetznerEnv() {
  return { HETZNER_API_TOKEN: must("HETZNER_API_TOKEN") };
}

export function getResendEnv() {
  return {
    RESEND_API_KEY: must("RESEND_API_KEY"),
    RESEND_FROM_EMAIL:
      process.env.RESEND_FROM_EMAIL ?? "dispatches@hetzner.thegoated.dev",
    RESEND_MARKETING_SEGMENT_ID: process.env.RESEND_MARKETING_SEGMENT_ID,
  };
}

export function getUnsubscribeEnv() {
  return { UNSUBSCRIBE_SECRET: must("UNSUBSCRIBE_SECRET") };
}

export function getDiscordEnv() {
  return {
    DISCORD_UNSUBSCRIBE_FEEDBACK_WEBHOOK_URL:
      process.env.DISCORD_UNSUBSCRIBE_FEEDBACK_WEBHOOK_URL,
  };
}

export function getTurnstileEnv() {
  return {
    TURNSTILE_SECRET_KEY: must("TURNSTILE_SECRET_KEY"),
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: must("NEXT_PUBLIC_TURNSTILE_SITE_KEY"),
  };
}

export function getRedditEnv() {
  return {
    REDDIT_CLIENT_ID: process.env.REDDIT_CLIENT_ID,
    REDDIT_CLIENT_SECRET: process.env.REDDIT_CLIENT_SECRET,
    REDDIT_USER_AGENT:
      process.env.REDDIT_USER_AGENT ??
      "hetzner-cloud-radar/0.1 (transfer index)",
  };
}
