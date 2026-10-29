import type { Metadata } from "next";
import { Suspense } from "react";
import StatsView from "@/components/admin/StatsView";

export const metadata: Metadata = { title: "Statistics" };

export default function AdminStatsPage() {
  return (
    <Suspense>
      <StatsView />
    </Suspense>
  );
}