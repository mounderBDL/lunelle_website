import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import CartView from "@/components/CartView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cart");
  return { title: t("title") };
}

export default async function CartPage() {
  const t = await getTranslations("cart");
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-center text-5xl">{t("title")}</h1>
      <CartView />
    </div>
  );
}