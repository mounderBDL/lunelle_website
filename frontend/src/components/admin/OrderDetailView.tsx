"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MapPin, MessageCircle, Pencil, Phone, Printer } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { ApiError, adminFetch } from "@/lib/admin/api";
import { formatPhone, formatStamp, fromAlgiersInput, timeAgo, toAlgiersInput } from "@/lib/admin/format";
import type { HistoryEntry, OrderDetail } from "@/lib/admin/types";
import { useNow } from "@/lib/admin/useNow";
import type { OrderStatus } from "@/lib/api/types";
import { formatMoney, localized } from "@/lib/format";
import CallDueBadge from "./CallDueBadge";
import Card, { Skeleton } from "./Card";
import CopyButton from "./CopyButton";
import OrderSlip from "./OrderSlip";
import StatusChip from "./StatusChip";
import StatusDialog from "./StatusDialog";
import { useToast } from "./Toasts";
import RestockCard from "./RestockCard";

const ACTION_ORDER: OrderStatus[] = ["CONFIRMED", "SHIPPED", "DELIVERED", "NEW", "NO_ANSWER", "RETURNED", "CANCELLED"];
const FORWARD: OrderStatus[] = ["CONFIRMED", "SHIPPED", "DELIVERED"];
const DANGER: OrderStatus[] = ["CANCELLED", "RETURNED"];
const FIELD =
  "w-full rounded-xl border border-petal-300/70 bg-white/80 px-4 py-2.5 text-sm outline-none transition-colors focus:border-petal-700 focus:ring-2 focus:ring-petal-300/50 disabled:opacity-60";
const SAVE_BUTTON =
  "rounded-full bg-petal-700 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-cocoa disabled:cursor-not-allowed disabled:opacity-40";

type DetailsPatch = Partial<{
  adminNote: string | null;
  handoverPlace: string | null;
  handoverAt: string | null;
  trackingNumber: string | null;
}>;
type SaveDetails = (patch: DetailsPatch) => Promise<unknown>;

function errorText(error: unknown, fallback: string) {
  return error instanceof ApiError && error.message ? error.message : fallback;
}

// ───────────────────────── main view ─────────────────────────

export default function OrderDetailView({ id }: { id: string }) {
  const t = useTranslations("admin.detail");
  const locale = useLocale();
  const nowMs = useNow();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [dialog, setDialog] = useState<OrderStatus | null>(null);
  const key = ["orders", "detail", id];

  const query = useQuery({
    queryKey: key,
    queryFn: () => adminFetch<OrderDetail>(`/api/admin/orders/${id}`),
    refetchInterval: 60_000,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 1,
  });

  // the details endpoint replaces four fields at once: send the current values for the ones not being changed
  const details = useMutation({
    mutationFn: async (patch: DetailsPatch) => {
      const current = queryClient.getQueryData<OrderDetail>(key);
      if (!current) throw new Error("missing");
      return adminFetch<OrderDetail>(`/api/admin/orders/${id}/details`, {
        method: "PUT",
        body: JSON.stringify({
          adminNote: current.adminNote,
          handoverPlace: current.handoverPlace,
          handoverAt: current.handoverAt,
          trackingNumber: current.trackingNumber,
          ...patch,
        }),
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(key, updated);
      toast.push({ title: t("toast.saved") });
    },
  });

  const back = (
    <Link
      href="/admin/orders"
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
    const missing = query.error instanceof ApiError && query.error.status === 404;
    return (
      <div>
        {back}
        <Card className="mt-6 text-center">
          <p className="text-cocoa/75">{missing ? t("notFound") : t("loadError")}</p>
          {!missing && (
            <button
              type="button"
              onClick={() => void query.refetch()}
              className="mt-4 rounded-full border border-petal-700 px-6 py-2 text-sm font-semibold text-petal-700 hover:bg-petal-100"
            >
              {t("retry")}
            </button>
          )}
        </Card>
      </div>
    );
  }

  const order = query.data;
  const hand = order.deliveryMethod === "HAND_TO_HAND";
  const actions = ACTION_ORDER.filter((s) => order.allowedStatuses.includes(s));
  const needsMeeting = hand && !order.handoverPlace;
  const label = (s: OrderStatus) => t(`actions.${s === "DELIVERED" && hand ? "HANDED_OVER" : s}`);

  return (
    <>
      <div className="no-print">
        {back}

        {/* ── header and actions ── */}
        <header className="mt-5 rounded-3xl bg-linear-to-br from-petal-200/80 via-petal-100 to-cream p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-ui text-3xl font-bold tabular-nums tracking-wide sm:text-4xl">{order.code}</h1>
            <StatusChip status={order.status} />
            {order.status === "NEW" && <CallDueBadge createdAt={order.createdAt} nowMs={nowMs} />}
          </div>
          <p className="mt-2 text-sm text-cocoa/70">
            {t("placed", { date: formatStamp(order.createdAt, locale) })}
            {nowMs > 0 && <span className="text-cocoa/50"> · {timeAgo(order.createdAt, nowMs, locale)}</span>}
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            {actions.map((status) => {
              const primary = FORWARD.includes(status);
              const blocked = status === "CONFIRMED" && needsMeeting;
              const style = primary
                ? "bg-petal-700 text-white hover:bg-cocoa"
                : DANGER.includes(status)
                  ? "border border-terracotta-dark/40 bg-white/70 text-terracotta-dark hover:bg-terracotta-soft"
                  : "border border-petal-300 bg-white/70 text-cocoa hover:bg-petal-100";
              return (
                <button
                  key={status}
                  type="button"
                  disabled={blocked}
                  onClick={() => setDialog(status)}
                  className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${style}`}
                >
                  {label(status)}
                </button>
              );
            })}
            {order.editable && (
              <Link
                href={`/admin/orders/${order.id}/edit`}
                className="inline-flex items-center gap-2 rounded-full border border-petal-300 bg-white/70 px-5 py-2.5 text-sm font-semibold hover:bg-petal-100"
              >
                <Pencil className="h-4 w-4" aria-hidden />
                {t("edit")}
              </Link>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-full border border-petal-300 bg-white/70 px-5 py-2.5 text-sm font-semibold hover:bg-petal-100"
            >
              <Printer className="h-4 w-4" aria-hidden />
              {t("print")}
            </button>
          </div>
          {actions.includes("CONFIRMED") && needsMeeting && (
            <p className="mt-3 text-sm text-amber-dark">{t("meetingRequired")}</p>
          )}
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            {order.status === "RETURNED" && order.restock.length > 0 && <RestockCard order={order} />}
            <ItemsCard order={order} />
            <TimelineCard history={order.history} />
          </div>
          <div className="space-y-6">
            <CustomerCard order={order} />
            <DeliveryCard order={order} onSave={(patch) => details.mutateAsync(patch)} />
            <NoteCard order={order} onSave={(patch) => details.mutateAsync(patch)} />
          </div>
        </div>
      </div>

      <OrderSlip order={order} />
      {dialog && <StatusDialog order={order} target={dialog} onClose={() => setDialog(null)} />}
    </>
  );
}

// ───────────────────────── cards ─────────────────────────

function ItemsCard({ order }: { order: OrderDetail }) {
  const t = useTranslations("admin.detail");
  const locale = useLocale();

  return (
    <Card title={t("items")}>
      <ul className="divide-y divide-petal-100">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-4 py-4 first:pt-0">
            <div className="min-w-0">
              <p className="font-semibold">
                {item.quantity} × {localized(item.name, locale)}
              </p>
              <p className="text-sm text-cocoa/60">{item.type === "PACK" ? t("pack") : item.variantLabel}</p>
              {item.type === "PACK" && item.components.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-sm text-cocoa/70">
                  {item.components.map((c, i) => (
                    <li key={i}>
                      {c.quantity} × {localized(c.name, locale)} ({c.variantLabel})
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="shrink-0 text-right tabular-nums">
              {item.originalUnitPrice > item.unitPrice && (
                <span className="block text-xs text-cocoa/40 line-through">
                  {formatMoney(item.originalUnitPrice * item.quantity, locale)}
                </span>
              )}
              <span className="font-semibold">{formatMoney(item.lineTotal, locale)}</span>
            </div>
          </li>
        ))}
      </ul>

      <dl className="mt-2 space-y-2 border-t border-petal-200 pt-4 text-sm tabular-nums">
        <div className="flex justify-between">
          <dt>{t("subtotal")}</dt>
          <dd>{formatMoney(order.subtotal, locale)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>{t("delivery")}</dt>
          <dd>{order.deliveryFee === 0 ? t("free") : formatMoney(order.deliveryFee, locale)}</dd>
        </div>
        <div className="flex items-baseline justify-between border-t border-petal-200 pt-3">
          <dt className="text-base font-semibold">{t("total")}</dt>
          <dd className="text-xl font-bold">{formatMoney(order.total, locale)}</dd>
        </div>
      </dl>

      <div className="mt-5 rounded-2xl bg-petal-50 px-4 py-3 text-sm">
        {order.cost !== null && order.profit !== null ? (
          <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 tabular-nums">
            <span className="text-cocoa/70">
              {t("cost")}: <span className="font-semibold text-cocoa">{formatMoney(order.cost, locale)}</span>
            </span>
            <span className="text-cocoa/70">
              {t("profit")}: <span className="font-semibold text-sage-dark">{formatMoney(order.profit, locale)}</span>
            </span>
          </div>
        ) : (
          <p className="text-cocoa/60">{t("noCost")}</p>
        )}
      </div>
    </Card>
  );
}

function TimelineCard({ history }: { history: HistoryEntry[] }) {
  const t = useTranslations("admin.detail");
  const ts = useTranslations("admin.status");
  const locale = useLocale();
  const entries = [...history].reverse(); // newest first

  return (
    <Card title={t("timeline")}>
      <ol className="space-y-5 border-l border-petal-200 pl-6">
        {entries.map((h, i) => {
          let title: string;
          if (h.fromStatus === null) title = t("history.placed");
          else if (h.fromStatus === h.toStatus) title = t("history.edited");
          else title = `${ts(h.fromStatus)} → ${ts(h.toStatus)}`;
          const note = h.note && h.note !== "Order placed" && h.note !== "Order edited" ? h.note : null;
          return (
            <li key={i} className="relative">
              <span
                className={`absolute -left-[30px] top-1.5 h-3 w-3 rounded-full border-2 border-white ${
                  i === 0 ? "bg-petal-600" : "bg-petal-300"
                }`}
                aria-hidden
              />
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-cocoa/50">{formatStamp(h.createdAt, locale)}</p>
              {note && <p className="mt-1 text-sm text-cocoa/75">{note}</p>}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function CustomerCard({ order }: { order: OrderDetail }) {
  const t = useTranslations("admin.detail");
  const pill =
    "inline-flex items-center gap-2 rounded-full border border-petal-300/70 bg-white/70 px-4 py-2 text-sm font-semibold hover:bg-petal-100";

  return (
    <Card title={t("customer")}>
      <p className="text-lg font-bold">{order.customerName}</p>
      <p className="mt-0.5 text-base tabular-nums text-cocoa/80">{formatPhone(order.phone)}</p>
      <p className="mt-1 text-xs text-cocoa/50">
        {order.locale === "fr" ? t("prefersFrench") : t("prefersEnglish")}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <a href={`tel:${order.phone}`} className={pill}>
          <Phone className="h-4 w-4" aria-hidden />
          {t("call")}
        </a>
        <a
          href={`https://wa.me/213${order.phone.slice(1)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={pill}
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          {t("whatsapp")}
        </a>
        <CopyButton text={order.phone} label={t("copyPhone")} />
      </div>

      {order.customerNote && (
        <div className="mt-5 rounded-2xl bg-petal-50 px-4 py-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-cocoa/50">{t("customerNote")}</p>
          <p className="mt-1 whitespace-pre-line">{order.customerNote}</p>
        </div>
      )}
    </Card>
  );
}

function DeliveryCard({ order, onSave }: { order: OrderDetail; onSave: SaveDetails }) {
  const t = useTranslations("admin.detail");
  const hand = order.deliveryMethod === "HAND_TO_HAND";
  const handEditable = hand && (order.status === "NEW" || order.status === "CONFIRMED");
  const trackingEditable = !hand && (order.status === "CONFIRMED" || order.status === "SHIPPED");

  // a draft stays null until the user types, so server updates are never hidden by stale text
  const [place, setPlace] = useState<string | null>(null);
  const [when, setWhen] = useState<string | null>(null);
  const [tracking, setTracking] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const placeValue = place ?? order.handoverPlace ?? "";
  const whenValue = when ?? toAlgiersInput(order.handoverAt);
  const trackingValue = tracking ?? order.trackingNumber ?? "";
  const address = [order.address, order.communeName, order.wilayaName].filter(Boolean).join(", ");

  async function run(patch: DetailsPatch, reset: () => void) {
    setBusy(true);
    setError(null);
    try {
      await onSave(patch);
      reset();
    } catch (e) {
      setError(errorText(e, t("errors.generic")));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title={t("deliveryTitle")}>
      <p className="font-semibold">{t(`method.${order.deliveryMethod}`)}</p>

      {!hand && (
        <div className="mt-3 flex items-start gap-3 rounded-2xl bg-petal-50 px-4 py-3 text-sm">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-petal-600" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-cocoa/50">
              {order.address ? t("address") : t("destination")}
            </p>
            <p className="mt-0.5 break-words">{address}</p>
          </div>
          <CopyButton text={address} label={t("copyAddress")} />
        </div>
      )}

      {hand && (
        <div className="mt-4 space-y-4">
          {handEditable ? (
            <>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">{t("meetingPlace")}</span>
                <textarea
                  value={placeValue}
                  onChange={(e) => setPlace(e.target.value)}
                  rows={2}
                  maxLength={300}
                  placeholder={t("meetingPlacePlaceholder")}
                  className={FIELD}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">{t("meetingTime")}</span>
                <input
                  type="datetime-local"
                  value={whenValue}
                  onChange={(e) => setWhen(e.target.value)}
                  className={FIELD}
                />
              </label>
              <button
                type="button"
                disabled={busy || (place === null && when === null)}
                onClick={() =>
                  void run(
                    { handoverPlace: placeValue.trim() || null, handoverAt: fromAlgiersInput(whenValue) },
                    () => {
                      setPlace(null);
                      setWhen(null);
                    },
                  )
                }
                className={SAVE_BUTTON}
              >
                {busy ? t("saving") : t("save")}
              </button>
            </>
          ) : (
            <div className="text-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-cocoa/50">{t("meetingPlace")}</p>
              <p className="mt-0.5">{order.handoverPlace ?? "—"}</p>
              {order.handoverAt && (
                <p className="mt-1 tabular-nums text-cocoa/70">{toAlgiersInput(order.handoverAt).replace("T", " ")}</p>
              )}
              <p className="mt-2 text-xs text-cocoa/50">{t("meetingLocked")}</p>
            </div>
          )}
        </div>
      )}

      {!hand && (trackingEditable || order.trackingNumber) && (
        <div className="mt-4">
          {trackingEditable ? (
            <>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">{t("tracking")}</span>
                <input
                  value={trackingValue}
                  onChange={(e) => setTracking(e.target.value)}
                  maxLength={60}
                  placeholder={t("trackingPlaceholder")}
                  className={FIELD}
                />
              </label>
              <button
                type="button"
                disabled={busy || tracking === null}
                onClick={() => void run({ trackingNumber: trackingValue.trim() || null }, () => setTracking(null))}
                className={`${SAVE_BUTTON} mt-3`}
              >
                {busy ? t("saving") : t("save")}
              </button>
            </>
          ) : (
            <div className="text-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-cocoa/50">{t("tracking")}</p>
              <p className="mt-0.5 tabular-nums">{order.trackingNumber}</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}
    </Card>
  );
}

function NoteCard({ order, onSave }: { order: OrderDetail; onSave: SaveDetails }) {
  const t = useTranslations("admin.detail");
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const value = draft ?? order.adminNote ?? "";

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await onSave({ adminNote: value.trim() || null });
      setDraft(null);
    } catch (e) {
      setError(errorText(e, t("errors.generic")));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title={t("note")}>
      <textarea
        value={value}
        onChange={(e) => setDraft(e.target.value)}
        rows={4}
        maxLength={1000}
        placeholder={t("notePlaceholder")}
        aria-label={t("note")}
        className={FIELD}
      />
      {error && (
        <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}
      <button type="button" disabled={busy || draft === null} onClick={() => void save()} className={`${SAVE_BUTTON} mt-3`}>
        {busy ? t("saving") : t("save")}
      </button>
    </Card>
  );
}