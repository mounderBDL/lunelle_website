import type { Metadata } from "next";
import ProductsView from "@/components/admin/ProductsView";

export const metadata: Metadata = { title: "Products" };

export default function AdminProductsPage() {
  return <ProductsView />;
}