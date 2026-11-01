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

const mergeAll = (...trees: Tree[]) => trees.reduce((acc, tree) => merge(acc, tree));

/** Some files hold shop texts and, under "admin", studio texts: they are separated here. */
function split(tree: Tree): { shop: Tree; admin: Tree } {
  const { admin, ...shop } = tree;
  return { shop, admin: typeof admin === "object" ? admin : {} };
}

export default getRequestConfig(async () => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(value) ? value : DEFAULT_LOCALE;
  const [shop, stock, admin, catalog, setup, extra, stats, ui, home] = await Promise.all([
    import(`../../messages/${locale}.json`),
    import(`../../messages/stock.${locale}.json`),
    import(`../../messages/admin.${locale}.json`),
    import(`../../messages/admin.catalog.${locale}.json`),
    import(`../../messages/admin.setup.${locale}.json`),
    import(`../../messages/extra.${locale}.json`),
    import(`../../messages/admin.stats.${locale}.json`),
    import(`../../messages/ui.${locale}.json`),
    import(`../../messages/home.${locale}.json`),
  ]);
  const fromExtra = split(extra.default as Tree);
  const fromHome = split(home.default as Tree); // loaded last: its texts win

  return {
    locale,
    messages: {
      ...mergeAll(shop.default as Tree, stock.default as Tree, fromExtra.shop, ui.default as Tree, fromHome.shop),
      admin: mergeAll(
        admin.default as Tree,
        catalog.default as Tree,
        setup.default as Tree,
        fromExtra.admin,
        stats.default as Tree,
        fromHome.admin,
      ),
    },
  };
});