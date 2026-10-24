"use client";

import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

export default function CopyButton({ text, label }: { text: string; label: string }) {
  const t = useTranslations("admin.common");
  const [done, setDone] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // older browsers: select and copy a temporary text area
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setDone(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setDone(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      title={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-petal-300/70 bg-white/70 text-cocoa/70 hover:bg-petal-100"
    >
      {done ? <Check className="h-4 w-4 text-sage-dark" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      <span className="sr-only" aria-live="polite">
        {done ? t("copied") : ""}
      </span>
    </button>
  );
}