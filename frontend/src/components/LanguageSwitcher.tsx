"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocale } from "@/actions/locale";
import { LOCALES } from "@/i18n/config";

export default function LanguageSwitcher() {
  const current = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(locale: string) {
    if (locale === current) return;
    startTransition(async () => {
      await setLocale(locale);
      router.refresh();
    });
  }

  return (
    <div
      role="group"
      aria-label="Language"
      className="flex items-center rounded-full bg-white p-1 text-xs font-medium shadow-sm shadow-cocoa/5"
    >
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => choose(locale)}
          aria-pressed={locale === current}
          disabled={pending}
          className={`rounded-full px-2.5 py-2 uppercase transition-colors ${
            locale === current ? "bg-rose-dark text-white" : "text-cocoa/70 hover:text-rose-dark"
          }`}
        >
          {locale}
        </button>
      ))}
    </div>
  );
}