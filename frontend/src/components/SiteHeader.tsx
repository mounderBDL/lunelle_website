import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getCategories, getPacks, getProducts } from "@/lib/api/catalog";
import type { NavSection } from "@/lib/sections";
import CartButton from "./CartButton";
import DesktopNav from "./DesktopNav";
import LanguageSwitcher from "./LanguageSwitcher";
import MobileNav from "./MobileNav";

export default async function SiteHeader() {
  const [t, categories, featured, packs] = await Promise.all([
    getTranslations("nav"),
    getCategories(),
    getProducts({ featured: true }),
    getPacks(),
  ]);

  // the menu lists the sections of the home page; a section that is empty is not offered
  const items: NavSection[] = [
    ...(categories.length > 0 ? [{ id: "collections", label: t("collections") }] : []),
    ...(featured.length > 0 ? [{ id: "best-sellers", label: t("bestSellers") }] : []),
    ...(packs.length > 0 ? [{ id: "packs", label: t("packs") }] : []),
    { id: "story", label: t("story") },
    { id: "faq", label: t("faq") },
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

        <DesktopNav items={items} label={t("menu")} />

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <CartButton label={t("cart")} />
          <MobileNav items={items} label={t("menu")} />
        </div>
      </div>
    </header>
  );
}