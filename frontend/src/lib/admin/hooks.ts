"use client";

import { useQuery } from "@tanstack/react-query";
import { adminFetch } from "./api";
import type { OrderCounts } from "./types";

/** Order counts per status. Shared by the shell, the home page and the orders list; refreshed every 20 s. */
export function useOrderCounts() {
  return useQuery({
    queryKey: ["orders", "counts"],
    queryFn: () => adminFetch<OrderCounts>("/api/admin/orders/counts"),
    refetchInterval: 20_000,
    refetchIntervalInBackground: true,
  });
}