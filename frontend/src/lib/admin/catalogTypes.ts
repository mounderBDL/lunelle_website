import type { Localized } from "@/lib/api/types";

export type AdminCategory = {
  id: string;
  slug: string;
  name: Localized;
  description: Localized;
  imageUrl: string | null;
  sortOrder: number;
  active: boolean;
};

export type AdminVariant = {
  id: string;
  label: string;
  sku: string | null;
  price: number;
  finalPrice: number;
  costPrice: number | null;
  margin: number | null;
  stock: number;
  inStock: boolean;
  active: boolean;
  sortOrder: number;
};

export type AdminDiscount = {
  active: boolean;
  effective: boolean;
  type: "PERCENT" | "FIXED" | null;
  value: number | null;
  startsAt: string | null;
  endsAt: string | null;
};

export type AdminProduct = {
  id: string;
  slug: string;
  categoryId: string;
  categoryName: Localized;
  name: Localized;
  description: Localized;
  scentNotes: Localized;
  badge: string | null;
  active: boolean;
  featured: boolean;
  sortOrder: number;
  archived: boolean;
  discount: AdminDiscount;
  inStock: boolean;
  variants: AdminVariant[];
  images: { id: string; url: string }[];
  createdAt: string;
};

export type StockMovement = {
  id: string;
  delta: number;
  stockAfter: number;
  reason: "INITIAL" | "RESTOCK" | "ADJUSTMENT" | "ORDER_PLACED" | "ORDER_EDITED" | "ORDER_RELEASED";
  orderId: string | null;
  note: string | null;
  createdAt: string;
};