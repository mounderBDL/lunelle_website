import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getSettings } from "@/lib/api/catalog";

export default async function SiteFooter() {
  const [t, settings] = await Promise.all([getTranslations("footer"), getSettings()]);
  const phone = settings.contact_phone.trim();
  const instagram = settings.instagram_url.trim();

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
          <ul className="mt-3 space-y-2 text-sm">
            {phone && (
              <li>
                <a href={`tel:${phone.replace(/\s+/g, "")}`} className="hover:text-rose-dark">
                  {phone}
                </a>
              </li>
            )}
            {instagram && (
              <li>
                <a
                  href={instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-rose-dark"
                >
                  {t("follow")}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-rose/15 py-5 text-center text-xs text-cocoa/60">
        © {new Date().getFullYear()} {settings.store_name || "Lunelle"}. {t("rights")}
      </div>
    </footer>
  );
}