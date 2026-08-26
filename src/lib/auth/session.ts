import { headers } from "next/headers";
import { initAuth } from "./server";

export async function getSession() {
  const auth = await initAuth();
  return auth.api.getSession({ headers: await headers() });
}
