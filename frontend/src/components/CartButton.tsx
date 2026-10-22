"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { selectCount, useCart } from "@/store/cart";

const subscribe = () => () => {};

export default function CartButton({ label }: { label: string }) {
  // the cart lives in the browser: show the count only after the page has loaded there
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const count = useCart(selectCount);

  return (
    <Link
      href="/cart"
      aria-label={label}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-cocoa hover:bg-blush"
    >
      <ShoppingBag className="h-5 w-5" aria-hidden />
      {mounted && count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-dark px-1 text-[11px] font-semibold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}