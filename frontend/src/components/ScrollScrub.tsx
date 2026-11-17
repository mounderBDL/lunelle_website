"use client";

import { useLayoutEffect, useRef } from "react";

type Item = { el: HTMLElement; mode: string; index: number; top: number; height: number; last: string; peak: number };
const clamp = (n: number) => Math.min(1, Math.max(0, n));
const ease = (t: number) => t * t * (3 - 2 * t);

/**
 * Ties the items of its section ([data-sc]) to the scroll position: each one gets a progress --p from 0 to 1
 * that the styles in globals.css turn into movement. It works in both directions: scroll up and everything folds back.
 * Place it anywhere inside the section.
 */
export default function ScrollScrub() {
  const marker = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const root = marker.current?.closest("section");
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const elements = Array.from(root.querySelectorAll<HTMLElement>("[data-sc]"));
    if (elements.length === 0) return;

    const items: Item[] = elements.map((el) => ({
      el,
      mode: el.dataset.sc ?? "rise",
      index: Number(el.dataset.i ?? 0),
      top: 0,
      height: 0,
      last: "",
      peak: 0,
    }));

    let frame = 0;

    /** Where each item sits on the page, with everything at its final place (so movement never changes the measure). */
    function measure() {
      for (const item of items) item.el.style.setProperty("--p", "1");
      const y = window.scrollY;
      for (const item of items) {
        const box = item.el.getBoundingClientRect();
        item.top = box.top + y;
        item.height = box.height;
        item.last = "";
      }
      // everything has played once: nothing left to follow, so stop listening
      if (items.every((item) => item.peak >= 1)) stop();
    }

    function update() {
      frame = 0;
      const vh = window.innerHeight;
      const y = window.scrollY;

      for (const item of items) {
        const top = item.top - y;
        let t: number;
        if (item.mode === "thread") {
          // a line that is drawn along the whole list
          t = (vh * 0.85 - top) / (item.height + vh * 0.1);
        } else if (item.mode === "word") {
          // the words of a title start one after the other
          t = (vh * 0.94 - item.index * vh * 0.02 - top) / (vh * 0.16);
        } else {
          t = (vh * 0.94 - top) / (vh * 0.26);
        }
        item.peak = Math.max(item.peak, ease(clamp(t)));
        const value = item.peak.toFixed(3);
        if (value !== item.last) {
          item.el.style.setProperty("--p", value);
          item.last = value;
        }
      }
    }

    function stop() {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", remeasure);
      observer.disconnect();
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const remeasure = () => {
      measure();
      update();
    };

    measure();
    update();
    root.setAttribute("data-scrub", "");

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", remeasure);
    // the section changes height when a question opens, fonts load or the text wraps differently
    // the observer reports once as soon as it starts: that first report is not a change
    let first = true;
    const observer = new ResizeObserver(() => {
      if (first) {
        first = false;
        return;
      }
      remeasure();
    });
    observer.observe(root);
    void document.fonts?.ready.then(remeasure);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", remeasure);
      observer.disconnect();
      root.removeAttribute("data-scrub");
      for (const item of items) item.el.style.removeProperty("--p");
    };
  }, []);

  return <span ref={marker} hidden />;
}