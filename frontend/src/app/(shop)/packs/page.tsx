import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import PackCard from "@/components/PackCard";
import { loadPacks } from "@/lib/api/catalog";
import { formatMoney } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("packs");
  return { title: t("title") };
}

export default async function PacksPage() {
  const [t, tp, locale, packs] = await Promise.all([
    getTranslations("packs"),
    getTranslations("product"),
    getLocale(),
    loadPacks(),
  ]);
  const labels = { outOfStock: tp("outOfStock"), pack: tp("pack") };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="text-5xl">{t("title")}</h1>
        <p className="mt-4 text-cocoa/75">{t("subtitle")}</p>
      </header>

      {packs.length === 0 ? (
        <p className="mt-16 text-center font-display text-2xl text-cocoa/70">{t("empty")}</p>
      ) : (
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {packs.map((pack) => (
            <PackCard
              key={pack.id}
              pack={pack}
              locale={locale}
              labels={labels}
              saveLabel={pack.saving > 0 ? t("save", { amount: formatMoney(pack.saving, locale) }) : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}