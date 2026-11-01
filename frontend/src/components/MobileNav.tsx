"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { NavSection } from "@/lib/sections";
import { isPlainClick, scrollToSection, useActiveSection } from "@/lib/sectionNav";

// a little longer than the longest closing transition in globals.css (.mnav-panel: 450ms)
const CLOSE_MS = 480;

export default function MobileNav({ items, label }: { items: NavSection[]; label: string }) {
  const t = useTranslations("footer");
  const pathname = usePathname();
  const active = useActiveSection(items.map((item) => item.id));
  const panelId = useId();

  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const frame = useRef(0);

  // "present": the menu is in the page (also while it is closing). "open": it is showing.
  const [present, setPresent] = useState(false);
  const [open, setOpen] = useState(false);

  // the menu closes when the page changes (state adjusted while rendering, not in an effect)
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
  }

  const openMenu = useCallback(() => {
    cancelAnimationFrame(frame.current);
    setPresent(true);
    // wait until the closed menu has been painted, so the opening can be animated
    frame.current = requestAnimationFrame(() => {
      frame.current = requestAnimationFrame(() => setOpen(true));
    });
  }, []);

  const closeMenu = useCallback((returnFocus = false) => {
    cancelAnimationFrame(frame.current);
    setOpen(false);
    if (returnFocus) button.current?.focus();
  }, []);

  // once the closing animation is over, the menu leaves the page
  useEffect(() => {
    if (!present || open) return;
    const timer = window.setTimeout(() => setPresent(false), CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [present, open]);

  // Escape, a tap outside the menu, or a window that grows to computer size
  useEffect(() => {
    if (!present) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu(true);
    };
    const onDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) closeMenu();
    };
    const desktop = window.matchMedia("(min-width: 768px)");
    const onResize = () => {
      if (desktop.matches) closeMenu();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    desktop.addEventListener("change", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
      desktop.removeEventListener("change", onResize);
    };
  }, [present, closeMenu]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
    },
    [],
  );

  return (
    <div ref={root} className="md:hidden">
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={present ? panelId : undefined}
        onClick={() => (present && open ? closeMenu() : openMenu())}
        className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-300 ${
          open ? "bg-blush text-rose-dark" : "hover:bg-blush"
        }`}
      >
        <span className="mnav-burger" data-open={open} aria-hidden>
          <span />
          <span />
          <span />
        </span>
      </button>

      {present && (
        <div className="mnav" data-open={open}>
          <div aria-hidden onClick={() => closeMenu()} className="mnav-backdrop" />

          <div className="mnav-panel-wrap">
            <nav id={panelId} aria-label={label} inert={!open} className="mnav-panel">
              <ul className="px-4 pb-2 pt-3">
                {items.map((item, i) => {
                  const current = active === item.id;
                  return (
                    <li key={item.id} className="mnav-item" style={{ "--i": i } as React.CSSProperties}>
                      <Link
                        href={`/#${item.id}`}
                        aria-current={current ? "location" : undefined}
                        onClick={(event) => {
                          closeMenu();
                          if (pathname === "/" && isPlainClick(event) && scrollToSection(item.id)) {
                            event.preventDefault();
                          }
                        }}
                        className={`flex items-center justify-between rounded-xl px-3 py-3.5 font-display text-2xl transition-colors hover:bg-blush ${
                          current ? "bg-blush/70 text-rose-dark" : ""
                        }`}
                      >
                        <span>{item.label}</span>
                        {current && <span aria-hidden className="h-2 w-2 rounded-full bg-rose-dark" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <p
                className="mnav-item px-6 pb-5 pt-3 text-center font-display text-lg italic text-cocoa/60"
                style={{ "--i": items.length } as React.CSSProperties}
              >
                {t("tagline")}
              </p>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}