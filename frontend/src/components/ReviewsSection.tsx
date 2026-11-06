import { MessageCircleHeart } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReviewShot } from "@/lib/api/types";
import ReviewsWall from "./ReviewsWall";
import ScrollScrub from "./ScrollScrub";
import ScrollWords from "./ScrollWords";

/** Instagram screenshots of kind messages, between "Our story" and the FAQ. Nothing is shown without screenshots. */
export default async function ReviewsSection({ reviews }: { reviews: ReviewShot[] }) {
  if (reviews.length === 0) return null;
  const t = await getTranslations("reviews");

  return (
    <section id="reviews" className="relative scroll-mt-20 py-20">
      <ScrollScrub />
      <div aria-hidden className="absolute inset-0 -z-10 bg-linear-to-b from-cream via-petal-50 to-cream" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-center lg:gap-12">
        <div className="text-center lg:text-left">
          <span
            aria-hidden
            data-sc="rise"
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blush text-rose-dark lg:mx-0"
          >
            <MessageCircleHeart className="h-6 w-6" />
          </span>
          <p data-sc="rise" className="mt-5 text-xs uppercase tracking-[0.3em] text-rose-dark">
            {t("eyebrow")}
          </p>
          <h2 className="mt-4 text-4xl sm:text-5xl">
            <ScrollWords text={t("title")} accentLast />
          </h2>
          <p data-sc="rise" className="mx-auto mt-4 max-w-xl text-cocoa/70 lg:mx-0">
            {t("subtitle")}
          </p>
        </div>

        <div className="mt-8 lg:mt-0">
          <ReviewsWall reviews={reviews} />
        </div>
      </div>
    </section>
  );
}