"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { ApiError, adminFetch } from "@/lib/admin/api";
import type { AdminProduct } from "@/lib/admin/catalogTypes";
import { fromAlgiersInput, toAlgiersInput } from "@/lib/admin/format";
import { discountedPrice, parseWhole } from "@/lib/admin/numbers";
import { formatMoney } from "@/lib/format";
import Card from "./Card";
import { Chip, ErrorNote, Field, PRIMARY, Toggle, inputClass } from "./FormBits";
import { useToast } from "./Toasts";

export default function DiscountCard({ product }: { product: AdminProduct }) {
  const t = useTranslations("admin.products.discount");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const toast = useToast();
  const d = product.discount;

  const [active, setActive] = useState(d.active);
  const [type, setType] = useState<"PERCENT" | "FIXED">(d.type ?? "PERCENT");
  const [value, setValue] = useState(d.value === null ? "" : String(d.value));
  const [starts, setStarts] = useState(toAlgiersInput(d.startsAt));
  const [ends, setEnds] = useState(toAlgiersInput(d.endsAt));
  const [error, setError] = useState<string | null>(null);

  const cheapest = product.variants.length ? Math.min(...product.variants.map((v) => v.price)) : 0;
     const n = parseWhole(value);
     // the value to preview: only when it is a valid discount
     const previewValue = n !== null && n >= 1 && (type === "PERCENT" ? n <= 99 : n < cheapest) ? n : null;

  const save = useMutation({
    mutationFn: (body: object) =>
      adminFetch<AdminProduct>(`/api/admin/products/${product.id}/discount`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["admin", "products", product.id], updated);
      void queryClient.invalidateQueries({ queryKey: ["admin", "products", "all"] });
      setError(null);
      toast.push({ title: t("saved") });
    },
    onError: (e) => setError(e instanceof ApiError && e.message ? e.message : t("errors.generic")),
  });

  function submit() {
    const startIso = fromAlgiersInput(starts);
    const endIso = fromAlgiersInput(ends);
    if (active) {
      if (n === null || n < 1) return setError(t("errors.value"));
      if (type === "PERCENT" && n > 99) return setError(t("errors.percent"));
      if (type === "FIXED" && n >= cheapest) return setError(t("errors.fixed", { price: formatMoney(cheapest, locale) }));
      if (startIso && endIso && Date.parse(endIso) <= Date.parse(startIso)) return setError(t("errors.dates"));
    }
    setError(null);
    save.mutate({
      active,
      type,
      value: n !== null && n >= 1 ? n : null,
      startsAt: startIso,
      endsAt: endIso,
    });
  }

  const status = !d.active ? "off" : d.effective ? "live" : "scheduled";
    const belowCost =
       previewValue !== null &&
       product.variants.some((v) => v.costPrice !== null && discountedPrice(v.price, type, previewValue) < v.costPrice);
  return (
    <Card
      title={t("title")}
      action={<Chip tone={status === "live" ? "sage" : status === "off" ? "stone" : "amber"}>{t(`status.${status}`)}</Chip>}
    >
      <p className="text-sm text-cocoa/70">{t("text")}</p>

      <div className="mt-5 space-y-5">
        <Toggle checked={active} onChange={setActive} label={t("on")} hint={t("onHint")} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="disc-type" label={t("type")}>
            <select id="disc-type" value={type} onChange={(e) => setType(e.target.value as "PERCENT" | "FIXED")} className={inputClass()}>
              <option value="PERCENT">{t("percent")}</option>
              <option value="FIXED">{t("fixed")}</option>
            </select>
          </Field>
          <Field id="disc-value" label={t("value")}>
            <input id="disc-value" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} className={inputClass()} />
          </Field>
          <Field id="disc-starts" label={t("starts")}>
            <input id="disc-starts" type="datetime-local" value={starts} onChange={(e) => setStarts(e.target.value)} className={inputClass()} />
          </Field>
          <Field id="disc-ends" label={t("ends")}>
            <input id="disc-ends" type="datetime-local" value={ends} onChange={(e) => setEnds(e.target.value)} className={inputClass()} />
          </Field>
        </div>
        <p className="text-xs text-cocoa/60">{t("datesHint")}</p>

        {previewValue !== null && (
          <div className="rounded-2xl bg-petal-50 p-4">
            <p className="text-sm font-semibold">{t("preview")}</p>
            <ul className="mt-2 space-y-1 text-sm tabular-nums">
              {product.variants.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>{v.label}</span>
                  <span>
                    <span className="text-cocoa/50 line-through">{formatMoney(v.price, locale)}</span>
                    {" → "}
                    <span className="font-bold text-petal-700">{formatMoney(discountedPrice(v.price, type, previewValue), locale)}</span>
                  </span>
                </li>
              ))}
            </ul>
            {belowCost && (
              <p className="mt-3 flex items-start gap-2 text-sm text-amber-dark">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {t("belowCost")}
              </p>
            )}
          </div>
        )}

        {error && <ErrorNote>{error}</ErrorNote>}

        <div className="flex justify-end">
          <button type="button" onClick={submit} disabled={save.isPending} className={PRIMARY}>
            {save.isPending ? t("saving") : t("save")}
          </button>
        </div>
      </div>
    </Card>
  );
}