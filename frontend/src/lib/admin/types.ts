import type { DeliveryMethod, Localized, OrderStatus } from "@/lib/api/types";

export type AdminRole = "OWNER" | "STAFF";

export type AdminMe = { id: string; email: string; name: string; role: AdminRole };

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  active: boolean;
  createdAt: string;
};

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
  expenses: number;
  netProfit: number;
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

// ───── order detail ─────

export type OrderItemDetail = {
  id: string;
  type: "VARIANT" | "PACK";
  refId: string | null; // the size or pack this line was bought from (null if it no longer exists)
  name: Localized;
  variantLabel: string | null;
  originalUnitPrice: number;
  unitPrice: number;
  unitCost: number | null;
  quantity: number;
  lineTotal: number;
  components: { name: Localized; variantLabel: string; quantity: number }[];
};

export type HistoryEntry = {
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  note: string | null;
  adminId: string | null;
  createdAt: string;
};

export type OrderDetail = {
  id: string;
  code: string;
  status: OrderStatus;
  createdAt: string;
  confirmedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  customerName: string;
  phone: string;
  customerNote: string | null;
  locale: string;
  deliveryMethod: DeliveryMethod;
  wilayaId: number | null;
  wilayaName: string | null;
  communeId: number | null;
  communeName: string | null;
  address: string | null;
  officeId: number | null;
  deliveryFee: number;
  handoverPlace: string | null;
  handoverAt: string | null;
  trackingNumber: string | null;
  subtotal: number;
  total: number;
  cost: number | null;
  profit: number | null;
  adminNote: string | null;
  editable: boolean;
  allowedStatuses: OrderStatus[];
  items: OrderItemDetail[];
  history: HistoryEntry[];
  restock: RestockLine[];
};

// ───── used by the order editor ─────

export type AdminProductLite = {
  id: string;
  name: Localized;
  active: boolean;
  archived: boolean;
  variants: { id: string; label: string; finalPrice: number; stock: number; inStock: boolean; active: boolean }[];
};

export type AdminPackLite = {
  id: string;
  name: Localized;
  price: number;
  active: boolean;
  archived: boolean;
  inStock: boolean;
  availableUnits: number;
};

export type RestockLine = {
    variantId: string;
    name: Localized;
    variantLabel: string;
    ordered: number;
    restocked: number;
    remaining: number;
};