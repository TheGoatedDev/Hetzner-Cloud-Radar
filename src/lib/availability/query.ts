import { QueryClient } from "@tanstack/react-query";

export const AVAILABILITY_QUERY_KEY = ["availability"] as const;

export function createAvailabilityQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 15_000,
      },
    },
  });
}
