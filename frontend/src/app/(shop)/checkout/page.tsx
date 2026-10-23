import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import CheckoutForm from "@/components/CheckoutForm";
import { loadDeliveryWilayas } from "@/lib/api/catalog";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("checkout");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function CheckoutPage() {
  const [t, wilayas] = await Promise.all([getTranslations("checkout"), loadDeliveryWilayas()]);
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-center text-5xl">{t("title")}</h1>
      <CheckoutForm wilayas={wilayas} />
    </div>
  );
}