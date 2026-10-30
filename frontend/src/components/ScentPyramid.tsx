"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { NoteLevel } from "@/lib/scent";

const ORDER: NoteLevel[] = ["top", "middle", "base"];
const WIDTHS: Record<number, number[]> = { 1: [100], 2: [74, 100], 3: [58, 80, 100] };
const TONES = [
  "var(--color-petal-400)",
  "var(--color-gold)",
  "var(--color-sage)",
  "var(--color-lavender-dark)",
  "var(--color-rose)",
  "var(--color-amber-dark)",
];

/** The same note always gets the same color. */
function toneFor(note: string) {
  let hash = 0;
  for (const ch of note.toLowerCase()) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length];
}

type Active = { level: NoteLevel; note: string; tone: string; x: number; y: number; id: number };

export default function ScentPyramid({
  levels,
  other,
}: {
  levels: Record<NoteLevel, string[]>;
  other: string[];
}) {
  const t = useTranslations("notes");
  const wrap = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);
  const [inView, setInView] = useState(false);
  const [active, setActive] = useState<Active | null>(null);

  // the layers rise into place the first time the pyramid is seen
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const shown = ORDER.filter((level) => levels[level].length > 0);
  const widths = WIDTHS[shown.length] ?? [100];

  function pick(level: NoteLevel, note: string, chip: HTMLElement) {
    if (active?.level === level && active.note === note) {
      setActive(null);
      return;
    }
    const box = wrap.current?.getBoundingClientRect();
    const c = chip.getBoundingClientRect();
    const x = box && box.width > 0 ? ((c.left + c.width / 2 - box.left) / box.width) * 100 : 50;
    const y = box && box.height > 0 ? ((c.top + c.height / 2 - box.top) / box.height) * 100 : 50;
    setActive({ level, note, tone: toneFor(note), x, y, id: nextId.current++ });
  }

  return (
    <div>
      <div
        ref={wrap}
        data-in={inView}
        className="pyramid relative mx-auto max-w-lg overflow-hidden rounded-3xl border border-petal-200/60 bg-linear-to-b from-white/70 to-petal-50/70 p-4 sm:p-6"
      >
        {active && (
          <span
            key={active.id}
            aria-hidden
            className="pyramid-bloom"
            style={
              {
                "--bx": `${active.x}%`,
                "--by": `${active.y}%`,
                background: `radial-gradient(circle at ${active.x}% ${active.y}%, color-mix(in srgb, ${active.tone} 40%, transparent), transparent 64%)`,
              } as React.CSSProperties
            }
          />
        )}

        <div className="relative space-y-3">
          {shown.map((level, idx) => (
            <section
              key={level}
              style={{ width: `${widths[idx]}%`, "--i": shown.length - 1 - idx } as React.CSSProperties}
              className="pyramid-layer mx-auto rounded-2xl border border-white/80 bg-white/75 px-4 py-3 text-center shadow-sm backdrop-blur-sm"
            >
              <h3 className="font-sans text-xs font-semibold uppercase tracking-[0.22em] text-rose-dark">
                {t(`levels.${level}`)}
              </h3>
              <p className="mt-1 text-xs text-cocoa/60">{t(`hints.${level}`)}</p>
              <ul className="mt-3 flex flex-wrap justify-center gap-2">
                {levels[level].map((note) => {
                  const pressed = active?.level === level && active.note === note;
                  return (
                    <li key={note}>
                      <button
                        type="button"
                        aria-pressed={pressed}
                        onClick={(event) => pick(level, note, event.currentTarget)}
                        className={`rounded-full border px-3 py-1 text-sm transition-all hover:-translate-y-0.5 ${
                          pressed
                            ? "border-rose-dark bg-petal-200 text-rose-dark"
                            : "border-petal-300/70 bg-white hover:border-rose-dark"
                        }`}
                      >
                        {note}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-cocoa/55">{t("hint")}</p>

      {other.length > 0 && (
        <ul className="mt-3 space-y-1 text-center text-sm text-cocoa/75">
          {other.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}