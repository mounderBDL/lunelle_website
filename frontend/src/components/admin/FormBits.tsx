"use client";

import { useId } from "react";

export const INPUT =
  "w-full rounded-xl border bg-white/80 px-4 py-2.5 text-sm outline-none transition-colors focus:border-petal-700 focus:ring-2 focus:ring-petal-300/50 disabled:opacity-60";

export const inputClass = (error?: string) => `${INPUT} ${error ? "border-red-600" : "border-petal-300/70"}`;

export const PRIMARY =
  "rounded-full bg-petal-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cocoa disabled:cursor-not-allowed disabled:opacity-50";

export const SECONDARY =
  "rounded-full border border-petal-300 bg-white/70 px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-petal-100 disabled:cursor-not-allowed disabled:opacity-50";

export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-cocoa/60">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      {children}
    </p>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="block text-sm font-semibold">
          {label}
        </label>
        {hint && <p className="mt-0.5 text-xs text-cocoa/60">{hint}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          checked ? "bg-petal-700" : "bg-cocoa/25"
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

/** The same text in English and French, side by side. */
export function LanguagePair({
  id,
  label,
  hint,
  error,
  en,
  fr,
  onEn,
  onFr,
  enLabel,
  frLabel,
  rows,
  maxLength,
  placeholder,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  en: string;
  fr: string;
  onEn: (value: string) => void;
  onFr: (value: string) => void;
  enLabel: string;
  frLabel: string;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
}) {
  const sides = [
    { code: "en", value: en, onChange: onEn, tag: enLabel },
    { code: "fr", value: fr, onChange: onFr, tag: frLabel },
  ];
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 block text-sm font-semibold">{label}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {sides.map((side) => (
          <div key={side.code}>
            <label
              htmlFor={`${id}-${side.code}`}
              className="mb-1 block text-xs font-semibold uppercase tracking-wider text-petal-700"
            >
              {side.tag}
            </label>
            {rows ? (
              <textarea
                id={`${id}-${side.code}`}
                value={side.value}
                onChange={(e) => side.onChange(e.target.value)}
                rows={rows}
                maxLength={maxLength}
                placeholder={placeholder}
                aria-invalid={Boolean(error)}
                className={inputClass(error)}
              />
            ) : (
              <input
                id={`${id}-${side.code}`}
                value={side.value}
                onChange={(e) => side.onChange(e.target.value)}
                maxLength={maxLength}
                placeholder={placeholder}
                aria-invalid={Boolean(error)}
                className={inputClass(error)}
              />
            )}
          </div>
        ))}
      </div>
      {hint && !error && <p className="mt-1.5 text-xs text-cocoa/60">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      )}
    </fieldset>
  );
}

const TONES = {
  pink: "bg-petal-200 text-petal-700",
  amber: "bg-amber-soft text-amber-dark",
  sage: "bg-sage-soft text-sage-dark",
  terracotta: "bg-terracotta-soft text-terracotta-dark",
  stone: "bg-stone-soft text-stone-dark",
  lavender: "bg-lavender text-lavender-dark",
} as const;

export function Chip({ tone, children }: { tone: keyof typeof TONES; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}>
      {children}
    </span>
  );
}