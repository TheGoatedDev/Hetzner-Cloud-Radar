import { createHmac, timingSafeEqual } from "node:crypto";
import { getUnsubscribeEnv } from "@/env";

function hmac(email: string): Buffer {
  const secret = getUnsubscribeEnv().UNSUBSCRIBE_SECRET;

  return createHmac("sha256", secret).update(email.toLowerCase()).digest();
}

export function signEmail(email: string): string {
  return hmac(email).toString("base64url");
}

export function verifyEmailToken(email: string, token: string): boolean {
  if (!email || !token) return false;

  try {
    const expected = hmac(email);
    const provided = Buffer.from(token, "base64url");

    return (
      expected.length === provided.length && timingSafeEqual(expected, provided)
    );
  } catch {
    return false;
  }
}
