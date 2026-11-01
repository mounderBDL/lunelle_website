import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { getCategories, getPacks, getSettings, getSocialLinks } from "@/lib/api/catalog";
import { localized } from "@/lib/format";
import { BRAND_NAMES } from "@/lib/social";

export default async function SiteFooter() {
  const [t, tn, locale, settings, socials, categories, packs] = await Promise.all([
    getTranslations("footer"),
    getTranslations("nav"),
    getLocale(),
    getSettings(),
    getSocialLinks(),
    getCategories(),
    getPacks(),
  ]);
  const phone = settings.contact_phone.trim();
  const link = "hover:text-rose-dark";

  return (
    <footer className="mt-24 border-t border-rose/20 bg-parchment/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <Image
            src="/brand/logo.png"
            alt="Lunelle"
            width={200}
            height={70}
            className="h-14 w-auto mix-blend-multiply"
          />
          <p className="mt-3 font-display text-lg italic text-cocoa/80">{t("tagline")}</p>
        </div>

        {(categories.length > 0 || packs.length > 0) && (
          <div>
            <h2 className="font-display text-xl">{t("shop")}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link href={`/category/${category.slug}`} className={link}>
                    {localized(category.name, locale)}
                  </Link>
                </li>
              ))}
              {packs.length > 0 && (
                <li>
                  <Link href="/packs" className={link}>
                    {tn("packs")}
                  </Link>
                </li>
              )}
            </ul>
          </div>
        )}

        <div>
          <h2 className="font-display text-xl">{t("help")}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/#faq" className={link}>
                {t("faq")}
              </Link>
            </li>
            <li>
              <Link href="/track" className={link}>
                {t("track")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-xl">{t("contact")}</h2>
          {phone && (
            <p className="mt-3 text-sm">
              <a href={`tel:${phone.replace(/\s+/g, "")}`} className={link}>
                {phone}
              </a>
            </p>
          )}
          {socials.length > 0 && (
            <>
              <p className="mt-5 text-xs font-medium uppercase tracking-[0.2em] text-cocoa/60">{t("follow")}</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {socials.map((social) => (
                  <li key={social.id}>
                    <a
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block rounded-full border border-rose/30 px-4 py-1.5 text-sm transition-colors hover:border-rose-dark hover:text-rose-dark"
                    >
                      {social.label || BRAND_NAMES[social.network] || t("website")}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-rose/15 py-5 text-center text-xs text-cocoa/60">
        © {new Date().getFullYear()} {settings.store_name || "Lunelle"}. {t("rights")}
      </div>
    </footer>
  );
}