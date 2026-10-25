"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { History, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { ApiError, adminFetch } from "@/lib/admin/api";
import type { AdminProduct, AdminVariant } from "@/lib/admin/catalogTypes";
import { parseWhole } from "@/lib/admin/numbers";
import { formatMoney, localized } from "@/lib/format";
import Card from "./Card";
import ConfirmDialog from "./ConfirmDialog";
import { Chip, ErrorNote, Field, PRIMARY, SECONDARY, Toggle, inputClass } from "./FormBits";
import { HistoryDialog, StockDialog } from "./StockDialogs";
import { useToast } from "./Toasts";

type Draft = { label?: string; price?: string; cost?: string; sku?: string; active?: boolean };

export default function SizesManager({ product }: { product: AdminProduct }) {
  const t = useTranslations("admin.products.sizes");
  const tc = useTranslations("admin.common");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const toast = useToast();
  const productName = localized(product.name, locale);

  const [stockFor, setStockFor] = useState<AdminVariant | null>(null);
  const [historyFor, setHistoryFor] = useState<AdminVariant | null>(null);
  const [deleting, setDeleting] = useState<AdminVariant | null>(null);

  function apply(updated: AdminProduct) {
    queryClient.setQueryData(["admin", "products", product.id], updated);
    void queryClient.invalidateQueries({ queryKey: ["admin", "products", "all"] });
    void queryClient.invalidateQueries({ queryKey: ["stats"] });
  }

  return (
    <Card title={t("title")}>
      <p className="text-sm text-cocoa/70">{t("hint")}</p>

      <div className="mt-4 space-y-4">
        {product.variants.map((variant) => (
          <SizeCard
            key={variant.id}
            variant={variant}
            onApply={apply}
            onStock={() => setStockFor(variant)}
            onHistory={() => setHistoryFor(variant)}
            onDelete={() => setDeleting(variant)}
            canDelete={product.variants.length > 1}
          />
        ))}
      </div>

      <AddSize product={product} onApply={apply} />

      {stockFor && <StockDialog variant={stockFor} productName={productName} onClose={() => setStockFor(null)} />}
      {historyFor && <HistoryDialog variant={historyFor} productName={productName} onClose={() => setHistoryFor(null)} />}
      {deleting && (
        <ConfirmDialog
          title={t("deleteTitle")}
          text={t("deleteText", { label: deleting.label })}
          confirmLabel={tc("delete")}
          cancelLabel={tc("cancel")}
          closeLabel={tc("close")}
          workingLabel={tc("working")}
          errorFallback={tc("error")}
          danger
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            apply(await adminFetch<AdminProduct>(`/api/admin/variants/${deleting.id}`, { method: "DELETE" }));
            toast.push({ title: t("deleted") });
          }}
        />
      )}
    </Card>
  );
}

function SizeCard({
  variant,
  canDelete,
  onApply,
  onStock,
  onHistory,
  onDelete,
}: {
  variant: AdminVariant;
  canDelete: boolean;
  onApply: (product: AdminProduct) => void;
  onStock: () => void;
  onHistory: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("admin.products.sizes");
  const locale = useLocale();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft>({});
  const [error, setError] = useState<string | null>(null);

  const label = draft.label ?? variant.label;
  const price = draft.price ?? String(variant.price);
  const cost = draft.cost ?? (variant.costPrice === null ? "" : String(variant.costPrice));
  const sku = draft.sku ?? variant.sku ?? "";
  const active = draft.active ?? variant.active;
  const dirty = Object.keys(draft).length > 0;
  const patch = (p: Draft) => setDraft((d) => ({ ...d, ...p }));

  const save = useMutation({
    mutationFn: (body: object) =>
      adminFetch<AdminProduct>(`/api/admin/variants/${variant.id}`, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: (updated) => {
      onApply(updated);
      setDraft({});
      setError(null);
      toast.push({ title: t("saved") });
    },
    onError: (e) => setError(e instanceof ApiError && e.message ? e.message : t("errors.generic")),
  });

  function submit() {
    const p = parseWhole(price);
    const c = parseWhole(cost);
    if (!label.trim()) return setError(t("errors.label"));
    if (p === null || c === null) return setError(t("errors.number"));
    setError(null);
    save.mutate({
      label: label.trim(),
      sku: sku.trim() || null,
      price: p,
      costPrice: c,
      active,
      sortOrder: variant.sortOrder,
    });
  }

  const tone = variant.stock === 0 ? "terracotta" : variant.stock <= 3 ? "amber" : "sage";
  const marginPercent =
    variant.margin !== null && variant.finalPrice > 0 ? Math.round((variant.margin / variant.finalPrice) * 100) : null;

  return (
    <div className="rounded-2xl bg-petal-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-lg font-bold">{variant.label}</p>
          <Chip tone={tone}>{variant.stock === 0 ? t("outOfStock") : `${t("stock")}: ${variant.stock}`}</Chip>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onStock} className={`${SECONDARY} inline-flex items-center gap-2 !px-4 !py-2`}>
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            {t("adjust")}
          </button>
          <button type="button" onClick={onHistory} className={`${SECONDARY} inline-flex items-center gap-2 !px-4 !py-2`}>
            <History className="h-4 w-4" aria-hidden />
            {t("history")}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field id={`size-${variant.id}-label`} label={t("label")}>
          <input
            id={`size-${variant.id}-label`}
            value={label}
            onChange={(e) => patch({ label: e.target.value })}
            maxLength={50}
            className={inputClass()}
          />
        </Field>
        <Field id={`size-${variant.id}-price`} label={t("price")}>
          <input
            id={`size-${variant.id}-price`}
            inputMode="numeric"
            value={price}
            onChange={(e) => patch({ price: e.target.value })}
            className={inputClass()}
          />
        </Field>
        <Field id={`size-${variant.id}-cost`} label={t("cost")}>
          <input
            id={`size-${variant.id}-cost`}
            inputMode="numeric"
            value={cost}
            onChange={(e) => patch({ cost: e.target.value })}
            className={inputClass()}
          />
        </Field>
        <Field id={`size-${variant.id}-sku`} label={t("sku")}>
          <input
            id={`size-${variant.id}-sku`}
            value={sku}
            onChange={(e) => patch({ sku: e.target.value })}
            maxLength={60}
            className={inputClass()}
          />
        </Field>
      </div>

      <p className="mt-3 text-sm tabular-nums">
        {variant.margin === null ? (
          <span className="text-amber-dark">{t("noCost")}</span>
        ) : (
          <span className={variant.margin < 0 ? "font-semibold text-red-700" : "text-cocoa/75"}>
            {t("margin")}: {formatMoney(variant.margin, locale)}
            {marginPercent !== null && ` (${marginPercent}%)`}
          </span>
        )}
      </p>

      <div className="mt-4">
        <Toggle checked={active} onChange={(v) => patch({ active: v })} label={t("available")} />
      </div>

      {error && (
        <div className="mt-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onDelete}
          disabled={!canDelete}
          title={canDelete ? undefined : t("onlyOne")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-terracotta-dark hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          {t("delete")}
        </button>
        <button type="button" onClick={submit} disabled={!dirty || save.isPending} className={PRIMARY}>
          {save.isPending ? t("saving") : t("save")}
        </button>
      </div>
    </div>
  );
}

function AddSize({ product, onApply }: { product: AdminProduct; onApply: (product: AdminProduct) => void }) {
  const t = useTranslations("admin.products.sizes");
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ label: "", price: "", cost: "", stock: "0", sku: "" });
  const [error, setError] = useState<string | null>(null);
  const patch = (p: Partial<typeof form>) => setForm((f) => ({ ...f, ...p }));

  const add = useMutation({
    mutationFn: (body: object) =>
      adminFetch<AdminProduct>(`/api/admin/products/${product.id}/variants`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (updated) => {
      onApply(updated);
      setForm({ label: "", price: "", cost: "", stock: "0", sku: "" });
      setOpen(false);
      setError(null);
      toast.push({ title: t("added") });
    },
    onError: (e) => setError(e instanceof ApiError && e.message ? e.message : t("errors.generic")),
  });

  function submit() {
    const p = parseWhole(form.price);
    const c = parseWhole(form.cost);
    const s = parseWhole(form.stock, 100_000);
    if (!form.label.trim()) return setError(t("errors.label"));
    if (p === null || c === null || s === null) return setError(t("errors.number"));
    setError(null);
    add.mutate({
      label: form.label.trim(),
      sku: form.sku.trim() || null,
      price: p,
      costPrice: c,
      initialStock: s,
      active: true,
      sortOrder: Math.max(-1, ...product.variants.map((v) => v.sortOrder)) + 1,
    });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${SECONDARY} mt-4 inline-flex items-center gap-2`}>
        <Plus className="h-4 w-4" aria-hidden />
        {t("add")}
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-petal-300 p-4">
      <p className="font-bold">{t("add")}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field id="add-label" label={t("label")}>
          <input id="add-label" value={form.label} onChange={(e) => patch({ label: e.target.value })} placeholder={t("labelPlaceholder")} maxLength={50} className={inputClass()} />
        </Field>
        <Field id="add-price" label={t("price")}>
          <input id="add-price" inputMode="numeric" value={form.price} onChange={(e) => patch({ price: e.target.value })} className={inputClass()} />
        </Field>
        <Field id="add-cost" label={t("cost")}>
          <input id="add-cost" inputMode="numeric" value={form.cost} onChange={(e) => patch({ cost: e.target.value })} className={inputClass()} />
        </Field>
        <Field id="add-stock" label={t("initialStock")}>
          <input id="add-stock" inputMode="numeric" value={form.stock} onChange={(e) => patch({ stock: e.target.value })} className={inputClass()} />
        </Field>
        <Field id="add-sku" label={t("sku")}>
          <input id="add-sku" value={form.sku} onChange={(e) => patch({ sku: e.target.value })} maxLength={60} className={inputClass()} />
        </Field>
      </div>
      {error && (
        <div className="mt-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
      <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={() => setOpen(false)} className={SECONDARY}>
          {t("cancel")}
        </button>
        <button type="button" onClick={submit} disabled={add.isPending} className={PRIMARY}>
          {add.isPending ? t("saving") : t("addAction")}
        </button>
      </div>
    </div>
  );
}