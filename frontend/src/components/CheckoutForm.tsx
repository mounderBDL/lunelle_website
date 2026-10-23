"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";
import { fetchCommunes, placeOrder, requestQuote, type PlaceResult } from "@/lib/api/client";
import type { Commune, DeliveryMethod, DeliveryWilaya, QuoteDto } from "@/lib/api/types";
import { formatMoney, imageUrlOrNull, localized } from "@/lib/format";
import { normalizePhone } from "@/lib/phone";
import { useCart } from "@/store/cart";
import ImagePlaceholder from "./ImagePlaceholder";

const subscribe = () => () => {};
const METHODS: DeliveryMethod[] = ["HAND_TO_HAND", "HOME", "STOP_DESK"];
const INPUT =
  "w-full rounded-xl border bg-white/70 px-4 py-3 text-base outline-none transition-colors focus:border-rose-dark focus:ring-2 focus:ring-rose/30 disabled:cursor-not-allowed disabled:opacity-60";

type Errors = Record<string, string>;
type QuoteState = { key: string; quote: QuoteDto | null };
type CommuneState = { key: string; list: Commune[] | null }; // null = the request failed

function inputClass(error?: string) {
  return `${INPUT} ${error ? "border-red-600" : "border-rose/40"}`;
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-cocoa/60">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

function methodAvailable(w: DeliveryWilaya, method: DeliveryMethod) {
  if (method === "HOME") return w.home.available;
  if (method === "STOP_DESK") return w.stopDesk.available;
  return true;
}

export default function CheckoutForm({ wilayas }: { wilayas: DeliveryWilaya[] }) {
  const t = useTranslations("checkout");
  const locale = useLocale();
  const router = useRouter();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const lines = useCart((s) => s.lines);
  const replaceLines = useCart((s) => s.replaceLines);
  const clear = useCart((s) => s.clear);

  // ── form ──
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<DeliveryMethod>("HOME");
  const [wilayaId, setWilayaId] = useState("");
  const [communeId, setCommuneId] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [trap, setTrap] = useState(""); // honeypot: real visitors never see or fill it
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [submitError, setSubmitError] = useState<Exclude<PlaceResult, { kind: "created" }> | null>(null);

  // ── derived ──
  const wilayaNum = wilayaId === "" ? null : Number(wilayaId);
  const selectedWilaya = wilayas.find((w) => w.id === wilayaNum) ?? null;
  const destinationReady =
    method !== "HAND_TO_HAND" && selectedWilaya !== null && methodAvailable(selectedWilaya, method);
  const quoteWilaya = destinationReady ? wilayaNum : null;

  // ── server quote (prices, availability, delivery fee) ──
  const [attempt, setAttempt] = useState(0);
  const [quoteState, setQuoteState] = useState<QuoteState | null>(null);
  const quoteKey = `${attempt}|${method}|${quoteWilaya ?? ""}|${JSON.stringify(lines)}`;

  useEffect(() => {
    if (!mounted || lines.length === 0) return;
    let cancelled = false;
    void (async () => {
      const result = await requestQuote(lines, { deliveryMethod: method, wilayaId: quoteWilaya });
      if (cancelled) return;
      if (result.kind === "prune") {
        replaceLines(result.keep); // some items were removed from the shop: drop them and re-check
        return;
      }
      setQuoteState({ key: quoteKey, quote: result.kind === "ok" ? result.quote : null });
    })();
    return () => {
      cancelled = true;
    };
  }, [mounted, lines, method, quoteWilaya, quoteKey, replaceLines]);

  // ── communes of the chosen wilaya (office delivery: only communes with a Yalidine office) ──
  const [communeAttempt, setCommuneAttempt] = useState(0);
  const [communeState, setCommuneState] = useState<CommuneState | null>(null);
  const communeKey =
    destinationReady && wilayaNum !== null
      ? `${communeAttempt}|${method === "STOP_DESK" ? "office" : "all"}|${wilayaNum}`
      : null;

  useEffect(() => {
    if (communeKey === null || wilayaNum === null) return;
    let cancelled = false;
    void (async () => {
      const list = await fetchCommunes(wilayaNum, method === "STOP_DESK");
      if (cancelled) return;
      setCommuneState({ key: communeKey, list });
    })();
    return () => {
      cancelled = true;
    };
  }, [communeKey, wilayaNum, method]);

  // ── early states (all hooks are above) ──
  if (!mounted) {
    return <div className="mt-10 h-96 animate-pulse rounded-2xl bg-blush/50" aria-hidden />;
  }
  if (placed) {
    return <p className="mt-16 text-center font-display text-2xl text-cocoa/70">{t("redirecting")}</p>;
  }
  if (lines.length === 0) {
    return (
      <div className="mt-12 text-center">
        <p className="font-display text-2xl text-cocoa/70">{t("empty")}</p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-full bg-rose-dark px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-cocoa"
        >
          {t("continue")}
        </Link>
      </div>
    );
  }

  // ── more derived state ──
  const quoteFresh = quoteState !== null && quoteState.key === quoteKey;
  const quoteFailed = quoteFresh && quoteState.quote === null;
  const quote = quoteState?.quote ?? null;
  const itemsProblem = quote !== null && !quote.ok;

  const communesReady = communeState !== null && communeState.key === communeKey;
  const communes = communesReady ? (communeState.list ?? []) : [];
  const communesFailed = communesReady && communeState.list === null;
  const noOfficeInWilaya = communesReady && !communesFailed && communes.length === 0 && method === "STOP_DESK";

  const fee = method === "HAND_TO_HAND" ? 0 : quoteFresh && quote ? quote.deliveryFee : null;
  const total = fee === null || quote === null ? null : quote.subtotal + fee;
  const canSubmit = !submitting && quoteFresh && quote !== null && quote.ok;

  // ── handlers ──
  function chooseMethod(next: DeliveryMethod) {
    if (next === method) return;
    setMethod(next);
    setCommuneId("");
    setErrors({});
    setSubmitError(null);
    const current = wilayas.find((w) => String(w.id) === wilayaId);
    if (current && !methodAvailable(current, next)) {
      setWilayaId(""); // e.g. the wilaya has no Yalidine office
    }
  }

  function chooseWilaya(value: string) {
    setWilayaId(value);
    setCommuneId("");
    setErrors((e) => ({ ...e, wilaya: "", commune: "" }));
  }

  function validate(): Errors {
    const found: Errors = {};
    if (name.trim().length < 2) found.name = t("errors.name");
    if (normalizePhone(phone) === null) found.phone = t("errors.phone");
    if (method !== "HAND_TO_HAND") {
      if (!destinationReady) found.wilaya = t("errors.wilaya");
      else if (communeId === "") found.commune = t("errors.commune");
      if (method === "HOME" && address.trim().length < 5) found.address = t("errors.address");
    }
    return found;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    const found = validate();
    setErrors(found);
    const firstInvalid = Object.keys(found)[0];
    if (firstInvalid) {
      document.getElementById(`field-${firstInvalid}`)?.focus();
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    const hand = method === "HAND_TO_HAND";
    const result = await placeOrder({
      customerName: name.trim(),
      phone: phone.trim(),
      locale: locale === "fr" ? "fr" : "en",
      deliveryMethod: method,
      wilayaId: hand ? null : wilayaNum,
      communeId: hand ? null : Number(communeId),
      address: method === "HOME" ? address.trim() : null,
      note: note.trim() || null,
      items: lines.map((l) => ({ type: l.type, id: l.id, quantity: l.quantity })),
      website: trap,
    });

    if (result.kind === "created") {
      setPlaced(true);
      clear();
      router.push(`/order/${encodeURIComponent(result.token)}`);
      return;
    }
    setSubmitting(false);
    setSubmitError(result);
  }

  const wilayaLabel = (w: DeliveryWilaya) => {
    const base = `${String(w.id).padStart(2, "0")} - ${w.name}`;
    if (methodAvailable(w, method)) return base;
    return `${base} (${method === "STOP_DESK" ? t("noOffice") : t("unavailable")})`;
  };

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]"
    >
      <div className="space-y-12">
        {/* ── your details ── */}
        <section className="space-y-5">
          <h2 className="text-3xl">{t("yourDetails")}</h2>
          <Field id="field-name" label={t("name")} error={errors.name}>
            <input
              id="field-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              autoComplete="name"
              maxLength={100}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "field-name-error" : undefined}
              className={inputClass(errors.name)}
            />
          </Field>
          <Field id="field-phone" label={t("phone")} error={errors.phone} hint={t("phoneHelp")}>
            <input
              id="field-phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("phonePlaceholder")}
              autoComplete="tel"
              maxLength={30}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? "field-phone-error" : undefined}
              className={inputClass(errors.phone)}
            />
          </Field>
        </section>

        {/* ── delivery ── */}
        <section>
          <h2 id="delivery-title" className="text-3xl">
            {t("delivery")}
          </h2>
          <div role="radiogroup" aria-labelledby="delivery-title" className="mt-5 grid gap-3">
            {METHODS.map((m) => {
              const selected = m === method;
              return (
                <label
                  key={m}
                  className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors ${
                    selected ? "border-rose-dark bg-blush/60" : "border-rose/30 hover:border-rose-dark"
                  }`}
                >
                  <input
                    type="radio"
                    name="delivery"
                    value={m}
                    checked={selected}
                    onChange={() => chooseMethod(m)}
                    className="mt-1 accent-rose-dark"
                  />
                  <span>
                    <span className="block font-medium">{t(`methods.${m}.title`)}</span>
                    <span className="block text-sm text-cocoa/70">{t(`methods.${m}.text`)}</span>
                  </span>
                </label>
              );
            })}
          </div>

          <div className="mt-6 space-y-5">
            {method === "HAND_TO_HAND" ? (
              <p className="rounded-xl bg-parchment/70 px-5 py-4 text-sm text-cocoa/80">{t("handHint")}</p>
            ) : (
              <>
                <Field id="field-wilaya" label={t("wilaya")} error={errors.wilaya}>
                  <select
                    id="field-wilaya"
                    value={wilayaId}
                    onChange={(e) => chooseWilaya(e.target.value)}
                    aria-invalid={Boolean(errors.wilaya)}
                    className={inputClass(errors.wilaya)}
                  >
                    <option value="">{t("selectWilaya")}</option>
                    {wilayas.map((w) => (
                      <option key={w.id} value={String(w.id)} disabled={!methodAvailable(w, method)}>
                        {wilayaLabel(w)}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field
                  id="field-commune"
                  label={t("commune")}
                  error={errors.commune}
                  hint={method === "STOP_DESK" ? t("officeHint") : undefined}
                >
                  <select
                    id="field-commune"
                    value={communeId}
                    onChange={(e) => {
                      setCommuneId(e.target.value);
                      setErrors((er) => ({ ...er, commune: "" }));
                    }}
                    disabled={!destinationReady || !communesReady || communesFailed || noOfficeInWilaya}
                    aria-invalid={Boolean(errors.commune)}
                    className={inputClass(errors.commune)}
                  >
                    <option value="">
                      {!destinationReady
                        ? t("chooseWilayaFirst")
                        : !communesReady
                          ? t("loadingCommunes")
                          : method === "STOP_DESK"
                            ? t("selectOfficeCommune")
                            : t("selectCommune")}
                    </option>
                    {communes.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>

                {communesFailed && (
                  <p role="alert" className="text-sm text-red-700">
                    {t("communesError")}{" "}
                    <button type="button" onClick={() => setCommuneAttempt((n) => n + 1)} className="underline">
                      {t("retry")}
                    </button>
                  </p>
                )}
                {noOfficeInWilaya && (
                  <p role="alert" className="text-sm text-red-700">
                    {t("noOfficeInWilaya")}
                  </p>
                )}

                {method === "HOME" && (
                  <Field id="field-address" label={t("address")} error={errors.address}>
                    <textarea
                      id="field-address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder={t("addressPlaceholder")}
                      rows={3}
                      maxLength={300}
                      autoComplete="street-address"
                      aria-invalid={Boolean(errors.address)}
                      className={inputClass(errors.address)}
                    />
                  </Field>
                )}
              </>
            )}

            <Field id="field-note" label={t("note")}>
              <textarea
                id="field-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("notePlaceholder")}
                rows={2}
                maxLength={500}
                className={inputClass()}
              />
            </Field>
          </div>
        </section>

        {/* honeypot: hidden from people, tempting for bots */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            Leave this field empty
            <input
              type="text"
              name="contact_url"
              tabIndex={-1}
              autoComplete="off"
              value={trap}
              onChange={(e) => setTrap(e.target.value)}
            />
          </label>
        </div>
      </div>

      {/* ── summary ── */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl border border-rose/20 bg-white/60 p-6">
          <h2 className="text-3xl">{t("summary")}</h2>

          {quote === null ? (
            quoteFailed ? (
              <div className="mt-5 text-sm">
                <p>{t("quoteError")}</p>
                <button type="button" onClick={() => setAttempt((n) => n + 1)} className="mt-2 underline">
                  {t("retry")}
                </button>
              </div>
            ) : (
              <div className="mt-5 space-y-3" aria-hidden>
                <div className="h-14 animate-pulse rounded-xl bg-blush/60" />
                <div className="h-14 animate-pulse rounded-xl bg-blush/60" />
              </div>
            )
          ) : (
            <ul className={`mt-5 space-y-4 transition-opacity ${quoteFresh ? "" : "opacity-60"}`}>
              {quote.lines.map((line) => {
                const lineName = localized(line.name, locale);
                const image = imageUrlOrNull(line.imageUrl);
                return (
                  <li key={`${line.type}-${line.id}`} className="flex gap-3">
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-blush/60">
                      {image ? (
                        <Image src={image} alt={lineName} fill sizes="56px" className="object-cover" />
                      ) : (
                        <ImagePlaceholder />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg leading-tight">{lineName}</p>
                      <p className="text-xs text-cocoa/60">
                        {line.type === "PACK" ? t("pack") : line.variantLabel} · × {line.quantity}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm">{formatMoney(line.lineTotal, locale)}</p>
                  </li>
                );
              })}
            </ul>
          )}

          {itemsProblem && (
            <p role="alert" className="mt-4 text-sm text-red-700">
              {t("itemsProblem")}{" "}
              <Link href="/cart" className="underline">
                {t("reviewCart")}
              </Link>
            </p>
          )}

          {quote !== null && (
            <dl className="mt-5 space-y-2 border-t border-rose/20 pt-4 text-sm">
              <div className="flex justify-between">
                <dt>{t("subtotal")}</dt>
                <dd>{formatMoney(quote.subtotal, locale)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>{t("deliveryFee")}</dt>
                <dd className={fee === null ? "text-cocoa/60" : ""}>
                  {fee === null ? t("deliveryPending") : fee === 0 ? t("deliveryFree") : formatMoney(fee, locale)}
                </dd>
              </div>
              {total !== null && (
                <div className="flex justify-between border-t border-rose/20 pt-3">
                  <dt className="font-display text-2xl">{t("total")}</dt>
                  <dd className="text-xl font-medium">{formatMoney(total, locale)}</dd>
                </div>
              )}
            </dl>
          )}

          <p className="mt-5 text-sm text-cocoa/70">{t("payment")}</p>
          <p className="mt-2 text-sm font-medium text-rose-dark">{t("callWithin24")}</p>

          {submitError && (
            <div role="alert" className="mt-5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
              <p>
                {submitError.kind === "stock"
                  ? t("submitErrors.stock")
                  : submitError.kind === "limit"
                    ? t("submitErrors.limit")
                    : submitError.kind === "invalid"
                      ? t("submitErrors.invalid")
                      : t("submitErrors.generic")}
              </p>
              {(submitError.kind === "stock" || submitError.kind === "invalid") && submitError.message && (
                <p className="mt-1 text-xs opacity-80">{submitError.message}</p>
              )}
              {submitError.kind === "stock" && (
                <Link href="/cart" className="mt-2 inline-block underline">
                  {t("reviewCart")}
                </Link>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-6 w-full rounded-full bg-rose-dark px-8 py-3.5 text-sm font-medium tracking-wide text-white transition-colors hover:bg-cocoa disabled:cursor-not-allowed disabled:bg-cocoa/30"
          >
            {submitting ? t("placing") : t("place")}
          </button>
        </div>
      </aside>
    </form>
  );
}