"use client";

import { useTranslations } from "next-intl";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("common");
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-4xl">{t("errorTitle")}</h1>
      <p className="mt-4 text-cocoa/70">{t("errorText")}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 rounded-full bg-rose-dark px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-cocoa"
      >
        {t("tryAgain")}
      </button>
    </div>
  );
}