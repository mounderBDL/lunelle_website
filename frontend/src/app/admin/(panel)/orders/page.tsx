import type { Metadata } from "next";
import { Suspense } from "react";
import OrdersView from "@/components/admin/OrdersView";

export const metadata: Metadata = { title: "Orders" };

export default function AdminOrdersPage() {
  return (
    <Suspense>
      <OrdersView />
    </Suspense>
  );
}