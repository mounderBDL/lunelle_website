import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("common");
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-5xl">{t("notFoundTitle")}</h1>
      <p className="mt-4 text-cocoa/70">{t("notFoundText")}</p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-full bg-rose-dark px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-cocoa"
      >
        {t("backHome")}
      </Link>
    </div>
  );
}