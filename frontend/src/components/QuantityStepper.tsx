"use client";

import { Minus, Plus } from "lucide-react";

type Props = {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  decreaseLabel: string;
  increaseLabel: string;
  disabled?: boolean;
};

export default function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  decreaseLabel,
  increaseLabel,
  disabled = false,
}: Props) {
  const button =
    "flex h-10 w-10 items-center justify-center rounded-full hover:bg-blush disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="inline-flex items-center rounded-full border border-rose/40">
      <button
        type="button"
        aria-label={decreaseLabel}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        className={button}
      >
        <Minus className="h-4 w-4" aria-hidden />
      </button>
      <span className="w-8 text-center text-sm font-medium" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label={increaseLabel}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        className={button}
      >
        <Plus className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}