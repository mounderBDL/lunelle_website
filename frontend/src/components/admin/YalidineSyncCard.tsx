"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { adminFetch } from "@/lib/admin/api";
import Card from "./Card";
import ConfirmDialog from "./ConfirmDialog";
import { ErrorNote, SECONDARY } from "./FormBits";

type SyncStatus = {
  state: "IDLE" | "RUNNING" | "DONE" | "FAILED";
  step: string;
  done: number;
  total: number;
  summary: {
    wilayas: number;
    communesAdded: number;
    communesUpdated: number;
    communesClosed: number;
    withStopDesk: number;
    feesUpdated: number;
    feesSkipped: number;
  } | null;
  error: string | null;
  finishedAt: string | null;
};

const KEY = ["admin", "delivery", "yalidine-sync"];

/** Pulls wilayas, communes, offices and fees from Yalidine. The work runs on the server; this card follows it. */
export default function YalidineSyncCard() {
  const t = useTranslations("admin.delivery.sync");
  const tc = useTranslations("admin.common");
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const status = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const previous = queryClient.getQueryData<SyncStatus>(KEY);
      const next = await adminFetch<SyncStatus>("/api/admin/delivery/yalidine-sync");
      // the sync just ended: reload the delivery data on the page
      if (previous?.state === "RUNNING" && next.state !== "RUNNING") {
        void queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "admin" && q.queryKey[1] === "delivery" && q.queryKey[2] !== "yalidine-sync" });
      }
      return next;
    },
    refetchInterval: (query) => (query.state.data?.state === "RUNNING" ? 2000 : false),
  });

  const start = useMutation({
    mutationFn: () => adminFetch<SyncStatus>("/api/admin/delivery/yalidine-sync", { method: "POST" }),
    onSuccess: (data) => queryClient.setQueryData(KEY, data),
  });

  const data = status.data;
  const running = data?.state === "RUNNING";
  const summary = data?.state === "DONE" ? data.summary : null;

  return (
    <Card title={t("title")}>
      <p className="text-sm text-cocoa/70">{t("text")}</p>

      {running && data && (
        <div className="mt-4" role="status">
          <p className="text-sm font-semibold">{t(`steps.${data.step}`, { done: data.done, total: data.total })}</p>
          {data.step === "FEES" && data.total > 0 && (
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-petal-100">
              <div
                className="h-full rounded-full bg-petal-700 transition-all"
                style={{ width: `${Math.round((data.done * 100) / data.total)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {summary && (
        <div className="mt-4 rounded-2xl bg-sage-soft px-4 py-3 text-sm text-sage-dark">
          <p className="font-semibold">{t("done")}</p>
          <ul className="mt-1 list-disc space-y-0.5 ps-5">
            <li>{t("summary.wilayas", { count: summary.wilayas })}</li>
            <li>
              {t("summary.communes", {
                added: summary.communesAdded,
                updated: summary.communesUpdated,
                closed: summary.communesClosed,
              })}
            </li>
            <li>{t("summary.desks", { count: summary.withStopDesk })}</li>
            <li>{t("summary.fees", { count: summary.feesUpdated })}</li>
            {summary.feesSkipped > 0 && <li>{t("summary.skipped", { count: summary.feesSkipped })}</li>}
          </ul>
        </div>
      )}

      {data?.state === "FAILED" && (
        <div className="mt-4">
          <ErrorNote>
            {t("failed")} {data.error}
          </ErrorNote>
        </div>
      )}

      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={running || status.isPending}
        className={`${SECONDARY} mt-4 inline-flex items-center gap-2`}
      >
        <RefreshCw className={`h-4 w-4 ${running ? "animate-spin" : ""}`} aria-hidden />
        {running ? t("running") : t("button")}
      </button>

      {confirming && (
        <ConfirmDialog
          title={t("confirmTitle")}
          text={t("confirmText")}
          confirmLabel={t("confirm")}
          cancelLabel={t("cancel")}
          closeLabel={tc("close")}
          workingLabel={t("starting")}
          errorFallback={t("startError")}
          onClose={() => setConfirming(false)}
          onConfirm={() => start.mutateAsync()}
        />
      )}
    </Card>
  );
}
