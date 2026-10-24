export type Localized = { en: string | null; fr: string | null };

export type PublicCategory = {
  id: string;
  slug: string;
  name: Localized;
  description: Localized;
  imageUrl: string | null;
};

export type ProductImage = { id: string; url: string };

export type PublicVariant = {
  id: string;
  label: string;
  price: number; // base price (the "old" price when on sale)
  finalPrice: number; // price actually charged
  inStock: boolean;
  maxQuantity: number; // how many can be ordered at most (capped at 10)
};

export type PublicProduct = {
  id: string;
  slug: string;
  categorySlug: string;
  name: Localized;
  description: Localized;
  scentNotes: Localized;
  badge: string | null;
  featured: boolean;
  onSale: boolean;
  inStock: boolean;
  variants: PublicVariant[];
  images: ProductImage[];
};

export type PublicPackItem = {
  productSlug: string;
  productName: Localized;
  variantLabel: string;
  quantity: number;
  imageUrl: string | null;
};

export type PublicPack = {
  id: string;
  slug: string;
  name: Localized;
  description: Localized;
  imageUrl: string | null;
  price: number;
  individualTotal: number;
  saving: number;
  inStock: boolean;
  maxQuantity: number;
  items: PublicPackItem[];
};

export type PublicSettings = {
  store_name: string;
  contact_phone: string;
  instagram_url: string;
};

export type QuoteLine = {
  type: "VARIANT" | "PACK";
  id: string;
  name: Localized;
  variantLabel: string | null;
  imageUrl: string | null;
  originalUnitPrice: number;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  available: number; // how many can still be bought right now (capped at 10)
  problem: "UNAVAILABLE" | "OUT_OF_STOCK" | null;
};

export type QuoteDto = {
  lines: QuoteLine[];
  subtotal: number;
  deliveryFee: number | null;
  total: number | null;
  ok: boolean;
};

// ───── delivery ─────

export type DeliveryMethod = "HAND_TO_HAND" | "HOME" | "STOP_DESK";

export type RateInfo = { fee: number; available: boolean };

export type DeliveryWilaya = {
  id: number;
  name: string;
  active: boolean;
  home: RateInfo;
  stopDesk: RateInfo; // available is false when the wilaya has no Yalidine office
  officeCount: number;
};

export type Commune = { id: number; name: string };

// ───── orders ─────

export type OrderStatus = "NEW" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "NO_ANSWER" | "RETURNED";

export type OrderLine = {
  type: "VARIANT" | "PACK";
  name: Localized;
  variantLabel: string | null;
  originalUnitPrice: number;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  components: { name: Localized; variantLabel: string; quantity: number }[];
};

export type OrderSummary = {
  code: string;
  status: OrderStatus;
  createdAt: string;
  customerName: string;
  phoneMasked: string;
  deliveryMethod: DeliveryMethod;
  wilayaName: string | null;
  communeName: string | null;
  address: string | null; // null in the code + phone lookup
  handoverPlace: string | null;
  handoverAt: string | null;
  trackingNumber: string | null;
  items: OrderLine[];
  subtotal: number;
  deliveryFee: number;
  total: number;
};