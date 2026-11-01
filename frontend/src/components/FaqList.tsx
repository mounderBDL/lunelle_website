"use client";

import { Plus } from "lucide-react";
import { useId, useState } from "react";

export type FaqEntry = { key: string; q: string; a: string };

/** An accordion: each question is a button, and its answer unfolds smoothly (see .faq-panel in globals.css). */
export default function FaqList({ items }: { items: FaqEntry[] }) {
  const base = useId();
  const [open, setOpen] = useState<Set<string>>(() => new Set());

  function toggle(key: string) {
    setOpen((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <ul className="mt-10 space-y-3">
      {items.map((item) => {
        const isOpen = open.has(item.key);
        const buttonId = `${base}-q-${item.key}`;
        const panelId = `${base}-a-${item.key}`;

        return (
          // the outer item rises into view; the inner card lifts when it is open
          <li key={item.key} data-sc="card">
            <div data-open={isOpen} className="faq-item rounded-2xl border border-rose/20 bg-white/70">
              <h3>
                <button
                  id={buttonId}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggle(item.key)}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left font-display text-xl outline-offset-2"
                >
                  <span>{item.q}</span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blush text-rose-dark">
                    <Plus
                      className={`h-4 w-4 transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`}
                      aria-hidden
                    />
                  </span>
                </button>
              </h3>
              <div id={panelId} role="region" aria-labelledby={buttonId} data-open={isOpen} className="faq-panel">
                <div className="overflow-hidden">
                  <p className="px-5 pb-5 text-cocoa/75">{item.a}</p>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}