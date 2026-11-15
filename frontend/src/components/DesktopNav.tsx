"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavSection } from "@/lib/sections";
import { isPlainClick, scrollToSection, useActiveSection } from "@/lib/sectionNav";

export default function DesktopNav({ items, label }: { items: NavSection[]; label: string }) {
  const pathname = usePathname();
  const active = useActiveSection(items.map((item) => item.id));

  return (
    <nav
      className="hidden items-center gap-0.5 rounded-full bg-white p-1 shadow-sm shadow-cocoa/5 md:flex"
      aria-label={label}
    >
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
            className={`rounded-full px-3 py-1.5 font-display text-[17px] leading-5 transition-colors hover:text-rose-dark lg:px-4 ${
            current ? "bg-blush text-rose-dark" : "text-cocoa/90"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}