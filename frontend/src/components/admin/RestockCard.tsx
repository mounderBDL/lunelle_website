"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import QuantityStepper from "@/components/QuantityStepper";
import { ApiError, adminFetch } from "@/lib/admin/api";
import type { OrderDetail, RestockLine } from "@/lib/admin/types";
import { localized } from "@/lib/format";
import Card from "./Card";
import { ErrorNote, INPUT, PRIMARY } from "./FormBits";
import { useToast } from "./Toasts";

export default function RestockCard({ order }: { order: OrderDetail }) {
  const t = useTranslations("admin.detail.restock");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [draft, setDraft] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  const lines = order.restock;
  const open = lines.filter((l) => l.remaining > 0);
  // every line starts at "all of them are good"; she lowers the ones that came back damaged
  const quantity = (l: RestockLine) => Math.min(draft[l.variantId] ?? l.remaining, l.remaining);
  const total = open.reduce((sum, l) => sum + quantity(l), 0);

  const save = useMutation({
    mutationFn: (body: object) =>
      adminFetch<OrderDetail>(`/api/admin/orders/${order.id}/restock`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["orders", "detail", order.id], updated);
      void queryClient.invalidateQueries({ queryKey: ["admin"] }); // stock shown in the products screens
      void queryClient.invalidateQueries({ queryKey: ["stats"] }); // low stock
      setDraft({});
      setNote("");
      setProblem(null);
      toast.push({ title: t("done") });
    },
  });

  function submit() {
    if (save.isPending) return;
    const items = open
      .map((l) => ({ variantId: l.variantId, quantity: quantity(l) }))
      .filter((i) => i.quantity > 0);
    if (items.length === 0) {
      setProblem(t("nothing"));
      return;
    }
    setProblem(null);
    save.mutate({ items, note: note.trim() || null });
  }

  const error =
    save.error instanceof ApiError && save.error.message ? save.error.message : save.isError ? t("error") : null;

  return (
    <Card title={t("title")}>
      {open.length === 0 ? (
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-sage-dark">
            <Check className="h-4 w-4" aria-hidden />
            {t("all")}
          </p>
          <ul className="mt-3 space-y-1 text-sm text-cocoa/70">
            {lines.map((l) => (
              <li key={l.variantId}>
                {t("backLine", {
                  count: l.restocked,
                  name: localized(l.name, locale),
                  label: l.variantLabel || "—",
                })}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <p className="text-sm text-cocoa/75">{t("text")}</p>

          <ul className="mt-4 divide-y divide-petal-100">
            {open.map((l) => (
              <li key={l.variantId} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
                <div className="min-w-0">
                  <p className="font-semibold">{localized(l.name, locale)}</p>
                  <p className="text-sm text-cocoa/60">
                    {l.variantLabel && `${l.variantLabel} · `}
                    {t("ordered", { count: l.ordered })}
                    {l.restocked > 0 && ` · ${t("alreadyBack", { count: l.restocked })}`}
                  </p>
                </div>
                <QuantityStepper
                  value={quantity(l)}
                  min={0}
                  max={l.remaining}
                  onChange={(q) => {
                    setProblem(null);
                    setDraft((d) => ({ ...d, [l.variantId]: q }));
                  }}
                  decreaseLabel={t("decrease")}
                  increaseLabel={t("increase")}
                />
              </li>
            ))}
          </ul>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-semibold">{t("note")}</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={400}
              placeholder={t("notePlaceholder")}
              className={`${INPUT} border-petal-300/70`}
            />
          </label>

          {problem && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {problem}
            </p>
          )}
          {error && (
            <div className="mt-3">
              <ErrorNote>{error}</ErrorNote>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button type="button" onClick={submit} disabled={save.isPending} className={PRIMARY}>
              {save.isPending ? t("submitting") : t("submit", { count: total })}
            </button>
          </div>
        </>
      )}
    </Card>
  );
}