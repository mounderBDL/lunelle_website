"use client";

import { Check, Hand, Store, Truck, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { DeliveryMethod } from "@/lib/api/types";

const ICONS: Record<DeliveryMethod, LucideIcon> = { HAND_TO_HAND: Hand, HOME: Truck, STOP_DESK: Store };
const ORDER: DeliveryMethod[] = ["HAND_TO_HAND", "HOME", "STOP_DESK"];

type Props = {
  value: DeliveryMethod;
  onChange: (method: DeliveryMethod) => void;
  /** The small line on each card: "Free", "From 600 DZD"… */
  badges: Record<DeliveryMethod, string | null>;
  /** A method nobody can use right now (for example no Yalidine office has been set yet). */
  unavailable: Record<DeliveryMethod, boolean>;
  labelId: string;
};

export default function DeliveryCards({ value, onChange, badges, unavailable, labelId }: Props) {
  const t = useTranslations("checkout");

  return (
    <div role="radiogroup" aria-labelledby={labelId} className="mt-5 grid gap-3 sm:grid-cols-3">
      {ORDER.map((method) => {
        const Icon = ICONS[method];
        const selected = method === value;
        const off = unavailable[method];
        const badge = off ? t("cards.soon") : badges[method];

        return (
          <label
            key={method}
            data-method={method}
            data-selected={selected}
            className={`delivery-card relative flex flex-row items-center gap-4 rounded-2xl border p-4 transition-all duration-300 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-rose-dark has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-cream sm:flex-col sm:items-start sm:gap-0 ${
              off
                ? "cursor-not-allowed border-rose/20 bg-white/30 opacity-60"
                : selected
                  ? "-translate-y-0.5 cursor-pointer border-rose-dark bg-blush shadow-[0_16px_34px_-18px_rgba(154,85,96,0.7)]"
                  : "cursor-pointer border-rose/30 bg-white/50 hover:-translate-y-0.5 hover:border-rose-dark"
            }`}
          >
            <input
              type="radio"
              name="delivery"
              value={method}
              checked={selected}
              disabled={off}
              onChange={() => onChange(method)}
              className="sr-only"
            />

            <span
              className={`delivery-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
                selected ? "bg-rose-dark text-white" : "bg-blush text-rose-dark"
              }`}
            >
              <Icon className="h-6 w-6" aria-hidden />
            </span>

            <span className="block min-w-0 sm:mt-3">
              <span className="block font-display text-xl leading-tight">{t(`methods.${method}.title`)}</span>
              <span className="mt-1 block text-sm text-cocoa/70">{t(`methods.${method}.text`)}</span>
              {badge && (
                <span
                  className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    off ? "bg-stone-soft text-stone-dark" : method === "HAND_TO_HAND" ? "bg-sage-soft text-sage-dark" : "bg-petal-100 text-petal-700"
                  }`}
                >
                  {badge}
                </span>
              )}
            </span>

            {selected && (
              <span
                aria-hidden
                className="cart-pop absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-rose-dark text-white"
              >
                <Check className="h-3.5 w-3.5" />
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}