import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PolicyPage from "@/components/PolicyPage";
import { POLICIES_REVIEWED } from "@/lib/policies";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("policies.pages.delivery");
  return { title: t("title"), robots: POLICIES_REVIEWED ? undefined : { index: false, follow: true } };
}

export default function DeliveryReturnsPage() {
  return <PolicyPage page="delivery" />;
}