"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export type NavItem = { href: string; label: string };

export default function MobileNav({ items, label }: { items: NavItem[]; label: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-blush"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {open && (
        <nav className="absolute inset-x-0 top-16 border-b border-rose/20 bg-cream px-6 py-4 shadow-sm">
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-3 font-display text-xl hover:bg-blush"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}