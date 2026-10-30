"use client";

import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import cloudinaryLoader from "@/lib/cloudinary-loader";
import { prefersReducedMotion } from "@/lib/motion";
import ImagePlaceholder from "./ImagePlaceholder";

type Props = { images: { id: string; url: string }[]; alt: string; inStock: boolean };
type Transform = { s: number; x: number; y: number };
type Point = { x: number; y: number };
type Mode = "none" | "swipe" | "pan" | "pinch";

const MAX_SCALE = 4;
const TAP_ZOOM = 2.5;
const SWIPE_DISTANCE = 48;
const FRAME = "relative aspect-4/5 overflow-hidden rounded-2xl bg-blush/60";
const ROUND_BUTTON =
  "flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-cocoa shadow backdrop-blur transition-colors hover:bg-white";

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export default function ProductGallery({ images, alt, inStock }: Props) {
  const t = useTranslations("gallery");
  const count = images.length;

  const [index, setIndex] = useState(0);
  const [previous, setPrevious] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [sharp, setSharp] = useState<string | null>(null);

  const frame = useRef<HTMLDivElement>(null);
  const follow = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const tf = useRef<Transform>({ s: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, Point>());
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null);
  const lastToggle = useRef(0);
  const gesture = useRef({
    mode: "none" as Mode,
    start: { x: 0, y: 0 },
    from: { s: 1, x: 0, y: 0 } as Transform,
    startDist: 1,
    startMid: { x: 0, y: 0 },
    moved: false,
    dx: 0,
    dy: 0,
  });

  const current = Math.min(index, Math.max(count - 1, 0));

  // ───── zoom helpers (the picture is moved directly, without re-rendering at every touch move) ─────

  const apply = useCallback((animate: boolean) => {
    const el = layer.current;
    if (!el) return;
    const { s, x, y } = tf.current;
    el.style.transition = animate && !prefersReducedMotion() ? "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)" : "none";
    el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s})`;
  }, []);

  const clampTransform = useCallback(() => {
    const box = frame.current?.getBoundingClientRect();
    const v = tf.current;
    v.s = Math.min(MAX_SCALE, Math.max(1, v.s));
    if (!box || v.s === 1) {
      v.x = 0;
      v.y = 0;
      return;
    }
    const maxX = ((v.s - 1) * box.width) / 2;
    const maxY = ((v.s - 1) * box.height) / 2;
    v.x = Math.min(maxX, Math.max(-maxX, v.x));
    v.y = Math.min(maxY, Math.max(-maxY, v.y));
  }, []);

  const finishZoom = useCallback(() => {
    clampTransform();
    apply(true);
    setZoomed(tf.current.s > 1.02);
  }, [apply, clampTransform]);

  const reset = useCallback(
    (animate: boolean) => {
      tf.current = { s: 1, x: 0, y: 0 };
      apply(animate);
      setZoomed(false);
    },
    [apply],
  );

  /** Zooms to `scale`, keeping the point under (clientX, clientY) where it is. */
  const zoomAt = useCallback(
    (clientX: number, clientY: number, scale: number, animate: boolean) => {
      const box = frame.current?.getBoundingClientRect();
      if (!box) return;
      const v = tf.current;
      const mx = clientX - (box.left + box.width / 2);
      const my = clientY - (box.top + box.height / 2);
      const qx = (mx - v.x) / v.s;
      const qy = (my - v.y) / v.s;
      v.s = scale;
      v.x = mx - scale * qx;
      v.y = my - scale * qy;
      clampTransform();
      apply(animate);
      setZoomed(tf.current.s > 1.02);
    },
    [apply, clampTransform],
  );

  function zoomCenter(scale: number) {
    const box = frame.current?.getBoundingClientRect();
    if (!box) return;
    if (scale <= 1.02) reset(true);
    else zoomAt(box.left + box.width / 2, box.top + box.height / 2, Math.min(MAX_SCALE, scale), true);
  }

  function toggleZoom(clientX: number, clientY: number) {
    lastToggle.current = performance.now();
    if (tf.current.s > 1.02) reset(true);
    else zoomAt(clientX, clientY, TAP_ZOOM, true);
  }

  // Ctrl + scroll (a trackpad pinch) zooms; normal scrolling still scrolls the page
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      const next = Math.min(MAX_SCALE, Math.max(1, tf.current.s * Math.exp(-event.deltaY * 0.01)));
      if (next <= 1.01) reset(false);
      else zoomAt(event.clientX, event.clientY, next, false);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt, reset, count]);

  // ───── changing photo ─────

  function settleFollow() {
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
    reset(false);
    settleFollow();
  }

  // ───── touch, pen and mouse ─────

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const el = event.currentTarget;
    el.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const g = gesture.current;

    if (pointers.current.size >= 2) {
      const box = el.getBoundingClientRect();
      const [a, b] = [...pointers.current.values()];
      g.mode = "pinch";
      g.startDist = Math.max(distance(a, b), 1);
      g.startMid = {
        x: (a.x + b.x) / 2 - (box.left + box.width / 2),
        y: (a.y + b.y) / 2 - (box.top + box.height / 2),
      };
      g.from = { ...tf.current };
      g.moved = true;
      if (follow.current) follow.current.style.transform = "translate3d(0, 0, 0)";
    } else {
      g.mode = tf.current.s > 1.02 ? "pan" : "swipe";
      g.start = { x: event.clientX, y: event.clientY };
      g.from = { ...tf.current };
      g.moved = false;
      g.dx = 0;
      g.dy = 0;
      if (layer.current) layer.current.style.transition = "none";
    }
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const g = gesture.current;

    if (g.mode === "pinch" && pointers.current.size >= 2) {
      const box = event.currentTarget.getBoundingClientRect();
      const [a, b] = [...pointers.current.values()];
      const scale = Math.min(MAX_SCALE * 1.15, Math.max(0.8, (g.from.s * distance(a, b)) / g.startDist));
      const mid = {
        x: (a.x + b.x) / 2 - (box.left + box.width / 2),
        y: (a.y + b.y) / 2 - (box.top + box.height / 2),
      };
      const qx = (g.startMid.x - g.from.x) / g.from.s;
      const qy = (g.startMid.y - g.from.y) / g.from.s;
      tf.current = { s: scale, x: mid.x - scale * qx, y: mid.y - scale * qy };
      apply(false);
      return;
    }

    const dx = event.clientX - g.start.x;
    const dy = event.clientY - g.start.y;
    g.dx = dx;
    g.dy = dy;
    if (!g.moved && Math.hypot(dx, dy) > 6) g.moved = true;

    if (g.mode === "pan") {
      tf.current = { s: g.from.s, x: g.from.x + dx, y: g.from.y + dy };
      clampTransform();
      apply(false);
    } else if (g.mode === "swipe" && g.moved && Math.abs(dx) > Math.abs(dy) && follow.current) {
      follow.current.style.transition = "none";
      follow.current.style.transform = `translate3d(${dx * 0.25}px, 0, 0)`;
    }
  }

  function tap(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse") return; // computers use the double-click event
    const now = performance.now();
    const last = lastTap.current;
    if (last && now - last.time < 320 && Math.hypot(event.clientX - last.x, event.clientY - last.y) < 32) {
      lastTap.current = null;
      toggleZoom(event.clientX, event.clientY);
    } else {
      lastTap.current = { time: now, x: event.clientX, y: event.clientY };
    }
  }

  function endPointer(event: React.PointerEvent<HTMLDivElement>, cancelled: boolean) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const g = gesture.current;

    if (g.mode === "pinch") {
      const rest = [...pointers.current.values()];
      if (rest.length === 0) {
        g.mode = "none";
        finishZoom();
      } else {
        // one finger stays down: keep moving the picture from where it is
        g.mode = tf.current.s > 1.02 ? "pan" : "none";
        g.start = rest[0];
        g.from = { ...tf.current };
        g.moved = true;
        g.dx = 0;
        g.dy = 0;
      }
      return;
    }
    if (pointers.current.size > 0) return;

    const mode = g.mode;
    g.mode = "none";
    if (mode === "swipe") {
      settleFollow();
      if (!cancelled && g.moved && Math.abs(g.dx) >= SWIPE_DISTANCE && Math.abs(g.dx) > Math.abs(g.dy)) {
        goTo(current + (g.dx < 0 ? 1 : -1));
      } else if (!cancelled && !g.moved) {
        tap(event);
      }
    } else if (mode === "pan") {
      finishZoom();
      if (!cancelled && !g.moved) tap(event);
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(current + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(current - 1);
    } else if (event.key === "Escape" && zoomed) {
      reset(true);
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomCenter(tf.current.s <= 1.02 ? TAP_ZOOM : tf.current.s * 1.5);
    } else if (event.key === "-") {
      event.preventDefault();
      zoomCenter(tf.current.s / 1.5);
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

  const near = new Set<number>([
    current,
    Math.min(previous, count - 1),
    (current + 1) % count,
    (current - 1 + count) % count,
  ]);
  const sharpUrl = zoomed ? cloudinaryLoader({ src: images[current].url, width: 1600 }) : null;

  return (
    <div>
      <div
        ref={frame}
        role="group"
        aria-roledescription="carousel"
        aria-label={t("label")}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(event) => endPointer(event, false)}
        onPointerCancel={(event) => endPointer(event, true)}
        onDoubleClick={(event) => {
          if ((event.target as HTMLElement).closest("button")) return;
          if (performance.now() - lastToggle.current < 600) return; // a touch double-tap was already handled
          toggleZoom(event.clientX, event.clientY);
        }}
        className={`${FRAME} group select-none outline-offset-4 ${zoomed ? "cursor-grab touch-none" : "touch-pan-y"}`}
      >
        <div ref={follow} className="absolute inset-0">
          <div ref={layer} className="absolute inset-0 will-change-transform">
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

            {sharpUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={sharpUrl}
                src={sharpUrl}
                alt=""
                aria-hidden
                draggable={false}
                onLoad={() => setSharp(sharpUrl)}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
                  sharp === sharpUrl ? "opacity-100" : "opacity-0"
                } ${inStock ? "" : "grayscale"}`}
              />
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => (zoomed ? reset(true) : zoomCenter(TAP_ZOOM))}
          aria-label={zoomed ? t("zoomOut") : t("zoomIn")}
          title={zoomed ? t("zoomOut") : t("zoomIn")}
          className={`${ROUND_BUTTON} absolute right-3 top-3 z-10`}
        >
          {zoomed ? <ZoomOut className="h-5 w-5" aria-hidden /> : <ZoomIn className="h-5 w-5" aria-hidden />}
        </button>

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

      <p className="mt-3 text-center text-xs text-cocoa/50">
        <span className="hidden pointer-coarse:inline">{t("hintTouch")}</span>
        <span className="hidden pointer-fine:inline">{t("hintMouse")}</span>
      </p>
    </div>
  );
}