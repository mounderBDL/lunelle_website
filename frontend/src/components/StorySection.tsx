import { Phone, Truck, Wallet } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import StoryBouquet from "./art/StoryBouquet";
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
        {/* a vintage bouquet: it drifts while the section crosses the screen, and sways gently */}
        <div aria-hidden className="story-art relative mx-auto w-full max-w-xs sm:max-w-sm">
          <span className="story-halo absolute inset-6 rounded-full bg-amber-soft/70 blur-3xl" />
          <StoryBouquet className="relative h-auto w-full drop-shadow-[0_24px_30px_rgba(125,92,61,0.25)]" />
          <span className="absolute bottom-[3%] left-1/2 -translate-x-1/2 rounded-sm bg-[#fbf3e3] px-4 py-1.5 ring-1 ring-gold/50">
            <Image src="/brand/logo.png" alt="" width={240} height={90} className="h-auto w-24 mix-blend-multiply sm:w-28" />
          </span>
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