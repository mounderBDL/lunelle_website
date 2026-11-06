"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReviewShot } from "@/lib/api/types";
import { imageUrlOrNull } from "@/lib/format";
import { prefersReducedMotion } from "@/lib/motion";

type Shot = ReviewShot & { src: string };

const MAX_DOTS = 12; // more screenshots than this: a "3 / 24" counter replaces the dots

/**
 * A carousel: the centred screenshot is large and its neighbours peek in at the sides, smaller and faded.
 * Swipe on a phone; arrows, dots and the trackpad on a computer. Tapping the centred one opens it full screen.
 */
export default function ReviewsWall({ reviews }: { reviews: ReviewShot[] }) {
  const t = useTranslations("reviews");
  const dialog = useRef<HTMLDialogElement>(null);
  const touchX = useRef<number | null>(null);
  const [index, setIndex] = useState<number | null>(null);

  // ── carousel ──
  const track = useRef<HTMLUListElement>(null);
  const slides = useRef<(HTMLLIElement | null)[]>([]);
  const frame = useRef(0);
  const [active, setActive] = useState(0);

  const shots: Shot[] = reviews.flatMap((r) => {
    const src = imageUrlOrNull(r.url);
    return src ? [{ ...r, src }] : [];
  });
  const open = index !== null;
  const current = index !== null ? (shots[index] ?? null) : null;

  // the native <dialog> traps the focus, closes on Escape and keeps the page behind inert
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  // the page behind does not scroll while a screenshot is open
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = previous;
    };
  }, [open]);

  /** Sizes every slide by its distance from the centre (--d: 0 in the middle, 1 or more at the sides). Returns the middle one. */
  function paint(): number {
    const el = track.current;
    if (!el) return 0;
    const centre = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDistance = Infinity;
    const first = slides.current[0];
    const second = slides.current[1];
    const step = first && second ? second.offsetLeft - first.offsetLeft : (first?.offsetWidth ?? 1) + 16;
    slides.current.forEach((slide, i) => {
      if (!slide) return;
      const distance = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - centre);
      slide.style.setProperty("--d", Math.min(1, distance / step).toFixed(3));
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    });
    return best;
  }

  function onTrackScroll() {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      setActive(paint());
    });
  }

  useLayoutEffect(() => {
    paint();
    const onResize = () => {
      paint();
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [shots.length]);

  function scrollToSlide(i: number) {
    const el = track.current;
    const slide = slides.current[i];
    if (!el || !slide) return;
    el.scrollTo({
      left: slide.offsetLeft + slide.offsetWidth / 2 - el.clientWidth / 2,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }

  function step(delta: number) {
    const target = Math.min(shots.length - 1, Math.max(0, active + delta));
    scrollToSlide(target);
  }

  function go(delta: number) {
    setIndex((i) => (i === null || shots.length === 0 ? null : (i + delta + shots.length) % shots.length));
  }

  const round =
    "absolute z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/30 focus-visible:outline-2 focus-visible:outline-white";

  return (
    <>
      <div data-sc="rise" className="relative">
        <ul
          ref={track}
          onScroll={onTrackScroll}
          className="relative flex snap-x snap-mandatory gap-[5vw] overflow-x-auto px-[18vw] py-6 [scrollbar-width:none] sm:gap-6 sm:px-[calc(50%_-_9rem)] lg:gap-10 lg:px-[calc(50%_-_10.5rem)] [&::-webkit-scrollbar]:hidden"
        >
          {shots.map((shot, i) => (
            <li
              key={shot.id}
              ref={(el) => {
                slides.current[i] = el;
              }}
              className="w-[54vw] shrink-0 snap-center sm:w-60 lg:w-64"
            >
              <button
                type="button"
                onClick={() => (i === active ? setIndex(i) : scrollToSlide(i))}
                aria-label={i === active ? t("open", { number: i + 1 }) : t("show", { number: i + 1 })}
                style={{
                  transform: "scale(calc(1 - var(--d, 1) * 0.1))",
                  opacity: "calc(1 - var(--d, 1) * 0.5)",
                }}
                className="relative block aspect-9/16 w-full cursor-pointer overflow-hidden rounded-3xl bg-white shadow-[0_26px_50px_-28px_rgba(154,85,96,0.65)] ring-1 ring-rose/15"
              >
                <Image
                  src={shot.src}
                  alt={t("alt", { number: i + 1 })}
                  fill
                  sizes="(min-width: 1024px) 16rem, (min-width: 640px) 15rem, 54vw"
                  className="object-contain"
                />
              </button>
            </li>
          ))}
        </ul>

        {shots.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              disabled={active === 0}
              aria-label={t("previous")}
              className="absolute left-0 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-rose-dark shadow-md ring-1 ring-rose/15 transition hover:bg-white disabled:opacity-0 lg:flex"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              disabled={active === shots.length - 1}
              aria-label={t("next")}
              className="absolute right-0 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-rose-dark shadow-md ring-1 ring-rose/15 transition hover:bg-white disabled:opacity-0 lg:flex"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </>
        )}

        {shots.length > 1 &&
          (shots.length <= MAX_DOTS ? (
            <div className="mt-2 flex items-center justify-center gap-2" role="group" aria-label={t("title")}>
              {shots.map((shot, i) => (
                <button
                  key={shot.id}
                  type="button"
                  onClick={() => scrollToSlide(i)}
                  aria-label={t("show", { number: i + 1 })}
                  aria-current={i === active}
                  className={`rounded-full transition-all duration-300 ${
                    i === active ? "h-3 w-3 bg-rose-dark" : "h-2 w-2 bg-rose/30"
                  }`}
                />
              ))}
            </div>
          ) : (
            <p className="mt-2 text-center text-sm text-cocoa/60" aria-live="polite">
              {t("counter", { current: active + 1, total: shots.length })}
            </p>
          ))}
      </div>

      <dialog
        ref={dialog}
        className="review-lightbox"
        aria-label={t("title")}
        onClose={() => setIndex(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") go(-1);
          if (e.key === "ArrowRight") go(1);
        }}
      >
        {current && index !== null && (
          <div
            className="relative flex h-full w-full items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIndex(null); // the dimmed area
            }}
            onTouchStart={(e) => {
              touchX.current = e.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(e) => {
              const start = touchX.current;
              touchX.current = null;
              const end = e.changedTouches[0]?.clientX;
              if (start === null || end === undefined || Math.abs(end - start) < 50) return;
              go(end < start ? 1 : -1);
            }}
          >
            <button type="button" onClick={() => setIndex(null)} aria-label={t("close")} className={`${round} right-4 top-4`}>
              <X className="h-5 w-5" aria-hidden />
            </button>

            {shots.length > 1 && (
              <>
                <button type="button" onClick={() => go(-1)} aria-label={t("previous")} className={`${round} left-3 top-1/2 -translate-y-1/2`}>
                  <ChevronLeft className="h-6 w-6" aria-hidden />
                </button>
                <button type="button" onClick={() => go(1)} aria-label={t("next")} className={`${round} right-3 top-1/2 -translate-y-1/2`}>
                  <ChevronRight className="h-6 w-6" aria-hidden />
                </button>
              </>
            )}

            <Image
              key={current.id}
              src={current.src}
              alt={t("alt", { number: index + 1 })}
              width={current.width > 0 ? current.width : 900}
              height={current.height > 0 ? current.height : 1200}
              sizes="(min-width: 768px) 700px, 92vw"
              className="h-auto max-h-[84dvh] w-auto max-w-[88vw] rounded-2xl bg-white object-contain shadow-2xl"
            />

            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-sm backdrop-blur">
              {t("counter", { current: index + 1, total: shots.length })}
            </p>
          </div>
        )}
      </dialog>
    </>
  );
}