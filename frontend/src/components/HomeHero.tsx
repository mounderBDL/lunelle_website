import { getTranslations } from "next-intl/server";

const PETALS = [
  { left: 4, size: 14, duration: 21, delay: -3, drift: 60, tone: 0 },
  { left: 12, size: 10, duration: 17, delay: -11, drift: -40, tone: 1 },
  { left: 21, size: 18, duration: 25, delay: -7, drift: 80, tone: 2 },
  { left: 30, size: 11, duration: 19, delay: -14, drift: -60, tone: 3 },
  { left: 39, size: 15, duration: 23, delay: -2, drift: 50, tone: 1 },
  { left: 48, size: 9, duration: 16, delay: -9, drift: -30, tone: 0 },
  { left: 57, size: 17, duration: 26, delay: -16, drift: 70, tone: 2 },
  { left: 66, size: 12, duration: 20, delay: -5, drift: -70, tone: 3 },
  { left: 74, size: 16, duration: 24, delay: -12, drift: 45, tone: 0 },
  { left: 82, size: 10, duration: 18, delay: -1, drift: -50, tone: 1 },
  { left: 90, size: 14, duration: 22, delay: -8, drift: 65, tone: 2 },
  { left: 96, size: 11, duration: 19, delay: -13, drift: -45, tone: 3 },
] as const;

const PETAL_TONES = [
  "var(--color-petal-300)",
  "var(--color-petal-200)",
  "var(--color-rose)",
  "var(--color-lavender)",
];

const css = (vars: Record<string, string | number>) => vars as React.CSSProperties;

export default async function HomeHero({ hasPacks }: { hasPacks: boolean }) {
  const t = await getTranslations("home");
  const words = t("heroTitle").split(" ");
  const last = words.length - 1;

  return (
    <section className="relative isolate overflow-hidden">
      {/* ── the living backdrop ── */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-linear-to-b from-blush/60 via-cream to-cream" />
      <div aria-hidden className="hero-blob hero-blob-a" />
      <div aria-hidden className="hero-blob hero-blob-b" />
      <div aria-hidden className="hero-blob hero-blob-c" />

      <svg
        aria-hidden
        viewBox="0 0 200 200"
        className="hero-moon pointer-events-none absolute -right-12 top-[6%] -z-10 h-64 w-64 text-petal-300/70 sm:right-[6%] sm:h-80 sm:w-80"
      >
        <defs>
          <mask id="hero-moon-mask">
            <rect width="200" height="200" fill="white" />
            <circle cx="132" cy="84" r="78" fill="black" />
          </mask>
        </defs>
        <circle cx="100" cy="100" r="82" fill="currentColor" mask="url(#hero-moon-mask)" />
      </svg>

      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {PETALS.map((p, i) => (
          <span
            key={i}
            className={`hero-petal ${i >= 7 ? "hidden sm:block" : ""}`}
            style={css({
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: PETAL_TONES[p.tone],
              "--dur": `${p.duration}s`,
              "--delay": `${p.delay}s`,
              "--drift": `${p.drift}px`,
            })}
          />
        ))}
      </div>

      {/* ── the words ── */}
      <div className="relative mx-auto flex min-h-[72svh] max-w-6xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
        <p
          className="hero-fade text-xs uppercase tracking-[0.3em] text-rose-dark"
          style={css({ "--d": "100ms" })}
        >
          {t("heroEyebrow")}
        </p>

        <h1 className="mx-auto mt-5 max-w-4xl text-5xl leading-[1.04] sm:text-7xl lg:text-8xl">
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
          className="hero-fade mt-8 block h-px w-24 bg-linear-to-r from-transparent via-gold to-transparent"
          style={css({ "--d": "900ms" })}
        />

        <p className="hero-fade mx-auto mt-6 max-w-xl text-lg text-cocoa/75" style={css({ "--d": "1000ms" })}>
          {t("heroText")}
        </p>

        <div
          className="hero-fade mt-10 flex flex-wrap items-center justify-center gap-4"
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
              className="rounded-full border border-rose-dark px-8 py-3 text-sm font-medium tracking-wide text-rose-dark transition-all hover:-translate-y-0.5 hover:bg-blush"
            >
              {t("packsCta")}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}