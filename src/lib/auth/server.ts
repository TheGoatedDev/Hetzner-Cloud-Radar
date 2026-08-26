import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";
import { getDb } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { sendDispatch } from "@/lib/email/send";
import { SITE_URL } from "@/lib/site";

function magicLinkHtml(url: string) {
  return `<!doctype html>
<html lang="en"><body style="font-family:ui-monospace,monospace;color:#1a1a1a">
<p>Sign in to Hetzner Cloud Radar Market.</p>
<p><a href="${url}">Open magic link</a></p>
<p style="color:#666;font-size:12px">Expires in 5 minutes. If you did not request this, ignore.</p>
</body></html>`;
}

async function authBuilder() {
  const db = await getDb();
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not set");

  return betterAuth({
    baseURL: process.env.BETTER_AUTH_URL ?? SITE_URL,
    secret,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),
    emailAndPassword: { enabled: false },
    plugins: [
      magicLink({
        expiresIn: 60 * 5,
        storeToken: "hashed",
        sendMagicLink: async ({ email, url }) => {
          await sendDispatch({
            to: email,
            subject: "Sign in · Hetzner Cloud Radar",
            html: magicLinkHtml(url),
          });
        },
      }),
      nextCookies(),
    ],
  });
}

let authInstance: Awaited<ReturnType<typeof authBuilder>> | null = null;

export async function initAuth() {
  if (!authInstance) {
    authInstance = await authBuilder();
  }
  return authInstance;
}

export type Auth = Awaited<ReturnType<typeof initAuth>>;
