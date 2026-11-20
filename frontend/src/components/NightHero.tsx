import { getTranslations } from "next-intl/server";
import HeroScroll from "./HeroScroll";

const css = (vars: Record<string, string | number>) => vars as React.CSSProperties;

/** The hero photo. To change it, replace this file in public/brand (keep the name) or point this at a new one. */
const HERO_IMAGE = "/brand/hero.png";

/**
 * The night hero. While the visitor scrolls, the stage stays in place (a "pin") and the scroll drives it:
 * the photo opens from a framed window to the full screen, the giant Lunelle rises and dissolves, and the
 * title types itself in. HeroScroll feeds the progress (--hp); the styles live in globals.css (.hero-pin).
 * Without the script, or for visitors who asked for less motion, it is simply the opened hero.
 */
export default async function NightHero({ hasPacks }: { hasPacks: boolean }) {
  const t = await getTranslations("home");
  const title = t("heroTitle");
  const words = title.split(" ");
  const last = words.length - 1;
  let charIndex = 0;

  return (
    // --hero-image: the same photo fills the giant letters (see .hero-mark-film in globals.css)
    <section className="hero-pin relative -mt-16 bg-night" style={css({ "--hero-image": `url("${HERO_IMAGE}")` })}>
      <HeroScroll />

      <div className="hero-stage sticky top-0 h-svh overflow-hidden">
        <div aria-hidden className="hero-grid absolute inset-0" />

        {/* ── the corners: they fade as the window opens; drawn above the window so it never hides them ── */}
        <div
          aria-hidden
          className="hero-corners pointer-events-none absolute inset-x-0 top-24 z-10 mx-auto flex max-w-6xl items-start justify-between px-4 sm:top-28 sm:px-6"
        >
          <div className="hero-fade" style={css({ "--d": "200ms" })}>
            <p className="text-[11px] uppercase tracking-[0.3em] text-cream/45">{t("heroWorldsLabel")}</p>
            <p className="mt-2 text-lg uppercase tracking-[0.14em] text-cream sm:text-2xl">{t("heroEyebrow")}</p>
          </div>
          <div className="hero-fade hidden text-right sm:block" style={css({ "--d": "350ms" })}>
            <p className="text-[11px] uppercase tracking-[0.3em] text-cream/45">{t("heroScrollLabel")}</p>
            <p className="mt-2 text-2xl uppercase tracking-[0.14em] text-cream">{t("heroScrollText")}</p>
          </div>
        </div>

        {/* ── the window over the photo, which opens to the full screen ── */}
        <div className="hero-window absolute inset-0">
          <div className="hero-media absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={HERO_IMAGE}
              alt=""
              fetchPriority="high"
              className="absolute inset-0 h-full w-full object-cover object-[58%_50%]"
            />
          </div>
          {/* a plum wash for the night mood while the window is small; gone once the photo is 90% open */}
          <div aria-hidden className="hero-wash absolute inset-0 bg-night/40" />

          {/* ── what the opened window shows ── */}
          <div className="hero-final relative mx-auto flex h-full max-w-6xl flex-col justify-end px-4 pb-20 pt-36 text-center sm:px-6 lg:justify-center lg:pb-24 lg:text-left">
            <div className="mx-auto max-w-xl lg:mx-0 lg:max-w-lg">
              <p className="text-xs uppercase tracking-[0.3em] text-rose-dark">{t("heroEyebrow")}</p>

              <h1 className="sr-only">{title}</h1>
              <p aria-hidden className="mt-5 font-display text-5xl leading-[1.04] text-cream sm:text-6xl xl:text-7xl">
                {words.map((word, w) => (
                  <span key={w}>
                    <span className={`inline-block whitespace-nowrap ${w === last ? "italic" : ""}`}>
                      {Array.from(word).map((ch) => (
                        <span key={charIndex} data-ch={charIndex++} className="hero-ch">
                          {ch}
                        </span>
                      ))}
                    </span>
                    {w < last ? " " : null}
                  </span>
                ))}
              </p>

              <span
                aria-hidden
                className="mx-auto mt-8 block h-px w-24 bg-linear-to-r from-gold/0 via-gold to-gold/0 lg:mx-0 lg:from-gold"
              />

              <div className="mt-10 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
                <a
                  href="#collections"
                  className="rounded-full bg-rose-dark px-8 py-3 text-sm font-medium tracking-wide text-white shadow-[0_10px_30px_-12px_rgba(154,85,96,0.7)] transition-all hover:-translate-y-0.5 hover:bg-cocoa"
                >
                  {t("shop")}
                </a>
                {hasPacks && (
                  <a
                    href="#packs"
                    className="rounded-full border border-rose-dark bg-cream/60 px-8 py-3 text-sm font-medium tracking-wide text-rose-dark transition-all hover:-translate-y-0.5 hover:bg-blush"
                  >
                    {t("packsCta")}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── the giant name: cream outside the window, the photo inside it ── */}
        <div aria-hidden className="hero-mark pointer-events-none absolute inset-0 grid place-items-center">
          <span className="hero-fade hero-mark-word text-cream" style={css({ "--d": "100ms" })}>
            Lunelle
          </span>
        </div>
        <div aria-hidden className="hero-mark-clip pointer-events-none absolute inset-0">
          <div className="hero-mark absolute inset-0 grid place-items-center">
            <span className="hero-fade hero-mark-word hero-mark-film" style={css({ "--d": "100ms" })}>
              Lunelle
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
