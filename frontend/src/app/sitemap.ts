import type { MetadataRoute } from "next";
import { loadCategories, loadPacks, loadProducts } from "@/lib/api/catalog";
import { POLICIES_REVIEWED } from "@/lib/policies";
import { SITE_URL } from "@/lib/site";

// rebuilt at most once an hour, so new products appear without a redeploy
export const revalidate = 3600;

/** A list that cannot be loaded (backend down) counts as empty: the sitemap must never crash. */
const safe = <T,>(promise: Promise<T[]>): Promise<T[]> => promise.catch(() => []);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products, packs] = await Promise.all([
    safe(loadCategories()),
    safe(loadProducts()),
    safe(loadPacks()),
  ]);

  const url = (path: string) => `${SITE_URL}${path}`;
  return [
    { url: url("/"), changeFrequency: "weekly", priority: 1 },
    ...(packs.length > 0 ? [{ url: url("/packs"), changeFrequency: "weekly" as const, priority: 0.7 }] : []),
    ...categories.map((c) => ({ url: url(`/category/${c.slug}`), changeFrequency: "weekly" as const, priority: 0.8 })),
    ...products.map((p) => ({ url: url(`/product/${p.slug}`), changeFrequency: "weekly" as const, priority: 0.9 })),
    ...packs.map((p) => ({ url: url(`/pack/${p.slug}`), changeFrequency: "weekly" as const, priority: 0.8 })),
    // the policy pages stay out until the owner has approved the texts
    ...(POLICIES_REVIEWED
      ? [
          { url: url("/terms"), changeFrequency: "yearly" as const, priority: 0.3 },
          { url: url("/privacy"), changeFrequency: "yearly" as const, priority: 0.3 },
        ]
      : []),
  ];
}