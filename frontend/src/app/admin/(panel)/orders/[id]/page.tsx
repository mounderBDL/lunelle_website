import type { Metadata } from "next";
import OrderDetailView from "@/components/admin/OrderDetailView";

export const metadata: Metadata = { title: "Order" };

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderDetailView id={id} />;
}