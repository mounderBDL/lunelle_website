"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ApiError, adminFetch } from "@/lib/admin/api";
import type { OrderDetail } from "@/lib/admin/types";
import type { OrderStatus } from "@/lib/api/types";
import Dialog from "./Dialog";
import { useToast } from "./Toasts";

const FIELD =
  "w-full rounded-xl border border-petal-300/70 bg-white/80 px-4 py-2.5 text-sm outline-none transition-colors focus:border-petal-700 focus:ring-2 focus:ring-petal-300/50 disabled:opacity-60";
const DANGER: OrderStatus[] = ["CANCELLED", "RETURNED"];

type Props = { order: OrderDetail; target: OrderStatus; onClose: () => void };

export default function StatusDialog({ order, target, onClose }: Props) {
  const t = useTranslations("admin.detail");
  const ts = useTranslations("admin.status");
  const tc = useTranslations("admin.common");
  const queryClient = useQueryClient();
  const toast = useToast();

  const hand = order.deliveryMethod === "HAND_TO_HAND";
  const copyKey = target === "DELIVERED" && hand ? "DELIVERED_HAND" : target;
  const danger = DANGER.includes(target);
  const askTracking = target === "SHIPPED";

  const [note, setNote] = useState("");
  const [tracking, setTracking] = useState(order.trackingNumber ?? "");

  const change = useMutation({
    mutationFn: () =>
      adminFetch<OrderDetail>(`/api/admin/orders/${order.id}/status`, {
        method: "POST",
        body: JSON.stringify({
          status: target,
          note: note.trim() || null,
          trackingNumber: askTracking ? tracking.trim() || null : null,
        }),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["orders", "detail", order.id], updated);
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.push({ title: t("toast.updated", { code: order.code, status: ts(target) }) });
      onClose();
    },
  });

  const error =
    change.error instanceof ApiError && change.error.message
      ? change.error.message
      : change.isError
        ? t("errors.generic")
        : null;

  return (
    <Dialog title={t(`dialog.${copyKey}.title`)} closeLabel={tc("close")} onClose={onClose}>
      <p className="mt-3 text-cocoa/75">{t(`dialog.${copyKey}.text`)}</p>

      <div className="mt-5 space-y-4">
        {askTracking && (
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">{t("dialog.tracking")}</span>
            <input
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              maxLength={60}
              placeholder={t("trackingPlaceholder")}
              className={FIELD}
            />
          </label>
        )}
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">{t("dialog.note")}</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder={t("dialog.notePlaceholder")}
            className={FIELD}
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={change.isPending}
          className="rounded-full border border-petal-300 px-6 py-2.5 text-sm font-semibold hover:bg-petal-100 disabled:opacity-50"
        >
          {t("dialog.keep")}
        </button>
        <button
          type="button"
          onClick={() => change.mutate()}
          disabled={change.isPending}
          className={`rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            danger ? "bg-terracotta-dark hover:bg-cocoa" : "bg-petal-700 hover:bg-cocoa"
          }`}
        >
          {change.isPending ? t("dialog.working") : t(`dialog.${copyKey}.confirm`)}
        </button>
      </div>
    </Dialog>
  );
}