import { QueryClient } from "@tanstack/react-query";
import { POLL_INTERVAL_MS } from "./cadence";

export const AVAILABILITY_QUERY_KEY = ["availability"] as const;

export function createAvailabilityQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: POLL_INTERVAL_MS,
      },
    },
  });
}
