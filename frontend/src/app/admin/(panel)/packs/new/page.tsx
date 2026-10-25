import type { Metadata } from "next";
import PackCreateView from "@/components/admin/PackCreateView";

export const metadata: Metadata = { title: "New pack" };

export default function AdminNewPackPage() {
  return <PackCreateView />;
}