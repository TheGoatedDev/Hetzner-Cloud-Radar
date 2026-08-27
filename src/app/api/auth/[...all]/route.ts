import { toNextJsHandler } from "better-auth/next-js";
import { initAuth } from "@/lib/auth/server";

async function handler(request: Request) {
  const auth = await initAuth();
  return auth.handler(request);
}

export const { GET, POST, PATCH, PUT, DELETE } = toNextJsHandler(handler);
