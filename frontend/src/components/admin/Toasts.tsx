"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastInput = { title: string; text?: string; href?: string; actionLabel?: string };
type Toast = ToastInput & { id: string };

const ToastContext = createContext<{ push: (toast: ToastInput) => void }>({ push: () => {} });

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations("admin.common");
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => setToasts((all) => all.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (input: ToastInput) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((all) => [...all.slice(-2), { ...input, id }]);
      window.setTimeout(() => dismiss(id), 10_000);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-3 px-4 sm:items-end sm:pr-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-rose/20 bg-white p-4 shadow-[0_12px_40px_-12px_rgba(154,85,96,0.4)]"
          >
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-rose-dark" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg leading-tight">{toast.title}</p>
              {toast.text && <p className="mt-1 text-sm text-cocoa/70">{toast.text}</p>}
              {toast.href && (
                <Link
                  href={toast.href}
                  onClick={() => dismiss(toast.id)}
                  className="mt-2 inline-block text-sm font-medium text-rose-dark underline"
                >
                  {toast.actionLabel}
                </Link>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label={t("dismiss")}
              className="rounded-full p-1 text-cocoa/50 hover:bg-blush"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}