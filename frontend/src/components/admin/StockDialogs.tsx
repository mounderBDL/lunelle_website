"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { ApiError, adminFetch } from "@/lib/admin/api";
import type { AdminVariant, StockMovement } from "@/lib/admin/catalogTypes";
import { formatStamp } from "@/lib/admin/format";
import { parseWhole } from "@/lib/admin/numbers";
import Dialog from "./Dialog";
import { ErrorNote, Field, PRIMARY, SECONDARY, inputClass } from "./FormBits";
import { useToast } from "./Toasts";

type Kind = "RESTOCK" | "ADD" | "REMOVE";
const KINDS: Kind[] = ["RESTOCK", "ADD", "REMOVE"];
const LABEL_KEY = { RESTOCK: "restock", ADD: "addFix", REMOVE: "removeFix" } as const;

export function StockDialog({
  variant,
  productName,
  onClose,
}: {
  variant: AdminVariant;
  productName: string;
  onClose: () => void;
}) {
  const t = useTranslations("admin.products.stock");
  const tc = useTranslations("admin.common");
  const queryClient = useQueryClient();
  const toast = useToast();

  const [kind, setKind] = useState<Kind>("RESTOCK");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [quantityError, setQuantityError] = useState<string | undefined>();

  const n = parseWhole(quantity, 100_000);
  const delta = n === null || n === 0 ? null : kind === "REMOVE" ? -n : n;
  const next = delta === null ? null : variant.stock + delta;
  const negative = next !== null && next < 0;

  const save = useMutation({
    mutationFn: (body: object) =>
      adminFetch<{ variantId: string; stock: number }>(`/api/admin/variants/${variant.id}/stock`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.push({ title: t("saved") });
      onClose();
    },
  });

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (save.isPending) return;
    if (delta === null) {
      setQuantityError(t("errors.quantity"));
      return;
    }
    if (negative) return;
    save.mutate({ delta, reason: kind === "RESTOCK" ? "RESTOCK" : "ADJUSTMENT", note: note.trim() || null });
  }

  const error =
    save.error instanceof ApiError && save.error.message ? save.error.message : save.isError ? tc("error") : null;

  return (
    <Dialog title={`${t("title")} · ${variant.label}`} closeLabel={tc("close")} onClose={onClose}>
      <p className="mt-1 text-sm text-cocoa/70">
        {productName} · {t("current", { count: variant.stock })}
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-5 space-y-5">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">{t("type")}</legend>
          <div className="space-y-2">
            {KINDS.map((k) => (
              <label
                key={k}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${
                  k === kind ? "border-petal-700 bg-petal-100" : "border-petal-300/70 hover:border-petal-700"
                }`}
              >
                <input type="radio" name="stock-kind" checked={k === kind} onChange={() => setKind(k)} className="accent-petal-700" />
                {t(LABEL_KEY[k])}
              </label>
            ))}
          </div>
        </fieldset>

        <Field id="stock-quantity" label={t("quantity")} error={quantityError}>
          <input
            id="stock-quantity"
            inputMode="numeric"
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value);
              setQuantityError(undefined);
            }}
            autoFocus
            aria-invalid={Boolean(quantityError)}
            className={inputClass(quantityError)}
          />
        </Field>

        {next !== null && (
          <p className={`text-sm font-semibold tabular-nums ${negative ? "text-red-700" : "text-sage-dark"}`}>
            {negative ? t("negative") : t("newStock", { count: next })}
          </p>
        )}

        <Field id="stock-note" label={t("note")}>
          <input
            id="stock-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder={t("notePlaceholder")}
            className={inputClass()}
          />
        </Field>

        {error && <ErrorNote>{error}</ErrorNote>}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={SECONDARY}>
            {tc("cancel")}
          </button>
          <button type="submit" disabled={save.isPending || negative} className={PRIMARY}>
            {save.isPending ? tc("working") : t("save")}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export function HistoryDialog({
  variant,
  productName,
  onClose,
}: {
  variant: AdminVariant;
  productName: string;
  onClose: () => void;
}) {
  const t = useTranslations("admin.products.stock");
  const tc = useTranslations("admin.common");
  const locale = useLocale();

  const history = useQuery({
    queryKey: ["admin", "movements", variant.id],
    queryFn: () => adminFetch<StockMovement[]>(`/api/admin/variants/${variant.id}/movements`),
  });

  return (
    <Dialog title={`${t("historyTitle")} · ${variant.label}`} closeLabel={tc("close")} onClose={onClose}>
      <p className="mt-1 text-sm text-cocoa/70">
        {productName} · {t("current", { count: variant.stock })}
      </p>

      <div className="mt-5">
        {history.isPending ? (
          <div className="h-32 animate-pulse rounded-2xl bg-petal-100/70" aria-hidden />
        ) : history.isError ? (
          <p className="text-sm text-cocoa/70">{t("historyError")}</p>
        ) : history.data.length === 0 ? (
          <p className="text-sm text-cocoa/70">{t("historyEmpty")}</p>
        ) : (
          <ul className="divide-y divide-petal-100">
            {history.data.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{t(`reasons.${m.reason}`)}</p>
                  <p className="text-xs text-cocoa/50">{formatStamp(m.createdAt, locale)}</p>
                  {m.note && <p className="mt-0.5 text-sm text-cocoa/75">{m.note}</p>}
                  {m.orderId && (
                    <Link href={`/admin/orders/${m.orderId}`} onClick={onClose} className="text-xs font-semibold text-petal-700 underline">
                      {t("viewOrder")}
                    </Link>
                  )}
                </div>
                <div className="shrink-0 text-right tabular-nums">
                  <p className={`font-bold ${m.delta > 0 ? "text-sage-dark" : "text-terracotta-dark"}`}>
                    {m.delta > 0 ? "+" : ""}
                    {m.delta}
                  </p>
                  <p className="text-xs text-cocoa/50">→ {m.stockAfter}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}