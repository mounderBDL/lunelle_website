"use client";

import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
};
const isScrolled = () => window.scrollY > 8;

/** The header's background: invisible at the top of the page, a soft blurred cream once the page is scrolled. */
export default function HeaderTint() {
  const scrolled = useSyncExternalStore(subscribe, isScrolled, () => false);
  return (
    <div
      aria-hidden
      className={`absolute inset-0 -z-10 bg-cream/90 backdrop-blur transition-opacity duration-300 ${
        scrolled ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}