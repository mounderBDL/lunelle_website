"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Search, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError, adminFetch } from "@/lib/admin/api";
import type { OfficeImportResult } from "@/lib/admin/deliveryTypes";
import { parseWhole } from "@/lib/admin/numbers";
import type { DeliveryWilaya } from "@/lib/api/types";
import Card, { Skeleton } from "./Card";
import Dialog from "./Dialog";
import { ErrorNote, INPUT, PRIMARY, SECONDARY } from "./FormBits";
import OfficesDialog from "./OfficesDialog";
import YalidineSyncCard from "./YalidineSyncCard";
import Switch from "./Switch";
import { useToast } from "./Toasts";

const MAX_FEE = 100_000;

type Values = { active: boolean; homeFee: string; homeOn: boolean; deskFee: string; deskOn: boolean };
type Draft = Partial<Values>;
type FilterKey = "all" | "on" | "off" | "noOffice";

const base = (w: DeliveryWilaya): Values => ({
  active: w.active,
  homeFee: String(w.home.fee),
  homeOn: w.home.available,
  deskFee: String(w.stopDesk.fee),
  deskOn: w.stopDesk.available,
});

const merged = (w: DeliveryWilaya, d: Draft | undefined): Values => {
  const b = base(w);
  return {
    active: d?.active ?? b.active,
    homeFee: d?.homeFee ?? b.homeFee,
    homeOn: d?.homeOn ?? b.homeOn,
    deskFee: d?.deskFee ?? b.deskFee,
    deskOn: d?.deskOn ?? b.deskOn,
  };
};

const badFee = (text: string) => parseWhole(text, MAX_FEE) === null;
const plain = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// ───────────────────────── page ─────────────────────────

export default function DeliveryView() {
  const t = useTranslations("admin.delivery");
  const tc = useTranslations("admin.common");
  const queryClient = useQueryClient();
  const toast = useToast();

  const wilayasQuery = useQuery({
    queryKey: ["admin", "delivery", "wilayas"],
    queryFn: () => adminFetch<DeliveryWilaya[]>("/api/admin/delivery/wilayas"),
  });
  const wilayas = useMemo(() => wilayasQuery.data ?? [], [wilayasQuery.data]);

  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [homeFill, setHomeFill] = useState("");
  const [deskFill, setDeskFill] = useState("");
  const [fillError, setFillError] = useState(false);
  const [officesFor, setOfficesFor] = useState<DeliveryWilaya | null>(null);
  const [importResult, setImportResult] = useState<OfficeImportResult | null>(null);
  const [busy, setBusy] = useState<"export" | "import" | null>(null);
  const [toolError, setToolError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const dirtyIds = Object.keys(drafts).map(Number);
  const dirtyCount = dirtyIds.length;

  // warn before leaving the page with unsaved changes
  useEffect(() => {
    if (dirtyCount === 0) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirtyCount]);

  // ── editing ──
  function setField(w: DeliveryWilaya, patch: Draft) {
    setDrafts((all) => {
      const current: Draft = { ...(all[w.id] ?? {}) };
      const b = base(w);
      for (const key of Object.keys(patch) as (keyof Values)[]) {
        const value = patch[key];
        if (value === undefined) continue;
        if (b[key] === value) delete current[key];
        else (current as Record<string, unknown>)[key] = value;
      }
      const next = { ...all };
      if (Object.keys(current).length === 0) delete next[w.id];
      else next[w.id] = current;
      return next;
    });
  }

  function toggleActive(w: DeliveryWilaya, on: boolean) {
    const m = merged(w, drafts[w.id]);
    // switching a wilaya on with nothing available would be pointless: turn both options on
    if (on && !m.homeOn && !m.deskOn) setField(w, { active: true, homeOn: true, deskOn: true });
    else setField(w, { active: on });
  }

  function applyQuickFill() {
    const hasHome = homeFill.trim() !== "";
    const hasDesk = deskFill.trim() !== "";
    const home = hasHome ? parseWhole(homeFill, MAX_FEE) : null;
    const desk = hasDesk ? parseWhole(deskFill, MAX_FEE) : null;
    if ((!hasHome && !hasDesk) || (hasHome && home === null) || (hasDesk && desk === null)) {
      setFillError(true);
      return;
    }
    setFillError(false);
    setDrafts((all) => {
      const next = { ...all };
      for (const w of wilayas) {
        if (!merged(w, all[w.id]).active) continue;
        const current: Draft = { ...(next[w.id] ?? {}) };
        const b = base(w);
        if (home !== null) {
          if (String(home) === b.homeFee) delete current.homeFee;
          else current.homeFee = String(home);
        }
        if (desk !== null) {
          if (String(desk) === b.deskFee) delete current.deskFee;
          else current.deskFee = String(desk);
        }
        if (Object.keys(current).length === 0) delete next[w.id];
        else next[w.id] = current;
      }
      return next;
    });
  }

  // ── saving ──
  const hasInvalid = dirtyIds.some((id) => {
    const w = wilayas.find((x) => x.id === id);
    if (!w) return false;
    const m = merged(w, drafts[id]);
    return badFee(m.homeFee) || badFee(m.deskFee);
  });

  const save = useMutation({
    mutationFn: (updates: object[]) =>
      adminFetch<DeliveryWilaya[]>("/api/admin/delivery/wilayas", { method: "PUT", body: JSON.stringify(updates) }),
    onSuccess: (list) => {
      queryClient.setQueryData(["admin", "delivery", "wilayas"], list);
      void queryClient.invalidateQueries({ queryKey: ["delivery"] });
      setDrafts({});
      toast.push({ title: t("saved") });
    },
  });

  function submit() {
    if (save.isPending || hasInvalid) return;
    const updates = dirtyIds.flatMap((id) => {
      const w = wilayas.find((x) => x.id === id);
      if (!w) return [];
      const m = merged(w, drafts[id]);
      return [
        {
          id,
          active: m.active,
          home: { fee: parseWhole(m.homeFee, MAX_FEE), available: m.homeOn },
          stopDesk: { fee: parseWhole(m.deskFee, MAX_FEE), available: m.deskOn },
        },
      ];
    });
    save.mutate(updates);
  }

  // ── offices: download and upload ──
  async function downloadList() {
    setBusy("export");
    setToolError(null);
    try {
      const res = await fetch("/api/admin/delivery/communes/export", { credentials: "same-origin", cache: "no-store" });
      if (!res.ok) throw new Error("export failed");
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "lunelle-communes.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setToolError(t("tools.exportError"));
    } finally {
      setBusy(null);
    }
  }

  async function uploadList(file: File | undefined) {
    if (!file) return;
    setBusy("import");
    setToolError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const result = await adminFetch<OfficeImportResult>("/api/admin/delivery/offices/import", { method: "POST", body });
      setImportResult(result);
      void queryClient.invalidateQueries({ queryKey: ["admin", "delivery"] });
      void queryClient.invalidateQueries({ queryKey: ["delivery"] });
    } catch (e) {
      setToolError(e instanceof ApiError && e.message ? e.message : t("tools.importError"));
    } finally {
      setBusy(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  // ── filtering ──
  const rows = useMemo(() => {
    const term = plain(search.trim());
    return wilayas.filter((w) => {
      const m = merged(w, drafts[w.id]);
      if (filter === "on" && !m.active) return false;
      if (filter === "off" && m.active) return false;
      if (filter === "noOffice" && !(m.active && w.officeCount === 0)) return false;
      if (!term) return true;
      return plain(w.name).includes(term) || String(w.id).padStart(2, "0").includes(term) || String(w.id) === term;
    });
  }, [wilayas, drafts, search, filter]);

  const countOf = (key: FilterKey) =>
    wilayas.filter((w) => {
      const m = merged(w, drafts[w.id]);
      if (key === "on") return m.active;
      if (key === "off") return !m.active;
      if (key === "noOffice") return m.active && w.officeCount === 0;
      return true;
    }).length;

  const officeCommunes = wilayas.reduce((sum, w) => sum + w.officeCount, 0);
  const officeWilayas = wilayas.filter((w) => w.officeCount > 0).length;
  const saveError =
    save.error instanceof ApiError && save.error.message ? save.error.message : save.isError ? tc("error") : null;

  return (
    <div className={dirtyCount > 0 ? "pb-28" : ""}>
      <header>
        <h1 className="text-4xl sm:text-5xl">{t("title")}</h1>
        <p className="mt-1 text-cocoa/60">{t("subtitle")}</p>
      </header>

      <div className="mt-8">
        <YalidineSyncCard />
      </div>
      
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card title={t("quickFill.title")}>
          <p className="text-sm text-cocoa/70">{t("quickFill.text")}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">{t("quickFill.home")}</span>
              <input
                inputMode="numeric"
                value={homeFill}
                onChange={(e) => setHomeFill(e.target.value)}
                className={`${INPUT} border-petal-300/70`}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">{t("quickFill.office")}</span>
              <input
                inputMode="numeric"
                value={deskFill}
                onChange={(e) => setDeskFill(e.target.value)}
                className={`${INPUT} border-petal-300/70`}
              />
            </label>
          </div>
          {fillError && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {t("quickFill.error")}
            </p>
          )}
          <button type="button" onClick={applyQuickFill} disabled={wilayasQuery.isPending} className={`${SECONDARY} mt-4`}>
            {t("quickFill.apply")}
          </button>
        </Card>

        <Card title={t("tools.title")}>
          <p className="text-sm text-cocoa/70">{t("tools.text")}</p>
          {wilayasQuery.data && (
            <p className="mt-3 text-sm font-semibold tabular-nums text-sage-dark">
              {t("tools.summary", { communes: officeCommunes, wilayas: officeWilayas })}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void downloadList()}
              disabled={busy !== null}
              className={`${SECONDARY} inline-flex items-center gap-2`}
            >
              <Download className="h-4 w-4" aria-hidden />
              {busy === "export" ? t("tools.exporting") : t("tools.export")}
            </button>
            <input
              ref={fileInput}
              id="offices-file"
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => void uploadList(e.target.files?.[0])}
            />
            <label
              htmlFor="offices-file"
              className={`${SECONDARY} inline-flex cursor-pointer items-center gap-2 ${busy !== null ? "pointer-events-none opacity-50" : ""}`}
            >
              <Upload className="h-4 w-4" aria-hidden />
              {busy === "import" ? t("tools.importing") : t("tools.import")}
            </label>
          </div>
          {toolError && (
            <div className="mt-4">
              <ErrorNote>{toolError}</ErrorNote>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cocoa/40" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("search")}
            className={`${INPUT} border-petal-300/70 pl-11`}
          />
        </div>
      </div>

      <ul className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {(["all", "on", "off", "noOffice"] as FilterKey[]).map((key) => (
          <li key={key} className="shrink-0">
            <button
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={filter === key}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                filter === key
                  ? "bg-petal-700 text-white"
                  : "border border-petal-200 bg-white/70 text-cocoa/80 hover:bg-petal-100"
              }`}
            >
              {t(`filters.${key}`)}
              {wilayasQuery.data && (
                <span className={`rounded-full px-2 text-xs ${filter === key ? "bg-white/25" : "bg-petal-100"}`}>
                  {countOf(key)}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        {wilayasQuery.isPending ? (
          <Skeleton />
        ) : wilayasQuery.isError ? (
          <div className="rounded-3xl border border-petal-200/70 bg-white/75 p-8 text-center">
            <p className="text-cocoa/70">{t("loadError")}</p>
            <button type="button" onClick={() => void wilayasQuery.refetch()} className={`${SECONDARY} mt-4`}>
              {t("retry")}
            </button>
          </div>
        ) : rows.length === 0 ? (
          <p className="rounded-3xl border border-petal-200/70 bg-white/75 p-10 text-center text-cocoa/70">{t("noMatch")}</p>
        ) : (
          <>
            <div
              aria-hidden
              className="mb-2 hidden gap-6 px-4 text-xs font-semibold uppercase tracking-wider text-cocoa/50 md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.3fr)]"
            >
              <span>{t("columns.wilaya")}</span>
              <span>{t("columns.home")}</span>
              <span>{t("columns.office")}</span>
            </div>
            <ul className="space-y-3">
              {rows.map((w) => (
                <WilayaRow
                  key={w.id}
                  wilaya={w}
                  values={merged(w, drafts[w.id])}
                  changed={Boolean(drafts[w.id])}
                  onField={(patch) => setField(w, patch)}
                  onActive={(on) => toggleActive(w, on)}
                  onOffices={() => setOfficesFor(w)}
                />
              ))}
            </ul>
          </>
        )}
      </div>

      {dirtyCount > 0 && (
        <div className="no-print fixed inset-x-4 bottom-24 z-20 lg:bottom-6 lg:left-72 lg:right-10">
          <div className="mx-auto max-w-5xl rounded-2xl bg-cocoa px-5 py-3 text-white shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold">{t("unsaved", { count: dirtyCount })}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDrafts({})}
                  disabled={save.isPending}
                  className="rounded-full border border-white/40 px-5 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
                >
                  {t("discard")}
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={save.isPending || hasInvalid}
                  className="rounded-full bg-petal-300 px-5 py-2 text-sm font-semibold text-cocoa hover:bg-petal-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {save.isPending ? t("saving") : t("save")}
                </button>
              </div>
            </div>
            {hasInvalid && <p className="mt-2 text-sm text-petal-200">{t("invalid")}</p>}
            {saveError && <p className="mt-2 text-sm text-petal-200">{saveError}</p>}
          </div>
        </div>
      )}

      {officesFor && <OfficesDialog wilaya={officesFor} onClose={() => setOfficesFor(null)} />}

      {importResult && (
        <Dialog title={t("importResult.title")} closeLabel={tc("close")} onClose={() => setImportResult(null)}>
          <ul className="mt-4 space-y-1.5 text-sm tabular-nums">
            <li>{t("importResult.read", { count: importResult.rows })}</li>
            <li>{t("importResult.withOffice", { count: importResult.withOffice })}</li>
            <li className="font-semibold">{t("importResult.changed", { count: importResult.changed })}</li>
            {importResult.ignoredRows > 0 && <li>{t("importResult.ignored", { count: importResult.ignoredRows })}</li>}
          </ul>
          {importResult.unknownIds.length > 0 && (
            <p className="mt-4 rounded-xl bg-amber-soft px-4 py-3 text-sm text-amber-dark">
              {t("importResult.unknown", { ids: importResult.unknownIds.join(", ") })}
            </p>
          )}
          <div className="mt-6 flex justify-end">
            <button type="button" onClick={() => setImportResult(null)} className={PRIMARY}>
              {t("importResult.close")}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

// ───────────────────────── one wilaya ─────────────────────────

function FeeInput({
  value,
  onChange,
  label,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  invalid: boolean;
}) {
  return (
    <div className="relative w-32 shrink-0">
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        aria-invalid={invalid}
        className={`${INPUT} pr-12 tabular-nums ${invalid ? "border-red-600" : "border-petal-300/70"}`}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-cocoa/50">DZD</span>
    </div>
  );
}

function WilayaRow({
  wilaya: w,
  values: m,
  changed,
  onField,
  onActive,
  onOffices,
}: {
  wilaya: DeliveryWilaya;
  values: Values;
  changed: boolean;
  onField: (patch: Draft) => void;
  onActive: (on: boolean) => void;
  onOffices: () => void;
}) {
  const t = useTranslations("admin.delivery");
  const mobileTitle = "mb-1.5 text-xs font-semibold uppercase tracking-wider text-cocoa/60 md:hidden";

  return (
    <li
      className={`rounded-3xl border p-4 shadow-sm md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.3fr)] md:items-center md:gap-6 ${
        changed ? "border-petal-500 bg-petal-50" : "border-petal-200/70 bg-white/75"
      } ${m.active ? "" : "opacity-80"}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-petal-100 px-2 text-sm font-bold tabular-nums text-petal-700">
            {String(w.id).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <p className="truncate font-bold">{w.name}</p>
            <p className={`text-xs ${m.active ? "text-sage-dark" : "text-cocoa/50"}`}>
              {m.active ? t("open") : t("closed")}
            </p>
          </div>
        </div>
        <Switch checked={m.active} onChange={onActive} label={t("wilayaSwitch", { wilaya: w.name })} />
      </div>

      <div className="mt-4 md:mt-0">
        <p className={mobileTitle}>{t("columns.home")}</p>
        <div className="flex items-center gap-3">
          <FeeInput
            value={m.homeFee}
            onChange={(v) => onField({ homeFee: v })}
            label={t("homeFee", { wilaya: w.name })}
            invalid={badFee(m.homeFee)}
          />
          <Switch checked={m.homeOn} onChange={(v) => onField({ homeOn: v })} label={t("homeAvailable", { wilaya: w.name })} />
          <span className="text-xs text-cocoa/70">{t("available")}</span>
        </div>
      </div>

      <div className="mt-4 md:mt-0">
        <p className={mobileTitle}>{t("columns.office")}</p>
        <div className="flex flex-wrap items-center gap-3">
          <FeeInput
            value={m.deskFee}
            onChange={(v) => onField({ deskFee: v })}
            label={t("officeFee", { wilaya: w.name })}
            invalid={badFee(m.deskFee)}
          />
          <Switch checked={m.deskOn} onChange={(v) => onField({ deskOn: v })} label={t("officeAvailable", { wilaya: w.name })} />
          <span className="text-xs text-cocoa/70">{t("available")}</span>
          <button
            type="button"
            onClick={onOffices}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              w.officeCount === 0
                ? "bg-amber-soft text-amber-dark hover:bg-amber-soft/70"
                : "bg-sage-soft text-sage-dark hover:bg-sage-soft/70"
            }`}
          >
            {t("officeCount", { count: w.officeCount })} · {t("manage")}
          </button>
        </div>
        {m.deskOn && w.officeCount === 0 && <p className="mt-1.5 text-xs text-amber-dark">{t("needsOffice")}</p>}
      </div>
    </li>
  );
}