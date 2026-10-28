import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getSettings, getSocialLinks } from "@/lib/api/catalog";
import { BRAND_NAMES } from "@/lib/social";

export default async function SiteFooter() {
  const [t, settings, socials] = await Promise.all([getTranslations("footer"), getSettings(), getSocialLinks()]);
  const phone = settings.contact_phone.trim();

  return (
    <footer className="mt-24 border-t border-rose/20 bg-parchment/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
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

        <div>
          <h2 className="font-display text-xl">{t("help")}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/track" className="hover:text-rose-dark">
                {t("track")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-xl">{t("contact")}</h2>
          {phone && (
            <p className="mt-3 text-sm">
              <a href={`tel:${phone.replace(/\s+/g, "")}`} className="hover:text-rose-dark">
                {phone}
              </a>
            </p>
          )}
          {socials.length > 0 && (
            <>
              <p className="mt-5 text-xs font-medium uppercase tracking-[0.2em] text-cocoa/60">{t("follow")}</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {socials.map((link) => (
                  <li key={link.id}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block rounded-full border border-rose/30 px-4 py-1.5 text-sm transition-colors hover:border-rose-dark hover:text-rose-dark"
                    >
                      {link.label || BRAND_NAMES[link.network] || t("website")}
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