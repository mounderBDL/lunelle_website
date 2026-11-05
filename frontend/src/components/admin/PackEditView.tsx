"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { ApiError, adminFetch } from "@/lib/admin/api";
import type { AdminPack, AdminProduct } from "@/lib/admin/catalogTypes";
import { localized } from "@/lib/format";
import Card, { Skeleton } from "./Card";
import ConfirmDialog from "./ConfirmDialog";
import { Chip, ErrorNote, PRIMARY, SECONDARY } from "./FormBits";
import PackEditor from "./PackEditor";
import { useToast } from "./Toasts";

export default function PackEditView({ id }: { id: string }) {
  const t = useTranslations("admin.packs");
  const locale = useLocale();

  const pack = useQuery({
    queryKey: ["admin", "packs", id],
    queryFn: () => adminFetch<AdminPack>(`/api/admin/order-catalog/packs/${id}`),
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 1,
  });
  const products = useQuery({
    queryKey: ["admin", "products", "catalog"],
    queryFn: () => adminFetch<AdminProduct[]>("/api/admin/order-catalog/products"),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const back = (
    <Link
      href="/admin/packs"
      className="inline-flex items-center gap-2 text-sm font-semibold text-cocoa/70 hover:text-petal-700"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      {t("back")}
    </Link>
  );

  if (pack.isPending || products.isPending) {
    return (
      <div>
        {back}
        <div className="mt-6">
          <Skeleton />
        </div>
      </div>
    );
  }

  if (pack.isError || products.isError) {
    const missing = pack.error instanceof ApiError && pack.error.status === 404;
    return (
      <div>
        {back}
        <Card className="mt-6 text-center">
          <p className="text-cocoa/75">{missing ? t("notFound") : t("loadError")}</p>
          {!missing && (
            <button
              type="button"
              onClick={() => {
                void pack.refetch();
                void products.refetch();
              }}
              className={`${SECONDARY} mt-4`}
            >
              {t("retry")}
            </button>
          )}
        </Card>
      </div>
    );
  }

  const p = pack.data;
  const name = localized(p.name, locale);

  return (
    <div>
      {back}

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl">{name}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            {p.archived && <Chip tone="stone">{t("chips.archived")}</Chip>}
            {!p.active && !p.archived && <Chip tone="stone">{t("chips.hidden")}</Chip>}
            {!p.inStock && !p.archived && <Chip tone="terracotta">{t("chips.outOfStock")}</Chip>}
          </div>
        </div>
        {p.active && !p.archived && (
          <a
            href={`/pack/${p.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`${SECONDARY} inline-flex items-center gap-2`}
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            {t("viewInShop")}
          </a>
        )}
      </header>

      <div className="mt-8 space-y-6">
        {p.archived ? (
          <RestoreCard pack={p} />
        ) : (
          <>
            <PackEditor key={p.id} products={products.data} pack={p} />
            <ArchiveCard pack={p} />
          </>
        )}
      </div>
    </div>
  );
}

function RestoreCard({ pack }: { pack: AdminPack }) {
  const t = useTranslations("admin.packs.archive");
  const tc = useTranslations("admin.common");
  const queryClient = useQueryClient();
  const toast = useToast();

  const restore = useMutation({
    mutationFn: () => adminFetch<AdminPack>(`/api/admin/order-catalog/packs/${pack.id}/restore`, { method: "POST" }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["admin", "packs", pack.id], updated);
      void queryClient.invalidateQueries({ queryKey: ["admin", "packs", "all"] });
      toast.push({ title: t("restored") });
    },
  });
  const error =
    restore.error instanceof ApiError && restore.error.message ? restore.error.message : restore.isError ? tc("error") : null;

  return (
    <Card title={t("archivedTitle")}>
      <p className="text-sm text-cocoa/75">{t("archivedText")}</p>
      {error && (
        <div className="mt-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
      <button type="button" onClick={() => restore.mutate()} disabled={restore.isPending} className={`${PRIMARY} mt-4`}>
        {restore.isPending ? tc("working") : t("restore")}
      </button>
    </Card>
  );
}

function ArchiveCard({ pack }: { pack: AdminPack }) {
  const t = useTranslations("admin.packs.archive");
  const tc = useTranslations("admin.common");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);

  return (
    <Card title={t("title")}>
      <p className="text-sm text-cocoa/75">{t("text")}</p>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={`${SECONDARY} mt-4 !border-terracotta-dark/40 !text-terracotta-dark`}
      >
        {t("action")}
      </button>

      {confirming && (
        <ConfirmDialog
          title={t("confirmTitle")}
          text={t("confirmText", { name: localized(pack.name, locale) })}
          confirmLabel={t("action")}
          cancelLabel={tc("cancel")}
          closeLabel={tc("close")}
          workingLabel={tc("working")}
          errorFallback={tc("error")}
          danger
          onClose={() => setConfirming(false)}
          onConfirm={async () => {
            const updated = await adminFetch<AdminPack>(`/api/admin/order-catalog/packs/${pack.id}`, { method: "DELETE" });
            queryClient.setQueryData(["admin", "packs", pack.id], updated);
            void queryClient.invalidateQueries({ queryKey: ["admin", "packs", "all"] });
            toast.push({ title: t("done") });
          }}
        />
      )}
    </Card>
  );
}