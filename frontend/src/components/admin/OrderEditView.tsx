"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import QuantityStepper from "@/components/QuantityStepper";
import { ApiError, adminFetch } from "@/lib/admin/api";
import type { AdminPackLite, AdminProductLite, OrderDetail } from "@/lib/admin/types";
import { fetchCommunes } from "@/lib/api/client";
import type { Commune, DeliveryMethod, DeliveryWilaya, Localized } from "@/lib/api/types";
import { formatMoney, localized } from "@/lib/format";
import { normalizePhone } from "@/lib/phone";
import { MAX_PER_ITEM } from "@/store/cart";
import Card, { Skeleton } from "./Card";
import { useToast } from "./Toasts";
import { useOffices } from "@/lib/useOffices";

const METHODS: DeliveryMethod[] = ["HAND_TO_HAND", "HOME", "STOP_DESK"];
const FIELD =
  "w-full rounded-xl border bg-white/80 px-4 py-2.5 text-sm outline-none transition-colors focus:border-petal-700 focus:ring-2 focus:ring-petal-300/50 disabled:opacity-60";

type EditLine = {
  key: string;
  type: "VARIANT" | "PACK";
  refId: string | null;
  name: Localized;
  label: string | null;
  unitPrice: number;
  quantity: number;
  isNew: boolean;
};

type Errors = Record<string, string>;
type CommuneState = { key: string; list: Commune[] | null };

const fieldClass = (error?: string) => `${FIELD} ${error ? "border-red-600" : "border-petal-300/70"}`;

function methodAvailable(w: DeliveryWilaya, method: DeliveryMethod) {
  if (method === "HOME") return w.home.available;
  if (method === "STOP_DESK") return w.stopDesk.available;
  return true;
}

// ───────────────────────── page ─────────────────────────

export default function OrderEditView({ id }: { id: string }) {
  const t = useTranslations("admin.edit");
  const query = useQuery({
    queryKey: ["orders", "detail", id],
    queryFn: () => adminFetch<OrderDetail>(`/api/admin/orders/${id}`),
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 1,
  });

  const back = (
    <Link
      href={`/admin/orders/${id}`}
      className="inline-flex items-center gap-2 text-sm font-semibold text-cocoa/70 hover:text-petal-700"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      {t("back")}
    </Link>
  );

  if (query.isPending) {
    return (
      <div>
        {back}
        <div className="mt-6">
          <Skeleton />
        </div>
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div>
        {back}
        <Card className="mt-6 text-center">
          <p className="text-cocoa/75">{t("loadError")}</p>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="mt-4 rounded-full border border-petal-700 px-6 py-2 text-sm font-semibold text-petal-700 hover:bg-petal-100"
          >
            {t("retry")}
          </button>
        </Card>
      </div>
    );
  }

  const order = query.data;
  return (
    <div>
      {back}
      <h1 className="mt-4 text-4xl sm:text-5xl">{t("title")}</h1>
      <p className="mt-1 text-lg font-bold tabular-nums tracking-wide text-petal-700">{order.code}</p>
      {order.editable ? (
        <EditForm order={order} />
      ) : (
        <Card className="mt-6">
          <p className="text-cocoa/75">{t("notEditable")}</p>
        </Card>
      )}
    </div>
  );
}

// ───────────────────────── form ─────────────────────────

function EditForm({ order }: { order: OrderDetail }) {
  const t = useTranslations("admin.edit");
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [name, setName] = useState(order.customerName);
  const [phone, setPhone] = useState(order.phone);
  const [method, setMethod] = useState<DeliveryMethod>(order.deliveryMethod);
  const [wilayaId, setWilayaId] = useState(order.wilayaId === null ? "" : String(order.wilayaId));
  const [communeId, setCommuneId] = useState(order.communeId === null ? "" : String(order.communeId));
  const [address, setAddress] = useState(order.deliveryMethod === "HOME" ? (order.address ?? "") : "");
  const [officeId, setOfficeId] = useState(order.officeId === null ? "" : String(order.officeId));
  const [note, setNote] = useState(order.customerNote ?? "");
  const [lines, setLines] = useState<EditLine[]>(() =>
    order.items.map((item) => ({
      key: item.refId ? `${item.type}:${item.refId}` : `old:${item.id}`,
      type: item.type,
      refId: item.refId,
      name: item.name,
      label: item.type === "PACK" ? null : item.variantLabel,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      isNew: false,
    })),
  );
  const [pick, setPick] = useState("");
  const [notice, setNotice] = useState<{ key: string; text: string } | null>(null);
  const [errors, setErrors] = useState<Errors>({});

  // what the order holds right now: this stock is already reserved for it
  const originals = useMemo(() => {
    const map = new Map<string, { quantity: number; unitPrice: number }>();
    for (const item of order.items) {
      if (item.refId) map.set(`${item.type}:${item.refId}`, { quantity: item.quantity, unitPrice: item.unitPrice });
    }
    return map;
  }, [order.items]);

  // ── reference data (stock is always re-read when this page opens) ──
  const wilayas = useQuery({
    queryKey: ["delivery", "wilayas"],
    queryFn: () => adminFetch<DeliveryWilaya[]>("/api/delivery/wilayas"),
    staleTime: 5 * 60_000,
  });
  const products = useQuery({
    queryKey: ["admin", "products", "for-orders"],
    queryFn: () => adminFetch<AdminProductLite[]>("/api/admin/products"),
    staleTime: 0,
    refetchOnMount: "always",
  });
  const packs = useQuery({
    queryKey: ["admin", "packs", "for-orders"],
    queryFn: () => adminFetch<AdminPackLite[]>("/api/admin/packs"),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const stockByVariant = useMemo(() => {
    const map = new Map<string, number>();
    for (const product of products.data ?? []) {
      for (const variant of product.variants) map.set(variant.id, variant.stock);
    }
    return map;
  }, [products.data]);

  const unitsByPack = useMemo(() => {
    const map = new Map<string, number>();
    for (const pack of packs.data ?? []) map.set(pack.id, pack.availableUnits);
    return map;
  }, [packs.data]);

  /** The most this line can be raised to: what the order already holds plus what is still in stock. */
  function lineMax(line: EditLine): number {
    if (line.refId === null) return 0;
    const free = line.type === "VARIANT" ? stockByVariant.get(line.refId) : unitsByPack.get(line.refId);
    if (free === undefined) return MAX_PER_ITEM; // not loaded yet: the server checks again when saving
    const reserved = originals.get(line.key)?.quantity ?? 0;
    return Math.min(MAX_PER_ITEM, reserved + free);
  }

  function limitText(max: number) {
    return max < MAX_PER_ITEM ? t("limitStock", { count: max }) : t("limitMax", { count: MAX_PER_ITEM });
  }

  // ── communes (office delivery: only communes with a Yalidine office) ──
  const wilayaNum = wilayaId === "" ? null : Number(wilayaId);
  const selectedWilaya = wilayas.data?.find((w) => w.id === wilayaNum) ?? null;
  const destinationReady =
    method !== "HAND_TO_HAND" && selectedWilaya !== null && methodAvailable(selectedWilaya, method);
  const communeKey =
    destinationReady && wilayaNum !== null ? `${method === "STOP_DESK" ? "office" : "all"}|${wilayaNum}` : null;
  const [communeState, setCommuneState] = useState<CommuneState | null>(null);

  useEffect(() => {
    if (communeKey === null || wilayaNum === null) return;
    let cancelled = false;
    void (async () => {
      const list = await fetchCommunes(wilayaNum, method === "STOP_DESK");
      if (!cancelled) setCommuneState({ key: communeKey, list });
    })();
    return () => {
      cancelled = true;
    };
  }, [communeKey, wilayaNum, method]);

  const officeLookup = useOffices(method === "STOP_DESK" && communeId !== "" ? Number(communeId) : null);

  const communesReady = communeState !== null && communeState.key === communeKey;
  const communes = communesReady ? (communeState.list ?? []) : [];
  const communesFailed = communesReady && communeState.list === null;
  const noOfficeInWilaya = communesReady && !communesFailed && communes.length === 0 && method === "STOP_DESK";
  const offices = officeLookup.offices;
  const soleOffice = officeLookup.ready && offices.length === 1 ? offices[0] : null;
  const needsOffice = officeLookup.ready && offices.length > 1;
  const chosenOffice = soleOffice ?? offices.find((o) => String(o.id) === officeId) ?? null;

  // ── items ──
  const catalog = useMemo(
    () => ({
      products: (products.data ?? []).filter((p) => p.active && !p.archived),
      packs: (packs.data ?? []).filter((p) => p.active && !p.archived),
    }),
    [products.data, packs.data],
  );

  function setQuantity(key: string, quantity: number) {
    setNotice(null);
    setLines((all) => all.map((l) => (l.key === key ? { ...l, quantity } : l)));
  }

  function addPicked() {
    if (!pick) return;
    const type = pick.startsWith("V:") ? "VARIANT" : "PACK";
    const refId = pick.slice(2);
    const key = `${type}:${refId}`;
    const existing = lines.find((l) => l.key === key);

    if (existing) {
      const max = lineMax(existing);
      if (existing.quantity >= max) {
        setNotice({ key, text: limitText(max) });
      } else {
        setQuantity(key, existing.quantity + 1);
      }
    } else {
      const original = originals.get(key); // an item removed a moment ago comes back with its original price
      if (type === "VARIANT") {
        for (const product of catalog.products) {
          const variant = product.variants.find((v) => v.id === refId);
          if (variant) {
            setLines((all) => [
              ...all,
              {
                key,
                type,
                refId,
                name: product.name,
                label: variant.label,
                unitPrice: original ? original.unitPrice : variant.finalPrice,
                quantity: 1,
                isNew: !original,
              },
            ]);
            break;
          }
        }
      } else {
        const pack = catalog.packs.find((p) => p.id === refId);
        if (pack) {
          setLines((all) => [
            ...all,
            {
              key,
              type,
              refId,
              name: pack.name,
              label: null,
              unitPrice: original ? original.unitPrice : pack.price,
              quantity: 1,
              isNew: !original,
            },
          ]);
        }
      }
      setNotice(null);
    }
    setPick("");
    setErrors((e) => ({ ...e, items: "" }));
  }

  const keptLines = lines.filter((l) => l.refId !== null);
  const itemsTotal = keptLines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  // ── save ──
  const save = useMutation({
    mutationFn: (body: object) =>
      adminFetch<OrderDetail>(`/api/admin/orders/${order.id}`, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["orders", "detail", order.id], updated);
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast.push({ title: t("toast", { code: order.code }) });
      router.push(`/admin/orders/${order.id}`);
    },
  });

  function chooseMethod(next: DeliveryMethod) {
    if (next === method) return;
    setMethod(next);
    setCommuneId("");
    setOfficeId("");
    setErrors({});
    const current = wilayas.data?.find((w) => String(w.id) === wilayaId);
    if (current && !methodAvailable(current, next)) setWilayaId("");
  }

  function validate(): Errors {
    const found: Errors = {};
    if (name.trim().length < 2) found.name = t("errors.name");
    if (normalizePhone(phone) === null) found.phone = t("errors.phone");
    if (method !== "HAND_TO_HAND") {
      if (!destinationReady) found.wilaya = t("errors.wilaya");
      else if (communeId === "") found.commune = t("errors.commune");
      else if (method === "STOP_DESK" && (!officeLookup.ready || officeLookup.failed || (needsOffice && officeId === ""))) {
        found.office = officeLookup.failed ? t("officesError") : t("errors.office");
      }      
      if (method === "HOME" && address.trim().length < 5) found.address = t("errors.address");
    }
    if (keptLines.length === 0) found.items = t("errors.items");
    return found;
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (save.isPending) return;
    const found = validate();
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(`edit-${first}`)?.focus();
      return;
    }
    const hand = method === "HAND_TO_HAND";
    save.mutate({
      customerName: name.trim(),
      phone: phone.trim(),
      deliveryMethod: method,
      wilayaId: hand ? null : wilayaNum,
      communeId: hand ? null : Number(communeId),
      address: method === "HOME" ? address.trim() : null,
      officeId: method === "STOP_DESK" && chosenOffice ? chosenOffice.id : null,
      customerNote: note.trim() || null,
      items: keptLines.map((l) => ({ type: l.type, id: l.refId, quantity: l.quantity })),
    });
  }

  const wilayaLabel = (w: DeliveryWilaya) => {
    const base = `${String(w.id).padStart(2, "0")} - ${w.name}`;
    if (methodAvailable(w, method)) return base;
    return `${base} (${method === "STOP_DESK" ? t("noOffice") : t("unavailable")})`;
  };

  const stockText = (stock: number) => (stock > 0 ? t("inStock", { count: stock }) : t("outOfStock"));
  const saveError =
    save.error instanceof ApiError && save.error.message
      ? save.error.message
      : save.isError
        ? t("errors.generic")
        : null;

  return (
    <form onSubmit={onSubmit} noValidate className="mt-8 space-y-6">
      {/* ── customer ── */}
      <Card title={t("customer")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">{t("name")}</span>
            <input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              aria-invalid={Boolean(errors.name)}
              className={fieldClass(errors.name)}
            />
            {errors.name && <span className="mt-1 block text-sm text-red-700">{errors.name}</span>}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">{t("phone")}</span>
            <input
              id="edit-phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={30}
              aria-invalid={Boolean(errors.phone)}
              className={fieldClass(errors.phone)}
            />
            {errors.phone && <span className="mt-1 block text-sm text-red-700">{errors.phone}</span>}
          </label>
        </div>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-semibold">{t("note")}</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={500}
            className={fieldClass()}
          />
        </label>
      </Card>

      {/* ── delivery ── */}
      <Card title={t("delivery")}>
        <div role="radiogroup" aria-label={t("delivery")} className="grid gap-3 sm:grid-cols-3">
          {METHODS.map((m) => (
            <label
              key={m}
              className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${
                m === method ? "border-petal-700 bg-petal-100" : "border-petal-300/70 hover:border-petal-700"
              }`}
            >
              <input
                type="radio"
                name="method"
                checked={m === method}
                onChange={() => chooseMethod(m)}
                className="accent-petal-700"
              />
              {t(`methods.${m}`)}
            </label>
          ))}
        </div>

        <div className="mt-5 space-y-4">
          {method === "HAND_TO_HAND" ? (
            <p className="rounded-2xl bg-petal-50 px-4 py-3 text-sm text-cocoa/75">{t("handHint")}</p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold">{t("wilaya")}</span>
                  <select
                    id="edit-wilaya"
                    value={wilayaId}
                    onChange={(e) => {
                      setWilayaId(e.target.value);
                      setCommuneId("");
                      setOfficeId("");
                      setErrors((er) => ({ ...er, wilaya: "", commune: "", office:"" }));
                    }}
                    aria-invalid={Boolean(errors.wilaya)}
                    className={fieldClass(errors.wilaya)}
                  >
                    <option value="">{t("selectWilaya")}</option>
                    {(wilayas.data ?? []).map((w) => (
                      <option key={w.id} value={String(w.id)} disabled={!methodAvailable(w, method)}>
                        {wilayaLabel(w)}
                      </option>
                    ))}
                  </select>
                  {errors.wilaya && <span className="mt-1 block text-sm text-red-700">{errors.wilaya}</span>}
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold">{t("commune")}</span>
                  <select
                    id="edit-commune"
                    value={communeId}
                    onChange={(e) => {
                      setCommuneId(e.target.value);
                      setOfficeId("");
                      setErrors((er) => ({ ...er, commune: "", office:"" }));
                    }}
                    disabled={!destinationReady || !communesReady || communesFailed || noOfficeInWilaya}
                    aria-invalid={Boolean(errors.commune)}
                    className={fieldClass(errors.commune)}
                  >
                    <option value="">
                      {!destinationReady
                        ? t("chooseWilayaFirst")
                        : !communesReady
                          ? t("loadingCommunes")
                          : method === "STOP_DESK"
                            ? t("selectOffice")
                            : t("selectCommune")}
                    </option>
                    {communes.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {errors.commune && <span className="mt-1 block text-sm text-red-700">{errors.commune}</span>}
                </label>
              </div>

              {method === "STOP_DESK" && communeId !== "" && (
                <>
                  {!officeLookup.ready && <p className="text-sm text-cocoa/60">{t("loadingOffices")}</p>}
                  {officeLookup.failed && (
                    <p className="text-sm text-red-700">
                      {t("officesError")}{" "}
                      <button type="button" onClick={officeLookup.retry} className="underline">
                        {t("retry")}
                      </button>
                    </p>
                  )}
                  {soleOffice && (
                    <p className="rounded-2xl bg-petal-50 px-4 py-3 text-sm">
                      <span className="font-semibold">{soleOffice.name}</span>
                      {soleOffice.address ? ` - ${soleOffice.address}` : ""}
                    </p>
                  )}
                  {needsOffice && (
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-semibold">{t("office")}</span>
                      <select
                        id="edit-office"
                        value={officeId}
                        onChange={(e) => {
                          setOfficeId(e.target.value);
                          setErrors((er) => ({ ...er, office: "" }));
                        }}
                        aria-invalid={Boolean(errors.office)}
                        className={fieldClass(errors.office)}
                      >
                        <option value="">{t("selectOfficeChoice")}</option>
                        {offices.map((o) => (
                          <option key={o.id} value={String(o.id)}>
                            {o.address ? `${o.name} - ${o.address}` : o.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {errors.office && <p className="text-sm text-red-700">{errors.office}</p>}
                </>
              )}

              {communesFailed && <p className="text-sm text-red-700">{t("communesError")}</p>}
              {noOfficeInWilaya && <p className="text-sm text-red-700">{t("noOfficeInWilaya")}</p>}

              {method === "HOME" && (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold">{t("address")}</span>
                  <textarea
                    id="edit-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    maxLength={300}
                    aria-invalid={Boolean(errors.address)}
                    className={fieldClass(errors.address)}
                  />
                  {errors.address && <span className="mt-1 block text-sm text-red-700">{errors.address}</span>}
                </label>
              )}
            </>
          )}
        </div>
        <p className="mt-4 text-xs text-cocoa/60">{t("feeNote")}</p>
      </Card>

      {/* ── items ── */}
      <Card title={t("items")}>
        <ul className="divide-y divide-petal-100" id="edit-items" tabIndex={-1}>
          {lines.map((line) => {
            const max = lineMax(line);
            const over = line.refId !== null && line.quantity > max;
            return (
              <li key={line.key} className="py-4 first:pt-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{localized(line.name, locale)}</p>
                    <p className="text-sm text-cocoa/60">
                      {line.label}
                      {line.label && " · "}
                      <span className="tabular-nums">{formatMoney(line.unitPrice, locale)}</span>{" "}
                      <span className="text-xs">({line.isNew ? t("currentPrice") : t("keptPrice")})</span>
                    </p>
                    {line.refId === null && <p className="mt-1 text-sm text-amber-dark">{t("removed")}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    {line.refId !== null && (
                      <QuantityStepper
                        value={line.quantity}
                        max={max}
                        onChange={(q) => setQuantity(line.key, q)}
                        onBlocked={() => setNotice({ key: line.key, text: limitText(max) })}
                        decreaseLabel={t("decrease")}
                        increaseLabel={t("increase")}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setNotice(null);
                        setLines((all) => all.filter((l) => l.key !== line.key));
                      }}
                      aria-label={t("remove")}
                      title={t("remove")}
                      className="rounded-full p-2 text-cocoa/60 hover:bg-petal-100 hover:text-terracotta-dark"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>
                {over && (
                  <p role="alert" className="mt-2 text-sm text-red-700">
                    {limitText(max)}
                  </p>
                )}
                {notice?.key === line.key && (
                  <p role="status" className="mt-2 text-sm text-amber-dark">
                    {notice.text}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
        {errors.items && <p className="mt-2 text-sm text-red-700">{errors.items}</p>}

        <div className="mt-4 flex flex-wrap gap-3 border-t border-petal-200 pt-4">
          <select
            aria-label={t("addLabel")}
            value={pick}
            onChange={(e) => setPick(e.target.value)}
            className={`${FIELD} min-w-0 flex-1 border-petal-300/70`}
          >
            <option value="">{t("choose")}</option>
            {catalog.products.map((product) => (
              <optgroup key={product.id} label={localized(product.name, locale)}>
                {product.variants
                  .filter((v) => v.active)
                  .map((v) => (
                    <option key={v.id} value={`V:${v.id}`} disabled={!v.inStock}>
                      {v.label} · {formatMoney(v.finalPrice, locale)} · {stockText(v.stock)}
                    </option>
                  ))}
              </optgroup>
            ))}
            {catalog.packs.length > 0 && (
              <optgroup label={t("packs")}>
                {catalog.packs.map((p) => (
                  <option key={p.id} value={`P:${p.id}`} disabled={!p.inStock}>
                    {localized(p.name, locale)} · {formatMoney(p.price, locale)} · {stockText(p.availableUnits)}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <button
            type="button"
            onClick={addPicked}
            disabled={!pick}
            className="rounded-full border border-petal-700 px-6 py-2.5 text-sm font-semibold text-petal-700 hover:bg-petal-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("add")}
          </button>
        </div>

        <div className="mt-5 flex items-baseline justify-between border-t border-petal-200 pt-4">
          <span className="text-sm text-cocoa/70">{t("itemsTotal")}</span>
          <span className="text-xl font-bold tabular-nums">{formatMoney(itemsTotal, locale)}</span>
        </div>
        <p className="mt-2 text-xs text-cocoa/60">{t("stockNote")}</p>
      </Card>

      {saveError && (
        <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          {saveError}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={save.isPending}
          className="rounded-full bg-petal-700 px-10 py-3 text-sm font-semibold text-white transition-colors hover:bg-cocoa disabled:cursor-not-allowed disabled:opacity-50"
        >
          {save.isPending ? t("saving") : t("save")}
        </button>
      </div>
    </form>
  );
}