import { getTranslations } from "next-intl/server";

const css = (vars: Record<string, string | number>) => vars as React.CSSProperties;

/** Hero with a looping film behind the words. The first frame shows at once, and the video plays over it. */
export default async function HeroVideo({ hasPacks }: { hasPacks: boolean }) {
  const t = await getTranslations("home");
  const words = t("heroTitle").split(" ");
  const last = words.length - 1;

  return (
    <section className="relative isolate -mt-16 overflow-hidden">
      {/* ── the film ── */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/hero-poster.webp"
        alt=""
        fetchPriority="high"
        className="absolute inset-0 -z-20 h-full w-full object-cover object-[58%_50%]"
      />
      <video
        aria-hidden
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="hero-video absolute inset-0 -z-20 h-full w-full object-cover object-[58%_50%]"
      >
        <source src="/brand/hero.mp4" type="video/mp4" />
      </video>

      {/* a soft cream veil so the words stay readable, and a fade into the next section */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-t from-cream/90 via-cream/35 to-cream/10 lg:bg-linear-to-r lg:from-cream/85 lg:via-cream/30 lg:to-transparent"
      />
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-28 bg-linear-to-t from-cream to-transparent" />

      {/* ── the words: at the bottom on phones, on the left beside the bottle on large screens ── */}
      <div className="relative mx-auto flex min-h-[92svh] max-w-6xl flex-col justify-end px-4 pb-16 pt-36 text-center sm:px-6 lg:justify-center lg:pb-24 lg:text-left">
        <div className="mx-auto max-w-xl lg:mx-0 lg:max-w-md">
          <p
            className="hero-fade text-xs uppercase tracking-[0.3em] text-rose-dark"
            style={css({ "--d": "100ms" })}
          >
            {t("heroEyebrow")}
          </p>

          <h1 className="mt-5 text-5xl leading-[1.04] sm:text-6xl xl:text-7xl">
            {words.map((word, i) => (
              <span key={i}>
                <span
                  className={`hero-word ${i === last ? "italic text-rose-dark" : ""}`}
                  style={css({ "--i": i })}
                >
                  {word}
                </span>
                {i < last ? " " : null}
              </span>
            ))}
          </h1>

          <span
            aria-hidden
            className="hero-fade mx-auto mt-8 block h-px w-24 bg-linear-to-r from-gold/0 via-gold to-gold/0 lg:mx-0 lg:from-gold lg:via-gold"
            style={css({ "--d": "900ms" })}
          />

          <p className="hero-fade mt-6 text-lg text-cocoa/80" style={css({ "--d": "1000ms" })}>
            {t("heroText")}
          </p>

          <div
            className="hero-fade mt-10 flex flex-wrap items-center justify-center gap-4 lg:justify-start"
            style={css({ "--d": "1150ms" })}
          >
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
    </section>
  );
}