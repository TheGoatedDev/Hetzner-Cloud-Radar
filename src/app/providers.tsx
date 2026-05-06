"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { createAvailabilityQueryClient } from "@/lib/availability/query";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createAvailabilityQueryClient());

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
