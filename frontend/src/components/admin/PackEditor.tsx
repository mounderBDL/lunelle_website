"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import QuantityStepper from "@/components/QuantityStepper";
import { ApiError, adminFetch } from "@/lib/admin/api";
import type { AdminPack, AdminProduct } from "@/lib/admin/catalogTypes";
import { parseWhole } from "@/lib/admin/numbers";
import type { Localized } from "@/lib/api/types";
import { formatMoney, localized } from "@/lib/format";
import Card from "./Card";
import { ErrorNote, Field, INPUT, LanguagePair, PRIMARY, SECONDARY, Toggle, inputClass } from "./FormBits";
import PackPhoto from "./PackPhoto";
import { useToast } from "./Toasts";

const MAX_ITEMS = 10;
const MAX_QUANTITY = 20;

type Variant = AdminProduct["variants"][number];

type Line = {
  variantId: string;
  name: Localized;
  label: string;
  unitPrice: number;
  cost: number | null;
  quantity: number;
  stock: number;
  usable: boolean; // false when the product or size is hidden or archived
};

function makeLine(product: AdminProduct, variant: Variant, quantity: number): Line {
  return {
    variantId: variant.id,
    name: product.name,
    label: variant.label,
    unitPrice: variant.finalPrice,
    cost: variant.costPrice,
    quantity,
    stock: variant.stock,
    usable: true,
  };
}

function initialLines(pack: AdminPack | undefined, products: AdminProduct[]): Line[] {
  if (!pack) return [];
  return pack.items.map((item) => {
    for (const product of products) {
      const variant = product.variants.find((v) => v.id === item.variantId);
      if (variant) {
        return { ...makeLine(product, variant, item.quantity), usable: product.active && !product.archived && variant.active };
      }
    }
    // not in the list of active products: it is hidden or archived
    return {
      variantId: item.variantId,
      name: item.productName,
      label: item.variantLabel,
      unitPrice: item.unitPrice,
      cost: null,
      quantity: item.quantity,
      stock: item.stock,
      usable: false,
    };
  });
}

export default function PackEditor({ products, pack }: { products: AdminProduct[]; pack?: AdminPack }) {
  const t = useTranslations("admin.packs");
  const tf = useTranslations("admin.packs.form");
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [nameEn, setNameEn] = useState(pack?.name.en ?? "");
  const [nameFr, setNameFr] = useState(pack?.name.fr ?? "");
  const [descEn, setDescEn] = useState(pack?.description.en ?? "");
  const [descFr, setDescFr] = useState(pack?.description.fr ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(pack?.imageUrl ?? null);
  const [active, setActive] = useState(pack?.active ?? true);
  const [lines, setLines] = useState<Line[]>(() => initialLines(pack, products));
  const [priceText, setPriceText] = useState(pack ? String(pack.price) : "");
  const [pick, setPick] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const catalog = products.filter((p) => p.active && !p.archived);

  // ── numbers ──
  const units = lines.reduce((n, l) => n + l.quantity, 0);
  const individual = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const price = parseWhole(priceText);
  const allCosted = lines.length > 0 && lines.every((l) => l.cost !== null);
  const cost = allCosted ? lines.reduce((sum, l) => sum + (l.cost ?? 0) * l.quantity, 0) : null;
  const priceTooHigh = price !== null && lines.length > 0 && price >= individual;

  // ── items ──
  function setQuantity(variantId: string, quantity: number) {
    setNotice(null);
    setLines((all) => all.map((l) => (l.variantId === variantId ? { ...l, quantity } : l)));
  }

  function addPicked() {
    if (!pick) return;
    const existing = lines.find((l) => l.variantId === pick);
    if (existing) {
      if (existing.quantity >= MAX_QUANTITY) setNotice(tf("maxQuantity", { count: MAX_QUANTITY }));
      else setQuantity(pick, existing.quantity + 1);
    } else if (lines.length >= MAX_ITEMS) {
      setNotice(tf("maxItems", { count: MAX_ITEMS }));
    } else {
      for (const product of catalog) {
        const variant = product.variants.find((v) => v.id === pick);
        if (variant) {
          setLines((all) => [...all, makeLine(product, variant, 1)]);
          setNotice(null);
          break;
        }
      }
    }
    setPick("");
    setErrors((e) => ({ ...e, items: "" }));
  }

  // ── save ──
  const save = useMutation({
    mutationFn: (body: object) =>
      adminFetch<AdminPack>(pack ? `/api/admin/packs/${pack.id}` : "/api/admin/packs", {
        method: pack ? "PUT" : "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast.push({ title: pack ? t("saved") : t("created") });
      if (pack) queryClient.setQueryData(["admin", "packs", saved.id], saved);
      else router.push("/admin/packs");
    },
  });

  function validate() {
    const found: Record<string, string> = {};
    if (!nameEn.trim() && !nameFr.trim()) found.name = tf("errors.name");
    if (lines.length === 0 || units < 2) found.items = tf("errors.items");
    else if (lines.some((l) => !l.usable)) found.items = tf("errors.unusable");
    if (price === null || price < 1) found.price = tf("errors.price");
    else if (lines.length > 0 && price >= individual) {
      found.price = tf("errors.priceTooHigh", { total: formatMoney(individual, locale) });
    }
    return found;
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (save.isPending) return;
    const found = validate();
    setErrors(found);
    const focusIds: Record<string, string> = { name: "pack-name-en", items: "pack-add", price: "pack-price" };
    const focusId = focusIds[Object.keys(found)[0] ?? ""];
    if (focusId) {
      document.getElementById(focusId)?.focus();
      return;
    }
    save.mutate({
      name: { en: nameEn.trim() || nameFr.trim(), fr: nameFr.trim() || nameEn.trim() },
      description: { en: descEn.trim() || null, fr: descFr.trim() || null },
      imageUrl,
      price,
      active,
      sortOrder: pack?.sortOrder ?? 0,
      items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
    });
  }

  const stockText = (stock: number) => (stock > 0 ? tf("stock", { count: stock }) : tf("outOfStock"));
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
          <LanguagePair
            id="pack-name"
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
            id="pack-desc"
            label={tf("description")}
            hint={tf("descriptionHint")}
            en={descEn}
            fr={descFr}
            onEn={setDescEn}
            onFr={setDescFr}
            enLabel={tf("english")}
            frLabel={tf("french")}
            rows={3}
            maxLength={5000}
          />
          <PackPhoto value={imageUrl} onChange={setImageUrl} />
          <div className="border-t border-petal-200 pt-5">
            <Toggle checked={active} onChange={setActive} label={tf("visible")} hint={tf("visibleHint")} />
          </div>
        </div>
      </Card>

      <Card title={tf("contents")}>
        <p className="text-sm text-cocoa/70">{tf("contentsHint")}</p>

        {lines.length === 0 ? (
          <p className="mt-4 text-sm text-cocoa/60">{tf("empty")}</p>
        ) : (
          <ul className="mt-4 divide-y divide-petal-100">
            {lines.map((line) => (
              <li key={line.variantId} className="py-4 first:pt-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{localized(line.name, locale)}</p>
                    <p className="text-sm text-cocoa/60">
                      {line.label} · <span className="tabular-nums">{formatMoney(line.unitPrice, locale)}</span>{" "}
                      {tf("each")} · {stockText(line.stock)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {line.usable && (
                      <QuantityStepper
                        value={line.quantity}
                        max={MAX_QUANTITY}
                        onChange={(q) => setQuantity(line.variantId, q)}
                        onBlocked={() => setNotice(tf("maxQuantity", { count: MAX_QUANTITY }))}
                        decreaseLabel={tf("decrease")}
                        increaseLabel={tf("increase")}
                      />
                    )}
                    <span className="w-24 text-right text-sm font-semibold tabular-nums">
                      {formatMoney(line.unitPrice * line.quantity, locale)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setNotice(null);
                        setLines((all) => all.filter((l) => l.variantId !== line.variantId));
                      }}
                      aria-label={tf("remove")}
                      title={tf("remove")}
                      className="rounded-full p-2 text-cocoa/60 hover:bg-petal-100 hover:text-terracotta-dark"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>
                {!line.usable && <p className="mt-2 text-sm text-amber-dark">{tf("unusable")}</p>}
              </li>
            ))}
          </ul>
        )}

        {notice && (
          <p role="status" className="mt-3 text-sm text-amber-dark">
            {notice}
          </p>
        )}
        {errors.items && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {errors.items}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-3 border-t border-petal-200 pt-4">
          <select
            id="pack-add"
            aria-label={tf("addLabel")}
            value={pick}
            onChange={(e) => setPick(e.target.value)}
            className={`${INPUT} min-w-0 flex-1 border-petal-300/70`}
          >
            <option value="">{tf("choose")}</option>
            {catalog.map((product) => (
              <optgroup key={product.id} label={localized(product.name, locale)}>
                {product.variants
                  .filter((v) => v.active)
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label} · {formatMoney(v.finalPrice, locale)} · {stockText(v.stock)}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          <button type="button" onClick={addPicked} disabled={!pick} className={SECONDARY}>
            {tf("add")}
          </button>
        </div>
      </Card>

      <Card title={tf("pricing")}>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field id="pack-price" label={tf("price")} hint={tf("priceHint")} error={errors.price}>
            <input
              id="pack-price"
              inputMode="numeric"
              value={priceText}
              onChange={(e) => {
                setPriceText(e.target.value);
                setErrors((er) => ({ ...er, price: "" }));
              }}
              aria-invalid={Boolean(errors.price)}
              className={inputClass(errors.price)}
            />
          </Field>

          <div className="space-y-2 rounded-2xl bg-petal-50 p-4 text-sm tabular-nums">
            <p className="flex justify-between gap-4">
              <span>{tf("separately")}</span>
              <span>{formatMoney(individual, locale)}</span>
            </p>
            <p className="flex justify-between gap-4">
              <span>{tf("yourPrice")}</span>
              <span className="font-bold">{price === null ? "—" : formatMoney(price, locale)}</span>
            </p>
            {price !== null && lines.length > 0 && !priceTooHigh && (
              <p className="flex justify-between gap-4 font-semibold text-sage-dark">
                <span>{tf("saving")}</span>
                <span>
                  {formatMoney(individual - price, locale)} ({Math.round(((individual - price) / individual) * 100)}%)
                </span>
              </p>
            )}
            {priceTooHigh && (
              <p role="alert" className="text-red-700">
                {tf("errors.priceTooHigh", { total: formatMoney(individual, locale) })}
              </p>
            )}
            {cost !== null && price !== null ? (
              <>
                <p className="flex justify-between gap-4 border-t border-petal-200 pt-2 text-cocoa/70">
                  <span>{tf("cost")}</span>
                  <span>{formatMoney(cost, locale)}</span>
                </p>
                <p
                  className={`flex justify-between gap-4 font-semibold ${price - cost < 0 ? "text-red-700" : "text-cocoa/80"}`}
                >
                  <span>{tf("margin")}</span>
                  <span>{formatMoney(price - cost, locale)}</span>
                </p>
              </>
            ) : (
              lines.length > 0 && <p className="border-t border-petal-200 pt-2 text-amber-dark">{tf("noCost")}</p>
            )}
          </div>
        </div>
      </Card>

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="flex justify-end">
        <button type="submit" disabled={save.isPending} className={`${PRIMARY} px-10`}>
          {save.isPending ? tf("saving") : pack ? tf("save") : tf("create")}
        </button>
      </div>
    </form>
  );
}