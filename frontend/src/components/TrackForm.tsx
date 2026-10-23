"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { lookupOrder, type LookupResult } from "@/lib/api/client";
import { normalizePhone } from "@/lib/phone";
import OrderDetails from "./OrderDetails";
import OrderStatusPanel from "./OrderStatusPanel";

const INPUT =
  "w-full rounded-xl border bg-white/70 px-4 py-3 text-base outline-none transition-colors focus:border-rose-dark focus:ring-2 focus:ring-rose/30";

type Errors = { code?: string; phone?: string };

export default function TrackForm({ initialCode }: { initialCode: string }) {
  const t = useTranslations("track");
  const [code, setCode] = useState(initialCode);
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (searching) return;

    const found: Errors = {};
    if (code.trim().length < 3) found.code = t("errors.code");
    if (normalizePhone(phone) === null) found.phone = t("errors.phone");
    setErrors(found);
    if (found.code || found.phone) return;

    setSearching(true);
    setResult(null);
    setResult(await lookupOrder(code.trim(), phone.trim()));
    setSearching(false);
  }

  return (
    <div>
      <form onSubmit={onSubmit} noValidate className="mx-auto mt-10 max-w-md space-y-5">
        <div>
          <label htmlFor="track-code" className="mb-1.5 block text-sm font-medium">
            {t("code")}
          </label>
          <input
            id="track-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t("codePlaceholder")}
            autoCapitalize="characters"
            autoComplete="off"
            aria-invalid={Boolean(errors.code)}
            className={`${INPUT} ${errors.code ? "border-red-600" : "border-rose/40"}`}
          />
          {errors.code && (
            <p role="alert" className="mt-1.5 text-sm text-red-700">
              {errors.code}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="track-phone" className="mb-1.5 block text-sm font-medium">
            {t("phone")}
          </label>
          <input
            id="track-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t("phonePlaceholder")}
            aria-invalid={Boolean(errors.phone)}
            className={`${INPUT} ${errors.phone ? "border-red-600" : "border-rose/40"}`}
          />
          {errors.phone && (
            <p role="alert" className="mt-1.5 text-sm text-red-700">
              {errors.phone}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={searching}
          className="w-full rounded-full bg-rose-dark px-8 py-3 text-sm font-medium tracking-wide text-white transition-colors hover:bg-cocoa disabled:cursor-not-allowed disabled:bg-cocoa/40"
        >
          {searching ? t("searching") : t("submit")}
        </button>
      </form>

      <div aria-live="polite">
        {result?.kind === "not-found" && (
          <p role="alert" className="mx-auto mt-8 max-w-md text-center text-cocoa/80">
            {t("notFound")}
          </p>
        )}
        {result?.kind === "limit" && (
          <p role="alert" className="mx-auto mt-8 max-w-md text-center text-cocoa/80">
            {t("tooMany")}
          </p>
        )}
        {result?.kind === "error" && (
          <p role="alert" className="mx-auto mt-8 max-w-md text-center text-cocoa/80">
            {t("error")}
          </p>
        )}
        {result?.kind === "found" && (
          <div className="mt-12 space-y-8">
            <div className="rounded-2xl border border-rose/20 bg-white/50 p-6 sm:p-8">
              <p className="text-center font-display text-3xl tracking-wide">{result.order.code}</p>
              <div className="mt-6">
                <OrderStatusPanel status={result.order.status} deliveryMethod={result.order.deliveryMethod} />
              </div>
            </div>
            <OrderDetails order={result.order} />
          </div>
        )}
      </div>
    </div>
  );
}