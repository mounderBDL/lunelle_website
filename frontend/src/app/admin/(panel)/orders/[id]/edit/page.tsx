import type { Metadata } from "next";
import OrderEditView from "@/components/admin/OrderEditView";

export const metadata: Metadata = { title: "Edit order" };

export default async function AdminOrderEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderEditView id={id} />;
}