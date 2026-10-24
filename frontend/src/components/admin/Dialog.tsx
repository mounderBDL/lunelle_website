"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";

type Props = { title: string; closeLabel: string; onClose: () => void; children: React.ReactNode };

export default function Dialog({ title, closeLabel, onClose, children }: Props) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  return (
    <div className="no-print fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        tabIndex={-1}
        className="absolute inset-0 bg-cocoa/40"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-cream p-6 shadow-2xl outline-none sm:max-w-lg sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-3xl">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="rounded-full p-2 text-cocoa/60 hover:bg-petal-100"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}