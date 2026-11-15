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
      className="relative inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white px-3 text-sm font-medium text-cocoa shadow-sm shadow-cocoa/5 transition-colors hover:bg-blush sm:px-4"    
      >
      {/* the prefixes keep the two keys different, whatever the numbers are */}
      <span key={`bump-${bumps}`} className={bumps > 0 ? "cart-bump" : undefined}>
        <ShoppingBag className="h-5 w-5" aria-hidden />
      </span>
      <span className="hidden sm:inline">{label}</span>
      <span key={`count-${count}`} className={`tabular-nums ${mounted && count > 0 ? "cart-pop" : ""}`}>
        ({mounted ? count : 0})
      </span>
    </Link>
  );
}