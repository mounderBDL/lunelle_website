import { Phone, Truck, Wallet } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import ScrollScrub from "./ScrollScrub";
import ScrollWords from "./ScrollWords";

const PROMISES = [
  { key: "call", icon: Phone },
  { key: "delivery", icon: Truck },
  { key: "payment", icon: Wallet },
] as const;

export default async function StorySection() {
  const t = await getTranslations("story");

  return (
    <section id="story" className="story-section relative scroll-mt-20 overflow-hidden py-20">
      <ScrollScrub />
      <div aria-hidden className="absolute inset-0 -z-10 bg-linear-to-b from-cream via-blush/40 to-cream" />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20">
        {/* the moon: it drifts, its rings turn and its phase fills while the section crosses the screen */}
        <div
          aria-hidden
          className="story-art relative mx-auto flex aspect-square w-full max-w-xs items-center justify-center sm:max-w-sm"
        >
          <span className="story-halo absolute inset-8 rounded-full bg-petal-300/60 blur-3xl" />

          <span className="story-ring-a absolute inset-0 rounded-full border border-petal-300/70">
            <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-petal-500" />
            <span className="absolute bottom-[12%] left-[6%] h-2 w-2 rounded-full bg-white" />
          </span>
          <span className="story-ring-b absolute inset-7 rounded-full border border-dashed border-petal-300/60">
            <span className="absolute -right-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-lavender-dark/50" />
          </span>

          <div className="absolute inset-14 overflow-hidden rounded-full bg-[radial-gradient(circle_at_30%_25%,#ffffff,var(--color-petal-50)_55%,var(--color-petal-100))] shadow-[0_30px_70px_-24px_rgba(185,90,112,0.5),inset_0_-10px_30px_rgba(239,184,193,0.45)]">
            <span className="story-shade absolute inset-0 rounded-full bg-petal-300/60" />
          </div>

          <Image
            src="/brand/logo.png"
            alt=""
            width={240}
            height={90}
            className="relative h-auto w-[44%] mix-blend-multiply"
          />
        </div>

        {/* the words */}
        <div>
          <p data-sc="rise" className="text-xs uppercase tracking-[0.3em] text-rose-dark">
            {t("eyebrow")}
          </p>
          <h2 className="mt-4 text-4xl leading-tight sm:text-5xl">
            <ScrollWords text={t("title")} accentLast />
          </h2>

          <div className="mt-6 space-y-4 text-lg text-cocoa/80">
            <p data-sc="rise">{t("p1")}</p>
            <p data-sc="rise">{t("p2")}</p>
            <p data-sc="rise">{t("p3")}</p>
          </div>

          <p data-sc="rise" className="mt-6 font-display text-2xl italic text-rose-dark">
            {t("signature")}
          </p>

          <ul data-sc="thread" className="story-promises relative mt-8 space-y-6">
            {PROMISES.map(({ key, icon: Icon }) => (
              <li key={key} data-sc="slide" className="flex items-start gap-4">
                <span className="story-icon relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blush text-rose-dark">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold">{t(`promises.${key}.title`)}</span>
                  <span className="block text-sm text-cocoa/70">{t(`promises.${key}.text`)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}