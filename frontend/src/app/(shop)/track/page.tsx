import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import TrackForm from "@/components/TrackForm";

type Props = { searchParams: Promise<{ code?: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("track");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function TrackPage({ searchParams }: Props) {
  const [{ code }, t] = await Promise.all([searchParams, getTranslations("track")]);
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <header className="text-center">
        <h1 className="text-5xl">{t("title")}</h1>
        <p className="mx-auto mt-4 max-w-xl text-cocoa/75">{t("subtitle")}</p>
      </header>
      <TrackForm initialCode={(code ?? "").slice(0, 30)} />
    </div>
  );
}