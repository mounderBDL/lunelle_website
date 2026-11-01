"use client";

import { usePathname } from "next/navigation";
import type { MouseEvent } from "react";
import { useEffect, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";

/** A normal left click (not Ctrl, Cmd, Shift or Alt: those open the link in a new tab or window). */
export function isPlainClick(event: MouseEvent) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/** Scrolls smoothly to a section of the page. Returns false if the section is not on this page. */
export function scrollToSection(id: string): boolean {
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  window.history.pushState(null, "", `#${id}`);
  return true;
}

/** Which section of the home page is under the top of the screen (always null on other pages). */
export function useActiveSection(ids: string[]): string | null {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const key = ids.join("|");
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (!onHome || key === "" || typeof IntersectionObserver === "undefined") return;
    const list = key.split("|");
    const elements = list.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        setActive(list.find((id) => visible.has(id)) ?? null);
      },
      { rootMargin: "-25% 0px -65% 0px" }, // a thin band near the top of the screen
    );
    elements.forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
    };
  }, [onHome, key]);

  return onHome ? active : null;
}