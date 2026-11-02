import { Moon, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { getCategories, getPacks, getSettings, getSocialLinks } from "@/lib/api/catalog";
import { localized } from "@/lib/format";
import { BRAND_NAMES } from "@/lib/social";
import SocialIcon from "./SocialIcon";

const LINK = "inline-block py-1.5 text-sm transition-all hover:translate-x-0.5 hover:text-rose-dark";

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h2 className="font-display text-xl">{children}</h2>
      <span aria-hidden className="mt-2 block h-px w-8 bg-gold/70" />
    </>
  );
}

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
  const hasShop = categories.length > 0 || packs.length > 0;

  return (
    <footer className="relative mt-24 overflow-hidden border-t border-rose/20 bg-linear-to-b from-parchment/40 via-parchment/70 to-petal-100/60">
      <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-12 sm:px-6 lg:pt-16">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-[1.5fr_1fr_1fr_1.1fr] lg:gap-x-10">
          {/* ── brand and social media ── */}
          <div className="col-span-2 flex flex-col items-center text-center lg:col-span-1 lg:items-start lg:text-left">
            <Image
              src="/brand/logo.png"
              alt="Lunelle"
              width={200}
              height={70}
              className="h-14 w-auto mix-blend-multiply"
            />
            <p className="mt-3 font-display text-xl italic text-cocoa/80">{t("tagline")}</p>

            {socials.length > 0 && (
              <>
                <p className="mt-6 text-xs font-medium uppercase tracking-[0.2em] text-cocoa/70">{t("follow")}</p>
                <ul className="mt-3 flex flex-wrap justify-center gap-3 lg:justify-start">
                  {socials.map((social) => {
                    const name = social.label || BRAND_NAMES[social.network] || t("website");
                    const custom = (social.network === "WEBSITE" || social.network === "OTHER") && Boolean(social.label);
                    return (
                      <li key={social.id}>
                        <SocialIcon network={social.network} url={social.url} name={name} showLabel={custom} />
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>

          {/* ── shop ── */}
          {hasShop && (
            <div>
              <Heading>{t("shop")}</Heading>
              <ul className="mt-3">
                {categories.map((category) => (
                  <li key={category.id}>
                    <Link href={`/category/${category.slug}`} className={LINK}>
                      {localized(category.name, locale)}
                    </Link>
                  </li>
                ))}
                {packs.length > 0 && (
                  <li>
                    <Link href="/packs" className={LINK}>
                      {tn("packs")}
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* ── help ── */}
          <div className={hasShop ? "" : "col-span-2 lg:col-span-1"}>
            <Heading>{t("help")}</Heading>
            <ul className="mt-3">
              <li>
                <Link href="/#faq" className={LINK}>
                  {t("faq")}
                </Link>
              </li>
              <li>
                <Link href="/track" className={LINK}>
                  {t("track")}
                </Link>
              </li>
              <li>
                <Link href="/delivery-returns" className={LINK}>
                  {t("deliveryReturns")}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className={LINK}>
                  {t("privacy")}
                </Link>
              </li>
              <li>
                <Link href="/terms" className={LINK}>
                  {t("terms")}
                </Link>
              </li>              
            </ul>
          </div>

          {/* ── contact ── */}
          {phone && (
            <div className="col-span-2 flex flex-col items-center text-center lg:col-span-1 lg:items-start lg:text-left">
              <Heading>{t("contact")}</Heading>
              <a
                href={`tel:${phone.replace(/\s+/g, "")}`}
                className="mt-4 flex w-full max-w-xs items-center justify-center gap-3 rounded-full border border-rose/30 bg-white/60 px-5 py-3 transition-colors hover:border-rose-dark hover:bg-white lg:w-auto lg:max-w-none lg:justify-start"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blush text-rose-dark">
                  <Phone className="h-4 w-4" aria-hidden />
                </span>
                <span className="text-left">
                  <span className="block text-xs text-cocoa/70">{t("call")}</span>
                  <span className="block font-medium tabular-nums">{phone}</span>
                </span>
              </a>
            </div>
          )}
        </div>

        <p className="mt-12 flex items-center justify-center gap-2 border-t border-rose/15 pt-6 text-center text-xs text-cocoa/70">
          <Moon className="h-3.5 w-3.5 shrink-0 text-rose" aria-hidden />
          <span>
            © {new Date().getFullYear()} {settings.store_name || "Lunelle"}. {t("rights")}
          </span>
        </p>
      </div>
    </footer>
  );
}