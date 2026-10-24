import { apiGet, apiGetOrNull } from "./server";
import type {
  DeliveryWilaya,
  OrderSummary,
  PublicCategory,
  PublicPack,
  PublicProduct,
  PublicSettings,
} from "./types";

type ProductQuery = { category?: string; featured?: boolean };

// ───── strict versions: used by pages, so a backend outage shows the error page ─────

export const loadCategories = () => apiGet<PublicCategory[]>("/api/categories");

export function loadProducts(options: ProductQuery = {}) {
  const params = new URLSearchParams();
  if (options.category) params.set("category", options.category);
  if (options.featured !== undefined) params.set("featured", String(options.featured));
  const query = params.toString();
  return apiGet<PublicProduct[]>(`/api/products${query ? `?${query}` : ""}`);
}

export const loadProduct = (slug: string) =>
  apiGetOrNull<PublicProduct>(`/api/products/${encodeURIComponent(slug)}`, 5);

export const loadPacks = () => apiGet<PublicPack[]>("/api/packs");

export const loadPack = (slug: string) =>
  apiGetOrNull<PublicPack>(`/api/packs/${encodeURIComponent(slug)}`, 5);

export const loadDeliveryWilayas = () => apiGet<DeliveryWilaya[]>("/api/delivery/wilayas");

/** Never cached: the status of an order changes. */
export const loadOrder = (token: string) =>
  apiGetOrNull<OrderSummary>(`/api/orders/${encodeURIComponent(token)}`, 0);

// ───── safe versions: used by the header, footer and home page, which must never crash ─────

async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

export const getCategories = () => safe(loadCategories(), []);

export const getProducts = (options: ProductQuery = {}) => safe(loadProducts(options), []);

export const getPacks = () => safe(loadPacks(), []);

export const getSettings = () =>
  safe(apiGet<PublicSettings>("/api/settings"), {
    store_name: "Lunelle",
    contact_phone: "",
    instagram_url: "",
  });