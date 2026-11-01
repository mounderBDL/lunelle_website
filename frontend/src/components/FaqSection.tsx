import { Moon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import FaqList from "./FaqList";
import ScrollScrub from "./ScrollScrub";
import ScrollWords from "./ScrollWords";

const QUESTIONS = ["account", "payment", "afterOrder", "delivery", "tracking", "packs", "stock", "contact"] as const;

export default async function FaqSection() {
  const t = await getTranslations("faq");
  const items = QUESTIONS.map((key) => ({ key, q: t(`items.${key}.q`), a: t(`items.${key}.a`) }));

  return (
    <section id="faq" className="scroll-mt-20 bg-parchment/50 py-20">
      <ScrollScrub />
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <span
          aria-hidden
          data-sc="rise"
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blush text-rose-dark"
        >
          <Moon className="h-6 w-6" />
        </span>
        <p data-sc="rise" className="mt-5 text-center text-xs uppercase tracking-[0.3em] text-rose-dark">
          {t("eyebrow")}
        </p>
        <h2 className="mt-4 text-center text-4xl sm:text-5xl">
          <ScrollWords text={t("title")} accentLast />
        </h2>
        <p data-sc="rise" className="mx-auto mt-4 max-w-xl text-center text-cocoa/70">
          {t("subtitle")}
        </p>

        <FaqList items={items} />
      </div>
    </section>
  );
}