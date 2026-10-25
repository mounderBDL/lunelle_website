"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { ApiError, adminFetch } from "@/lib/admin/api";
import type { AdminCategory, AdminProduct } from "@/lib/admin/catalogTypes";
import { parseWhole } from "@/lib/admin/numbers";
import Card from "./Card";
import { ErrorNote, Field, LanguagePair, PRIMARY, SECONDARY, Toggle, inputClass } from "./FormBits";
import { useToast } from "./Toasts";

type SizeDraft = { key: string; label: string; price: string; cost: string; stock: string; sku: string };

const emptySize = (key: string): SizeDraft => ({ key, label: "", price: "", cost: "", stock: "0", sku: "" });

export default function ProductForm({ categories, product }: { categories: AdminCategory[]; product?: AdminProduct }) {
  const t = useTranslations("admin.products");
  const tf = useTranslations("admin.products.form");
  const ts = useTranslations("admin.products.sizes");
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [nameEn, setNameEn] = useState(product?.name.en ?? "");
  const [nameFr, setNameFr] = useState(product?.name.fr ?? "");
  const [descEn, setDescEn] = useState(product?.description.en ?? "");
  const [descFr, setDescFr] = useState(product?.description.fr ?? "");
  const [notesEn, setNotesEn] = useState(product?.scentNotes.en ?? "");
  const [notesFr, setNotesFr] = useState(product?.scentNotes.fr ?? "");
  const [badge, setBadge] = useState(product?.badge ?? "");
  const [active, setActive] = useState(product?.active ?? true);
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const nextKey = useRef(1);
  const [sizes, setSizes] = useState<SizeDraft[]>([emptySize("s0")]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: (body: object) =>
      adminFetch<AdminProduct>(product ? `/api/admin/products/${product.id}` : "/api/admin/products", {
        method: product ? "PUT" : "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (saved) => {
      queryClient.setQueryData(["admin", "products", saved.id], saved);
      void queryClient.invalidateQueries({ queryKey: ["admin", "products", "all"] });
      toast.push({ title: product ? t("saved") : t("created") });
      if (!product) router.push(`/admin/products/${saved.id}`);
    },
  });

  function patchSize(key: string, patch: Partial<SizeDraft>) {
    setSizes((all) => all.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  function validate() {
    const found: Record<string, string> = {};
    if (!categoryId) found.category = tf("errors.category");
    if (!nameEn.trim() && !nameFr.trim()) found.name = tf("errors.name");
    if (!product) {
      const seen = new Set<string>();
      for (const s of sizes) {
        const label = s.label.trim().toLowerCase();
        if (!label) found.sizes = ts("errors.label");
        else if (seen.has(label)) found.sizes = ts("errors.duplicate");
        seen.add(label);
        if (
          parseWhole(s.price) === null ||
          parseWhole(s.cost) === null ||
          parseWhole(s.stock, 100_000) === null
        ) {
          found.sizes = ts("errors.number");
        }
      }
    }
    return found;
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (save.isPending) return;
    const found = validate();
    setErrors(found);
    const focusIds: Record<string, string> = { category: "pf-category", name: "pf-name-en", sizes: "pf-sizes" };
    const focusId = focusIds[Object.keys(found)[0] ?? ""];
    if (focusId) {
      document.getElementById(focusId)?.focus();
      return;
    }

    const common = {
      categoryId,
      name: { en: nameEn.trim() || nameFr.trim(), fr: nameFr.trim() || nameEn.trim() },
      description: { en: descEn.trim() || null, fr: descFr.trim() || null },
      scentNotes: { en: notesEn.trim() || null, fr: notesFr.trim() || null },
      badge: badge.trim() || null,
      active,
      featured,
      sortOrder: product?.sortOrder ?? 0,
    };
    save.mutate(
      product
        ? common
        : {
            ...common,
            variants: sizes.map((s, i) => ({
              label: s.label.trim(),
              sku: s.sku.trim() || null,
              price: parseWhole(s.price),
              costPrice: parseWhole(s.cost),
              initialStock: parseWhole(s.stock, 100_000),
              active: true,
              sortOrder: i,
            })),
          },
    );
  }

  const error =
    save.error instanceof ApiError && save.error.message
      ? save.error.message
      : save.isError
        ? tf("errors.generic")
        : null;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Card title={tf("details")}>
        <div className="space-y-5">
          <Field id="pf-category" label={tf("category")} error={errors.category}>
            <select
              id="pf-category"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setErrors((er) => ({ ...er, category: "" }));
              }}
              aria-invalid={Boolean(errors.category)}
              className={inputClass(errors.category)}
            >
              <option value="">{tf("selectCategory")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name.en ?? c.name.fr}
                  {c.active ? "" : ` (${t("chips.hidden")})`}
                </option>
              ))}
            </select>
          </Field>

          <LanguagePair
            id="pf-name"
            label={tf("name")}
            hint={tf("nameHint")}
            error={errors.name}
            en={nameEn}
            fr={nameFr}
            onEn={setNameEn}
            onFr={setNameFr}
            enLabel={tf("english")}
            frLabel={tf("french")}
            maxLength={200}
          />
          <LanguagePair
            id="pf-desc"
            label={tf("description")}
            hint={tf("descriptionHint")}
            en={descEn}
            fr={descFr}
            onEn={setDescEn}
            onFr={setDescFr}
            enLabel={tf("english")}
            frLabel={tf("french")}
            rows={4}
            maxLength={5000}
          />
          <LanguagePair
            id="pf-notes"
            label={tf("notes")}
            hint={tf("notesHint")}
            en={notesEn}
            fr={notesFr}
            onEn={setNotesEn}
            onFr={setNotesFr}
            enLabel={tf("english")}
            frLabel={tf("french")}
            rows={4}
            maxLength={5000}
            placeholder={tf("notesPlaceholder")}
          />

          <Field id="pf-badge" label={tf("badge")} hint={tf("badgeHint")}>
            <input
              id="pf-badge"
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
              maxLength={30}
              className={inputClass()}
            />
          </Field>

          <div className="space-y-4 border-t border-petal-200 pt-5">
            <Toggle checked={active} onChange={setActive} label={tf("visible")} hint={tf("visibleHint")} />
            <Toggle checked={featured} onChange={setFeatured} label={tf("featured")} hint={tf("featuredHint")} />
          </div>
        </div>
      </Card>

      {!product && (
        <Card title={ts("title")}>
          <p className="text-sm text-cocoa/70">{ts("createHint")}</p>
          <div id="pf-sizes" tabIndex={-1} className="mt-4 space-y-4 outline-none">
            {sizes.map((s, i) => (
              <div key={s.key} className="rounded-2xl bg-petal-50 p-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field id={`pf-size-${i}-label`} label={ts("label")}>
                    <input
                      id={`pf-size-${i}-label`}
                      value={s.label}
                      onChange={(e) => patchSize(s.key, { label: e.target.value })}
                      placeholder={ts("labelPlaceholder")}
                      maxLength={50}
                      className={inputClass()}
                    />
                  </Field>
                  <Field id={`pf-size-${i}-price`} label={ts("price")}>
                    <input
                      id={`pf-size-${i}-price`}
                      inputMode="numeric"
                      value={s.price}
                      onChange={(e) => patchSize(s.key, { price: e.target.value })}
                      className={inputClass()}
                    />
                  </Field>
                  <Field id={`pf-size-${i}-cost`} label={ts("cost")} hint={ts("costHint")}>
                    <input
                      id={`pf-size-${i}-cost`}
                      inputMode="numeric"
                      value={s.cost}
                      onChange={(e) => patchSize(s.key, { cost: e.target.value })}
                      className={inputClass()}
                    />
                  </Field>
                  <Field id={`pf-size-${i}-stock`} label={ts("initialStock")}>
                    <input
                      id={`pf-size-${i}-stock`}
                      inputMode="numeric"
                      value={s.stock}
                      onChange={(e) => patchSize(s.key, { stock: e.target.value })}
                      className={inputClass()}
                    />
                  </Field>
                  <Field id={`pf-size-${i}-sku`} label={ts("sku")}>
                    <input
                      id={`pf-size-${i}-sku`}
                      value={s.sku}
                      onChange={(e) => patchSize(s.key, { sku: e.target.value })}
                      maxLength={60}
                      className={inputClass()}
                    />
                  </Field>
                </div>
                {sizes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setSizes((all) => all.filter((x) => x.key !== s.key))}
                    className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-terracotta-dark hover:underline"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    {ts("remove")}
                  </button>
                )}
              </div>
            ))}
          </div>
          {errors.sizes && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {errors.sizes}
            </p>
          )}
          <button
            type="button"
            onClick={() => setSizes((all) => [...all, emptySize(`s${nextKey.current++}`)])}
            className={`${SECONDARY} mt-4 inline-flex items-center gap-2`}
          >
            <Plus className="h-4 w-4" aria-hidden />
            {ts("addAnother")}
          </button>
        </Card>
      )}

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="flex justify-end">
        <button type="submit" disabled={save.isPending} className={`${PRIMARY} px-10`}>
          {save.isPending ? tf("saving") : product ? tf("save") : tf("create")}
        </button>
      </div>
    </form>
  );
}