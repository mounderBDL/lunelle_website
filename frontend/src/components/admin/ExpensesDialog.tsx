"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { ApiError, adminFetch } from "@/lib/admin/api";
import { formatMoney } from "@/lib/format";
import Dialog from "./Dialog";
import { ErrorNote, INPUT, PRIMARY } from "./FormBits";

type Expense = { id: string; label: string; amount: number };
type MonthData = { month: string; items: Expense[]; total: number };

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const shiftMonth = (month: string, by: number) => {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m - 1 + by, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

/** The owner's list of monthly costs besides the bottles; each month keeps its own list. */
export default function ExpensesDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations("admin.stats.expenses");
  const tc = useTranslations("admin.common");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const listId = useId();

  const now = currentMonth();
  const [month, setMonth] = useState(now);
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");

  const monthName = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
    new Date(Number(month.slice(0, 4)), Number(month.slice(5)) - 1, 1),
  );

  const data = useQuery({
    queryKey: ["expenses", month],
    queryFn: () => adminFetch<MonthData>(`/api/admin/expenses?month=${month}`),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["expenses"] });
    void queryClient.invalidateQueries({ queryKey: ["stats"] });
  };

  const add = useMutation({
    mutationFn: () =>
      adminFetch<MonthData>("/api/admin/expenses", {
        method: "POST",
        body: JSON.stringify({ month, label: label.trim(), amount: Number(amount) }),
      }),
    onSuccess: () => {
      setAmount("");
      setLabel("");
      refresh();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminFetch<void>(`/api/admin/expenses/${id}`, { method: "DELETE" }),
    onSuccess: refresh,
  });

  const amountNumber = Number(amount);
  const valid = Number.isInteger(amountNumber) && amountNumber > 0 && label.trim().length > 0;
  const error =
    add.error instanceof ApiError && add.error.message ? add.error.message : add.isError ? t("error") : null;
  const suggestions = t.raw("suggestions") as string[];

  return (
    <Dialog title={t("title")} closeLabel={tc("close")} onClose={onClose}>
      <p className="mt-2 text-sm text-cocoa/70">{t("intro")}</p>

      <div className="mt-5 flex items-center justify-between rounded-2xl bg-petal-50 px-2 py-1.5">
        <button
          type="button"
          onClick={() => setMonth(shiftMonth(month, -1))}
          aria-label={t("previous")}
          className="rounded-full p-2 hover:bg-petal-100"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <p className="text-sm font-semibold capitalize">{monthName}</p>
        <button
          type="button"
          onClick={() => setMonth(shiftMonth(month, 1))}
          disabled={month >= now}
          aria-label={t("next")}
          className="rounded-full p-2 hover:bg-petal-100 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <form
        className="mt-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid && !add.isPending) add.mutate();
        }}
      >
        <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={10000000}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t("amount")}
            aria-label={t("amount")}
            className={`${INPUT} border-petal-300/70`}
          />
          <input
            type="text"
            list={listId}
            maxLength={60}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t("kind")}
            aria-label={t("kind")}
            className={`${INPUT} border-petal-300/70`}
          />
          <datalist id={listId}>
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        {error && (
          <div className="mt-2">
            <ErrorNote>{error}</ErrorNote>
          </div>
        )}
        <button type="submit" disabled={!valid || add.isPending} className={`${PRIMARY} mt-3 w-full`}>
          {t("add")}
        </button>
      </form>

      <div className="mt-5">
        {data.isError ? (
          <p className="text-sm text-cocoa/70">
            {t("error")}{" "}
            <button type="button" onClick={() => void data.refetch()} className="underline">
              {tc("retry")}
            </button>
          </p>
        ) : data.data === undefined ? (
          <div className="h-16 animate-pulse rounded-2xl bg-petal-100/70" aria-hidden />
        ) : data.data.items.length === 0 ? (
          <p className="rounded-2xl bg-petal-50 px-4 py-5 text-center text-sm text-cocoa/60">{t("empty")}</p>
        ) : (
          <>
            <ul className="divide-y divide-petal-200/70">
              {data.data.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1 truncate text-sm">{item.label}</span>
                  <span className="text-sm font-semibold tabular-nums">{formatMoney(item.amount, locale)}</span>
                  <button
                    type="button"
                    onClick={() => remove.mutate(item.id)}
                    disabled={remove.isPending}
                    aria-label={t("remove", { label: item.label })}
                    className="rounded-full p-1.5 text-cocoa/50 hover:bg-petal-100 hover:text-cocoa disabled:opacity-40"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex items-center justify-between border-t border-petal-300/70 pt-3 text-sm font-semibold">
              <span>{t("total")}</span>
              <span className="tabular-nums">{formatMoney(data.data.total, locale)}</span>
            </div>
          </>
        )}
      </div>

      <p className="mt-4 text-xs text-cocoa/55">{t("hint")}</p>
    </Dialog>
  );
}
