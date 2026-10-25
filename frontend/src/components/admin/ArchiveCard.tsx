"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { ApiError, adminFetch } from "@/lib/admin/api";
import type { AdminProduct } from "@/lib/admin/catalogTypes";
import { localized } from "@/lib/format";
import Card from "./Card";
import ConfirmDialog from "./ConfirmDialog";
import { ErrorNote, PRIMARY, SECONDARY } from "./FormBits";
import { useToast } from "./Toasts";

export default function ArchiveCard({ product }: { product: AdminProduct }) {
  const t = useTranslations("admin.products.archive");
  const tc = useTranslations("admin.common");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);

  function apply(updated: AdminProduct, message: string) {
    queryClient.setQueryData(["admin", "products", product.id], updated);
    void queryClient.invalidateQueries({ queryKey: ["admin", "products", "all"] });
    void queryClient.invalidateQueries({ queryKey: ["stats"] });
    toast.push({ title: message });
  }

  const restore = useMutation({
    mutationFn: () => adminFetch<AdminProduct>(`/api/admin/products/${product.id}/restore`, { method: "POST" }),
    onSuccess: (updated) => apply(updated, t("restored")),
  });

  if (product.archived) {
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

  return (
    <Card title={t("title")}>
      <p className="text-sm text-cocoa/75">{t("text")}</p>
      <button type="button" onClick={() => setConfirming(true)} className={`${SECONDARY} mt-4 !border-terracotta-dark/40 !text-terracotta-dark`}>
        {t("action")}
      </button>

      {confirming && (
        <ConfirmDialog
          title={t("confirmTitle")}
          text={t("confirmText", { name: localized(product.name, locale) })}
          confirmLabel={t("action")}
          cancelLabel={tc("cancel")}
          closeLabel={tc("close")}
          workingLabel={tc("working")}
          errorFallback={tc("error")}
          danger
          onClose={() => setConfirming(false)}
          onConfirm={async () =>
            apply(await adminFetch<AdminProduct>(`/api/admin/products/${product.id}`, { method: "DELETE" }), t("done"))
          }
        />
      )}
    </Card>
  );
}