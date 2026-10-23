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
  problem: "UNAVAILABLE" | "OUT_OF_STOCK" | null;
};

export type QuoteDto = {
  lines: QuoteLine[];
  subtotal: number;
  deliveryFee: number | null;
  total: number | null;
  ok: boolean;
};