"use client";

import { useState } from "react";
import { ApiError } from "@/lib/admin/api";
import Dialog from "./Dialog";

type Props = {
  title: string;
  text: string;
  confirmLabel: string;
  cancelLabel: string;
  closeLabel: string;
  workingLabel: string;
  errorFallback: string;
  danger?: boolean;
  onConfirm: () => Promise<unknown>;
  onClose: () => void;
};

export default function ConfirmDialog({
  title,
  text,
  confirmLabel,
  cancelLabel,
  closeLabel,
  workingLabel,
  errorFallback,
  danger = false,
  onConfirm,
  onClose,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      setError(e instanceof ApiError && e.message ? e.message : errorFallback);
      setBusy(false);
    }
  }

  return (
    <Dialog title={title} closeLabel={closeLabel} onClose={onClose}>
      <p className="mt-3 text-cocoa/75">{text}</p>
      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="rounded-full border border-petal-300 px-6 py-2.5 text-sm font-semibold hover:bg-petal-100 disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy}
          className={`rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            danger ? "bg-terracotta-dark hover:bg-cocoa" : "bg-petal-700 hover:bg-cocoa"
          }`}
        >
          {busy ? workingLabel : confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}