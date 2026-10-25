"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ApiError, adminFetch } from "@/lib/admin/api";
import type { OfficeCommune } from "@/lib/admin/deliveryTypes";
import type { DeliveryWilaya } from "@/lib/api/types";
import Dialog from "./Dialog";
import { ErrorNote, INPUT, PRIMARY, SECONDARY } from "./FormBits";
import { useToast } from "./Toasts";

const plain = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default function OfficesDialog({ wilaya, onClose }: { wilaya: DeliveryWilaya; onClose: () => void }) {
  const t = useTranslations("admin.delivery.officesDialog");
  const tc = useTranslations("admin.common");
  const queryClient = useQueryClient();
  const toast = useToast();

  const communes = useQuery({
    queryKey: ["admin", "delivery", "communes", wilaya.id],
    queryFn: () => adminFetch<OfficeCommune[]>(`/api/admin/delivery/wilayas/${wilaya.id}/communes`),
    staleTime: 0,
  });

  const [picked, setPicked] = useState<Set<number> | null>(null);
  const [search, setSearch] = useState("");

  const list = communes.data ?? [];
  const selected = picked ?? new Set(list.filter((c) => c.hasOffice).map((c) => c.id));
  const term = plain(search.trim());
  const shown = term ? list.filter((c) => plain(c.name).includes(term)) : list;

  function setMany(ids: number[], on: boolean) {
    const next = new Set(selected);
    for (const id of ids) {
      if (on) next.add(id);
      else next.delete(id);
    }
    setPicked(next);
  }

  const save = useMutation({
    mutationFn: () =>
      adminFetch<OfficeCommune[]>(`/api/admin/delivery/wilayas/${wilaya.id}/offices`, {
        method: "PUT",
        body: JSON.stringify({ communeIds: [...selected] }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "delivery"] });
      void queryClient.invalidateQueries({ queryKey: ["delivery"] });
      toast.push({ title: t("saved") });
      onClose();
    },
  });
  const error =
    save.error instanceof ApiError && save.error.message ? save.error.message : save.isError ? tc("error") : null;

  return (
    <Dialog title={t("title", { wilaya: wilaya.name })} closeLabel={tc("close")} onClose={onClose}>
      <p className="mt-2 text-sm text-cocoa/70">{t("text")}</p>

      {communes.isPending ? (
        <div className="mt-5 h-48 animate-pulse rounded-2xl bg-petal-100/70" aria-hidden />
      ) : communes.isError ? (
        <p className="mt-5 text-sm text-cocoa/70">{t("loadError")}</p>
      ) : (
        <>
          <div className="relative mt-5">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cocoa/40" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("search")}
              aria-label={t("search")}
              className={`${INPUT} border-petal-300/70 pl-11`}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-semibold tabular-nums">{t("selected", { count: selected.size })}</span>
            <span className="flex gap-4">
              <button
                type="button"
                onClick={() => setMany(shown.map((c) => c.id), true)}
                className="font-semibold text-petal-700 underline"
              >
                {t("tickShown")}
              </button>
              <button
                type="button"
                onClick={() => setMany(shown.map((c) => c.id), false)}
                className="font-semibold text-petal-700 underline"
              >
                {t("clearShown")}
              </button>
            </span>
          </div>

          {shown.length === 0 ? (
            <p className="mt-4 text-sm text-cocoa/60">{t("empty")}</p>
          ) : (
            <ul className="mt-3 max-h-72 divide-y divide-petal-100 overflow-y-auto rounded-2xl border border-petal-200">
              {shown.map((c) => (
                <li key={c.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm hover:bg-petal-50">
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={(e) => setMany([c.id], e.target.checked)}
                      className="h-4 w-4 accent-petal-700"
                    />
                    {c.name}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {error && (
        <div className="mt-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className={SECONDARY}>
          {tc("cancel")}
        </button>
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending || communes.isPending || communes.isError}
          className={PRIMARY}
        >
          {save.isPending ? tc("working") : t("save")}
        </button>
      </div>
    </Dialog>
  );
}