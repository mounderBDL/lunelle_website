import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { getSettings } from "@/lib/api/catalog";
import { POLICIES_REVIEWED, POLICIES_UPDATED, POLICY_PAGES, type PolicyPageKey } from "@/lib/policies";

export default async function PolicyPage({ page }: { page: PolicyPageKey }) {
  const [t, tc, locale, settings] = await Promise.all([
    getTranslations("policies"),
    getTranslations("common"),
    getLocale(),
    getSettings(),
  ]);

  const config = POLICY_PAGES[page];
  const phone = settings.contact_phone.trim();
  const updated = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${POLICIES_UPDATED}T00:00:00Z`));
  const others = (Object.keys(POLICY_PAGES) as PolicyPageKey[]).filter((key) => key !== page);

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-cocoa/60">
        <Link href="/" className="hover:text-rose-dark">
          {tc("home")}
        </Link>{" "}
        / <span className="text-cocoa">{t(`pages.${page}.title`)}</span>
      </nav>

      <h1 className="mt-6 text-4xl sm:text-5xl">{t(`pages.${page}.title`)}</h1>

      {!POLICIES_REVIEWED && (
        <p role="note" className="mt-5 rounded-xl bg-amber-soft px-4 py-3 text-sm text-amber-dark">
          {t("draft")}
        </p>
      )}

      <p className="mt-4 text-sm text-cocoa/60">{t("updated", { date: updated })}</p>
      <p className="mt-6 text-lg text-cocoa/80">{t(`pages.${page}.intro`)}</p>

      {config.sections.map((section) => {
        const paragraphs = Array.from({ length: section.items }, (_, i) =>
          t(`pages.${page}.sections.${section.key}.p${i + 1}`),
        );
        return (
          <section key={section.key} className="mt-10">
            <h2 className="text-2xl">{t(`pages.${page}.sections.${section.key}.title`)}</h2>
            {section.list ? (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-cocoa/80 marker:text-rose">
                {paragraphs.map((text, i) => (
                  <li key={i}>{text}</li>
                ))}
              </ul>
            ) : (
              <div className="mt-3 space-y-3 text-cocoa/80">
                {paragraphs.map((text, i) => (
                  <p key={i}>{text}</p>
                ))}
              </div>
            )}
          </section>
        );
      })}

      <section className="mt-12 rounded-2xl border border-rose/20 bg-white/60 p-6">
        <h2 className="text-2xl">{t("contactTitle")}</h2>
        {phone && (
          <p className="mt-3">
            <a href={`tel:${phone.replace(/\s+/g, "")}`} className="font-medium text-rose-dark underline">
              {t("contactPhone", { phone })}
            </a>
          </p>
        )}
        <p className="mt-2 text-sm text-cocoa/70">{t("contactSocial")}</p>
      </section>

      <nav aria-label={t("related")} className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="text-cocoa/60">{t("related")}</span>
        {others.map((key) => (
          <Link key={key} href={POLICY_PAGES[key].path} className="underline hover:text-rose-dark">
            {t(`pages.${key}.title`)}
          </Link>
        ))}
      </nav>
    </article>
  );
}