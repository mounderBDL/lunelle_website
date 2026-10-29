import type { DeliveryMethod, Localized, OrderStatus } from "@/lib/api/types";
import type { StatsOverview } from "./types";

export type Funnel = {
  byStatus: Record<OrderStatus, number>;
  created: number;
  confirmationRate: number;
  cancellationRate: number;
  returnRate: number;
};

export type StatsOverviewFull = StatsOverview & { funnel: Funnel };

export type SeriesPoint = {
  date: string; // YYYY-MM-DD: the start of the day, week or month
  revenue: number;
  profit: number;
  deliveredOrders: number;
  createdOrders: number;
};

export type Timeseries = {
  from: string;
  to: string;
  granularity: "day" | "week" | "month";
  points: SeriesPoint[];
};

export type CategoryStat = { name: Localized; units: number; revenue: number; profit: number };
export type ProductStat = { name: Localized; units: number; revenue: number; profit: number };
export type WilayaStat = { wilaya: string; orders: number; revenue: number };
export type DeliveryTypeStat = { method: DeliveryMethod; orders: number; revenue: number; deliveryFees: number };

export type Breakdowns = {
  from: string;
  to: string;
  categories: CategoryStat[];
  topProducts: ProductStat[];
  topPacks: ProductStat[];
  wilayas: WilayaStat[];
  deliveryTypes: DeliveryTypeStat[];
};