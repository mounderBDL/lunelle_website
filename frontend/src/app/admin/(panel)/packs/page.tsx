import type { Metadata } from "next";
import PacksView from "@/components/admin/PacksView";

export const metadata: Metadata = { title: "Packs" };

export default function AdminPacksPage() {
  return <PacksView />;
}