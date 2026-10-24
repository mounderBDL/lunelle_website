import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "./config";

type Tree = { [key: string]: string | Tree };

/** Deep merge: texts in `extra` are added to, or replace, the ones in `base`. */
function merge(base: Tree, extra: Tree): Tree {
  const out: Tree = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    const current = out[key];
    out[key] =
      typeof value === "object" && typeof current === "object" ? merge(current, value) : value;
  }
  return out;
}

export default getRequestConfig(async () => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(value) ? value : DEFAULT_LOCALE;
  const [shop, stock, admin, catalog] = await Promise.all([
    import(`../../messages/${locale}.json`),
    import(`../../messages/stock.${locale}.json`),
    import(`../../messages/admin.${locale}.json`),
    import(`../../messages/admin.catalog.${locale}.json`),
  ]);
  return {
    locale,
    messages: {
      ...merge(shop.default as Tree, stock.default as Tree),
      admin: merge(admin.default as Tree, catalog.default as Tree),
    },
  };
});