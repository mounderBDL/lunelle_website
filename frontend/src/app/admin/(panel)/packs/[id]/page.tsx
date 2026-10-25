import type { Metadata } from "next";
import PackEditView from "@/components/admin/PackEditView";

export const metadata: Metadata = { title: "Pack" };

export default async function AdminPackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PackEditView id={id} />;
}