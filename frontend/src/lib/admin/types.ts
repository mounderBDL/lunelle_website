import type { DeliveryMethod, Localized, OrderStatus } from "@/lib/api/types";

export type AdminMe = { id: string; email: string; name: string };

export type Page<T> = { items: T[]; page: number; size: number; totalElements: number; totalPages: number };

export type OrderListItem = {
  id: string;
  code: string;
  status: OrderStatus;
  createdAt: string;
  customerName: string;
  phone: string;
  deliveryMethod: DeliveryMethod;
  wilayaName: string | null;
  communeName: string | null;
  itemCount: number;
  total: number;
};

export type OrderCounts = Record<OrderStatus, number>;

export type PeriodTotals = {
  revenue: number;
  deliveryFees: number;
  deliveredOrders: number;
  averageOrderValue: number;
  cost: number;
  profit: number;
  marginPercent: number;
  uncostedRevenue: number;
};

export type PipelineEntry = { orders: number; amount: number };

export type StatsOverview = {
  from: string;
  to: string;
  current: PeriodTotals;
  previousFrom: string;
  previousTo: string;
  previous: PeriodTotals;
  pipeline: { confirmed: PipelineEntry; shipped: PipelineEntry };
};

export type LowStockItem = {
  variantId: string;
  productId: string;
  productName: Localized;
  variantLabel: string;
  stock: number;
  outOfStock: boolean;
};