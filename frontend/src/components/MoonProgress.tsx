"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion";

const R = 15;

/** The lit part of a waxing moon, seen from the right. fraction: 0 = new moon, 1 = full moon. */
function litPath(fraction: number) {
  const k = 1 - 2 * fraction; // 1 = new, 0 = half, -1 = full
  const rx = (R * Math.abs(k)).toFixed(2);
  return `M 0 ${-R} A ${R} ${R} 0 0 1 0 ${R} A ${rx} ${R} 0 0 ${k > 0 ? 0 : 1} 0 ${-R} Z`;
}

const START = litPath(0.06);

export default function MoonProgress() {
  const t = useTranslations("moon");
  const pathname = usePathname();
  const clipId = `moon-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const button = useRef<HTMLButtonElement>(null);
  const lit = useRef<SVGPathElement>(null);
  const clip = useRef<SVGPathElement>(null);
  const hidden = pathname.startsWith("/checkout");

  useEffect(() => {
    const el = button.current;
    const litEl = lit.current;
    const clipEl = clip.current;
    if (!el || !litEl || !clipEl) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      const d = litPath(0.06 + 0.94 * progress);
      litEl.setAttribute("d", d);
      clipEl.setAttribute("d", d);
      el.dataset.visible = max > 320 && window.scrollY > 240 ? "true" : "false";
      el.dataset.full = progress > 0.985 ? "true" : "false";
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pathname, hidden]);

  if (hidden) return null;

  return (
    <button
      ref={button}
      type="button"
      data-visible="false"
      data-full="false"
      aria-label={t("top")}
      title={t("top")}
      onClick={() => window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" })}
      style={{ bottom: "calc(var(--moon-offset, 1.25rem) + env(safe-area-inset-bottom))" }}
      className="invisible fixed right-4 z-30 flex h-12 w-12 translate-y-2 items-center justify-center rounded-full border border-petal-200 bg-white/80 opacity-0 shadow-lg backdrop-blur transition-all duration-300 hover:scale-105 data-[full=true]:shadow-[0_0_28px_6px_rgba(183,110,121,0.35)] data-[visible=true]:visible data-[visible=true]:translate-y-0 data-[visible=true]:opacity-100"
    >
      <svg viewBox="-20 -20 40 40" className="h-9 w-9" aria-hidden>
        <defs>
          <clipPath id={clipId}>
            <path ref={clip} d={START} />
          </clipPath>
        </defs>
        <circle r={R} strokeWidth="1" className="fill-petal-100 stroke-petal-300" />
        <path ref={lit} d={START} className="fill-rose" />
        <g clipPath={`url(#${clipId})`} className="fill-white/40">
          <circle cx="5" cy="-6" r="2.6" />
          <circle cx="8" cy="4" r="1.8" />
          <circle cx="2" cy="8" r="1.3" />
        </g>
      </svg>
    </button>
  );
}