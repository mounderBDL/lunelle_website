import type { Metadata } from "next";
import ProductCreateView from "@/components/admin/ProductCreateView";

export const metadata: Metadata = { title: "New product" };

export default function AdminNewProductPage() {
  return <ProductCreateView />;
}