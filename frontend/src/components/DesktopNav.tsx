"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavSection } from "@/lib/sections";
import { isPlainClick, scrollToSection, useActiveSection } from "@/lib/sectionNav";

export default function DesktopNav({ items, label }: { items: NavSection[]; label: string }) {
  const pathname = usePathname();
  const active = useActiveSection(items.map((item) => item.id));

  return (
    <nav className="hidden items-center gap-8 md:flex" aria-label={label}>
      {items.map((item) => {
        const current = active === item.id;
        return (
          <Link
            key={item.id}
            href={`/#${item.id}`}
            aria-current={current ? "location" : undefined}
            onClick={(event) => {
              // on the home page: glide to the section; elsewhere (or with Ctrl/Cmd): a normal link
              if (pathname === "/" && isPlainClick(event) && scrollToSection(item.id)) event.preventDefault();
            }}
            className={`relative py-1 font-display text-lg transition-colors hover:text-rose-dark ${
              current ? "text-rose-dark" : "text-cocoa/90"
            }`}
          >
            {item.label}
            <span
              aria-hidden
              className={`absolute -bottom-0.5 left-0 h-px w-full origin-left bg-rose-dark transition-transform duration-300 ${
                current ? "scale-x-100" : "scale-x-0"
              }`}
            />
          </Link>
        );
      })}
    </nav>
  );
}