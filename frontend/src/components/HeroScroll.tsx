"use client";

import { useLayoutEffect, useRef } from "react";

const HEADER_HEIGHT = 64;
/** How quickly the shown progress catches up with the scroll: the share of the gap closed per 60 fps frame. */
const FOLLOW = 0.14;
const clamp = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Drives the night hero (NightHero). While its section is held in place, sets --hp on it: 0 when the pin
 * starts, 1 when the window is fully open and the page moves on. Also types the title in (the [data-ch]
 * letters) and marks the page while the header sits over the dark hero, so the header can switch to light.
 *
 * The progress is smoothed: a mouse wheel scrolls in jumps of about 100px, and following them exactly makes
 * the film and the word move in steps. Instead, the shown progress glides toward the scroll position over a
 * few frames (time-based, so it feels the same on 60 Hz and 120 Hz screens).
 * It follows both directions: scroll back up and everything closes again.
 * Visitors who asked for less motion get the opened hero, with no pin and no typing.
 */
export default function HeroScroll() {
  const marker = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const root = marker.current?.closest("section");
    if (!root) return;
    const html = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // set before paint by the script in layout.tsx; set again here for visits that arrive by client navigation
    if (!reduce) html.dataset.heroMotion = "on";
    // less motion: the hero is always the opened, full-screen film
    else html.setAttribute("data-hero-full", "");

    const letters = Array.from(root.querySelectorAll<HTMLElement>("[data-ch]"));
    let frame = 0;
    let lastTime = 0;
    let target = 0;
    let shown: number | null = null;
    let lastP = "";
    let lastTyped = -1;
    let lastDark: boolean | null = null;
    let lastOpen: boolean | null = null;
    let lastFull: boolean | null = null;

    /** Reads the real scroll position: the header colour follows it directly, the hero follows `target`. */
    function measure() {
      const box = root!.getBoundingClientRect();
      const dark = box.bottom > HEADER_HEIGHT;
      if (dark !== lastDark) {
        html.toggleAttribute("data-header-dark", dark);
        lastDark = dark;
      }
      const travel = box.height - window.innerHeight;
      target = travel > 0 ? clamp(-box.top / travel) : 1;
    }

    /** Shows one progress value: the CSS variable, the clickable state, the logo colour and the typed letters. */
    function apply(p: number) {
      const value = p.toFixed(4);
      if (value !== lastP) {
        root!.style.setProperty("--hp", value);
        lastP = value;
      }

      const full = p >= 0.77; // the window is fully open (see --open in globals.css): the logo takes its own colour
      if (full !== lastFull) {
        html.toggleAttribute("data-hero-full", full);
        lastFull = full;
      }

      const open = p > 0.88; // the buttons only take clicks once they are really there
      if (open !== lastOpen) {
        root!.toggleAttribute("data-hero-open", open);
        lastOpen = open;
      }

      const typed = Math.round(letters.length * clamp((p - 0.76) / 0.2));
      if (typed !== lastTyped) {
        letters.forEach((letter, i) => {
          letter.dataset.on = String(i < typed);
          letter.toggleAttribute("data-caret", i === typed - 1);
        });
        lastTyped = typed;
      }
    }

    function tick(time: number) {
      frame = 0;
      measure();
      if (reduce) return;

      if (shown === null) {
        shown = target; // first frame (or a reload halfway down): start where the page is, no glide
      } else {
        // a late frame (busy device) catches up in proportion, so the hero never trails far behind the page
        const frames = lastTime ? Math.min(30, (time - lastTime) / (1000 / 60)) : 1;
        shown += (target - shown) * (1 - Math.pow(1 - FOLLOW, frames));
        if (Math.abs(target - shown) < 0.0005) shown = target;
      }
      lastTime = time;
      apply(shown);

      // keep gliding until the shown progress has caught up; then sleep until the next scroll
      if (shown !== target) frame = requestAnimationFrame(tick);
      else lastTime = 0;
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    tick(performance.now());
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      html.removeAttribute("data-header-dark");
      html.removeAttribute("data-hero-full");
      delete html.dataset.heroMotion;
      root.style.removeProperty("--hp");
      root.removeAttribute("data-hero-open");
      for (const letter of letters) {
        delete letter.dataset.on;
        letter.removeAttribute("data-caret");
      }
    };
  }, []);

  return <span ref={marker} hidden />;
}
