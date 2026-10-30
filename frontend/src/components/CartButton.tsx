"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { selectCount, useCart } from "@/store/cart";
import { useCartUi } from "@/store/cartUi";

const subscribe = () => () => {};

export default function CartButton({ label }: { label: string }) {
  // the cart lives in the browser: show the count only after the page has loaded there
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const count = useCart(selectCount);
  const bumps = useCartUi((s) => s.bumps);
  const openCart = useCartUi((s) => s.openCart);

  return (
    <Link
      href="/cart"
      data-cart-target=""
      aria-label={label}
      aria-haspopup="dialog"
      onClick={(event) => {
        // a normal click slides the cart in; Ctrl/Cmd-click still opens the full page
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        openCart();
      }}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-cocoa hover:bg-blush"
    >
      {/* the prefixes keep the two keys different, whatever the numbers are */}
      <span key={`bump-${bumps}`} className={bumps > 0 ? "cart-bump" : undefined}>
        <ShoppingBag className="h-5 w-5" aria-hidden />
      </span>
      {mounted && count > 0 && (
        <span
          key={`count-${count}`}
          className="cart-pop absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-dark px-1 text-[11px] font-semibold text-white"
        >
          {count}
        </span>
      )}
    </Link>
  );
}