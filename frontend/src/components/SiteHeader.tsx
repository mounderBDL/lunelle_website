import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { getCategories } from "@/lib/api/catalog";
import { localized } from "@/lib/format";
import CartButton from "./CartButton";
import LanguageSwitcher from "./LanguageSwitcher";
import MobileNav, { type NavItem } from "./MobileNav";

export default async function SiteHeader() {
  const [t, locale, categories] = await Promise.all([
    getTranslations("nav"),
    getLocale(),
    getCategories(),
  ]);

  const items: NavItem[] = [
    ...categories.map((c) => ({ href: `/category/${c.slug}`, label: localized(c.name, locale) })),
    { href: "/packs", label: t("packs") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-rose/20 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Lunelle">
          <Image
            src="/brand/logo.png"
            alt="Lunelle"
            width={200}
            height={70}
            priority
            className="h-11 w-auto mix-blend-multiply"
          />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label={t("menu")}>
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-display text-lg text-cocoa/90 transition-colors hover:text-rose-dark"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <CartButton label={t("cart")} />
          <MobileNav items={items} label={t("menu")} />
        </div>
      </div>
    </header>
  );
}