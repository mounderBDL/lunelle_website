"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import ImagePlaceholder from "./ImagePlaceholder";

type Props = { images: { id: string; url: string }[]; alt: string; inStock: boolean };

const SWIPE_DISTANCE = 48;
const FRAME = "relative aspect-4/5 overflow-hidden rounded-2xl bg-blush/60";
const ROUND_BUTTON =
  "flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-cocoa shadow backdrop-blur transition-colors hover:bg-white";

export default function ProductGallery({ images, alt, inStock }: Props) {
  const t = useTranslations("gallery");
  const count = images.length;

  const [index, setIndex] = useState(0);
  const [previous, setPrevious] = useState(0);
  const follow = useRef<HTMLDivElement>(null);
  const drag = useRef({ id: -1, x: 0, y: 0, dx: 0, dy: 0, moved: false });

  const current = Math.min(index, Math.max(count - 1, 0));

  // the photos follow the finger a little, then settle back
  function settle() {
    const el = follow.current;
    if (!el) return;
    el.style.transition = prefersReducedMotion() ? "none" : "transform 300ms cubic-bezier(0.22, 1, 0.36, 1)";
    el.style.transform = "translate3d(0, 0, 0)";
  }

  function goTo(target: number) {
    if (count < 2) return;
    const next = ((target % count) + count) % count;
    if (next === current) return;
    setPrevious(current);
    setIndex(next);
    settle();
  }

  // ───── swipe (touch, pen and mouse drag) ─────

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (count < 2) return;
    if ((event.target as HTMLElement).closest("button")) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, dy: 0, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (d.id !== event.pointerId) return;
    d.dx = event.clientX - d.x;
    d.dy = event.clientY - d.y;
    if (!d.moved && Math.hypot(d.dx, d.dy) > 6) d.moved = true;
    if (d.moved && Math.abs(d.dx) > Math.abs(d.dy) && follow.current) {
      follow.current.style.transition = "none";
      follow.current.style.transform = `translate3d(${d.dx * 0.25}px, 0, 0)`;
    }
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>, cancelled: boolean) {
    const d = drag.current;
    if (d.id !== event.pointerId) return;
    d.id = -1;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    settle();
    if (!cancelled && d.moved && Math.abs(d.dx) >= SWIPE_DISTANCE && Math.abs(d.dx) > Math.abs(d.dy)) {
      goTo(current + (d.dx < 0 ? 1 : -1));
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(current + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(current - 1);
    }
  }

  // ───── drawing ─────

  if (count === 0) {
    return (
      <div className={FRAME}>
        <ImagePlaceholder />
      </div>
    );
  }

  // only the visible photo and its neighbours are kept in the page
  const near = new Set<number>([
    current,
    Math.min(previous, count - 1),
    (current + 1) % count,
    (current - 1 + count) % count,
  ]);

  return (
    <div>
      <div
        role="group"
        aria-roledescription="carousel"
        aria-label={t("label")}
        tabIndex={count > 1 ? 0 : undefined}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(event) => endDrag(event, false)}
        onPointerCancel={(event) => endDrag(event, true)}
        className={`${FRAME} group touch-pan-y select-none outline-offset-4 ${
          count > 1 ? "cursor-grab active:cursor-grabbing" : ""
        }`}
      >
        <div ref={follow} className="absolute inset-0">
          {images.map((image, i) => {
            if (!near.has(i)) return null;
            const isCurrent = i === current;
            return (
              <div
                key={image.id}
                aria-hidden={!isCurrent}
                className={`absolute inset-0 transition-opacity duration-500 ease-out motion-reduce:transition-none ${
                  isCurrent ? "opacity-100" : "opacity-0"
                }`}
              >
                <Image
                  src={image.url}
                  alt={isCurrent ? alt : ""}
                  fill
                  priority={i === 0}
                  draggable={false}
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className={`object-cover ${inStock ? "" : "opacity-70 grayscale"}`}
                />
              </div>
            );
          })}
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(current - 1)}
              aria-label={t("previous")}
              className={`${ROUND_BUTTON} absolute left-3 top-1/2 z-10 hidden -translate-y-1/2 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 sm:flex`}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => goTo(current + 1)}
              aria-label={t("next")}
              className={`${ROUND_BUTTON} absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 sm:flex`}
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>

            <div className="absolute inset-x-0 bottom-2 z-10 flex justify-center sm:hidden">
              {images.map((image, i) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={t("goTo", { n: i + 1 })}
                  aria-current={i === current}
                  className="flex h-6 w-6 items-center justify-center"
                >
                  <span
                    className={`block rounded-full transition-all ${
                      i === current ? "h-2.5 w-2.5 bg-white shadow" : "h-2 w-2 bg-white/60"
                    }`}
                  />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {t("photo", { current: current + 1, total: count })}
      </p>

      {count > 1 && (
        <ul className="mt-4 hidden justify-center gap-3 sm:flex">
          {images.map((image, i) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-label={t("goTo", { n: i + 1 })}
                aria-current={i === current}
                className={`relative block h-16 w-14 overflow-hidden rounded-lg border-2 transition-opacity ${
                  i === current ? "border-rose-dark" : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <Image src={image.url} alt="" fill sizes="56px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}