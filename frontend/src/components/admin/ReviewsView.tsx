"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, ImagePlus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { ApiError, adminFetch } from "@/lib/admin/api";
import { isAcceptedImage, prepareImage } from "@/lib/admin/images";
import type { ReviewShot } from "@/lib/api/types";
import { imageUrlOrNull } from "@/lib/format";
import Card, { Skeleton } from "./Card";
import ConfirmDialog from "./ConfirmDialog";

const MAX_REVIEWS = 24; // keep equal to ReviewService.MAX_REVIEWS on the server
const KEY = ["admin", "reviews"];

export default function ReviewsView() {
  const t = useTranslations("admin.reviews");
  const tc = useTranslations("admin.common");
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const list = useQuery({ queryKey: KEY, queryFn: () => adminFetch<ReviewShot[]>("/api/admin/reviews") });
  const shots = list.data ?? [];

  async function upload(files: File[]) {
    if (working || files.length === 0) return;
    setError(null);
    const valid = files.filter(isAcceptedImage);
    const room = MAX_REVIEWS - shots.length;
    if (room <= 0) {
      setError(t("full", { max: MAX_REVIEWS }));
      return;
    }
    const batch = valid.slice(0, room);
    if (valid.length < files.length) setError(t("wrongType"));
    else if (valid.length > room) setError(t("tooMany", { count: room }));
    if (batch.length === 0) return;

    setWorking(true);
    try {
      let current = shots;
      for (const [i, file] of batch.entries()) {
        setProgress({ current: i + 1, total: batch.length });
        const body = new FormData();
        body.append("file", await prepareImage(file));
        const created = await adminFetch<ReviewShot>("/api/admin/reviews", { method: "POST", body });
        current = [...current, created];
        queryClient.setQueryData(KEY, current);
      }
    } catch (e) {
      setError(e instanceof ApiError && e.message ? e.message : t("error"));
    } finally {
      setWorking(false);
      setProgress(null);
      if (fileInput.current) fileInput.current.value = "";
      void queryClient.invalidateQueries({ queryKey: KEY });
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (working || target < 0 || target >= shots.length) return;
    const ids = shots.map((s) => s.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setWorking(true);
    setError(null);
    try {
      queryClient.setQueryData(
        KEY,
        await adminFetch<ReviewShot[]>("/api/admin/reviews/order", { method: "PUT", body: JSON.stringify({ ids }) }),
      );
    } catch {
      setError(t("error"));
    } finally {
      setWorking(false);
    }
  }

  const arrow =
    "rounded-full p-1.5 text-cocoa/60 transition-colors hover:bg-petal-100 hover:text-petal-700 disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl">{t("title")}</h1>
          <p className="mt-1 max-w-2xl text-cocoa/60">{t("subtitle")}</p>
        </div>
        <span className="rounded-full bg-petal-100 px-3.5 py-1.5 text-sm font-semibold text-petal-700">
          {t("counter", { count: shots.length, max: MAX_REVIEWS })}
        </span>
      </header>

      <div className="mt-8">
        {list.isPending ? (
          <Skeleton />
        ) : list.isError ? (
          <Card>
            <p className="text-center text-cocoa/70">{t("loadError")}</p>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => void list.refetch()}
                className="rounded-full border border-petal-300 px-5 py-2 text-sm font-semibold hover:bg-petal-50"
              >
                {t("retry")}
              </button>
            </div>
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-cocoa/70">{t("hint", { max: MAX_REVIEWS })}</p>

            <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {shots.map((shot, i) => {
                const src = imageUrlOrNull(shot.url);
                return (
                  <li key={shot.id}>
                    <div className="relative aspect-3/4 overflow-hidden rounded-2xl bg-petal-50 ring-1 ring-petal-200/70">
                      {src && <Image src={src} alt={t("number", { number: i + 1 })} fill sizes="220px" className="object-contain" />}
                      <span className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-petal-700 text-xs font-bold text-white">
                        {i + 1}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <div className="flex">
                        <button
                          type="button"
                          onClick={() => void move(i, -1)}
                          disabled={i === 0 || working}
                          aria-label={t("moveEarlier")}
                          title={t("moveEarlier")}
                          className={arrow}
                        >
                          <ArrowLeft className="h-4 w-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => void move(i, 1)}
                          disabled={i === shots.length - 1 || working}
                          aria-label={t("moveLater")}
                          title={t("moveLater")}
                          className={arrow}
                        >
                          <ArrowRight className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDeleting(shot.id)}
                        disabled={working}
                        aria-label={t("delete")}
                        title={t("delete")}
                        className={`${arrow} hover:text-terracotta-dark`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </li>
                );
              })}

              {shots.length < MAX_REVIEWS && (
                <li>
                  <input
                    ref={fileInput}
                    id="reviews-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="sr-only"
                    onChange={(e) => void upload(Array.from(e.target.files ?? []))}
                  />
                  <label
                    htmlFor="reviews-input"
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragging(false);
                      void upload(Array.from(e.dataTransfer.files));
                    }}
                    className={`flex aspect-3/4 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-3 text-center text-sm transition-colors ${
                      dragging ? "border-petal-700 bg-petal-100" : "border-petal-300 hover:bg-petal-50"
                    } ${working ? "pointer-events-none opacity-50" : ""}`}
                  >
                    <ImagePlus className="h-7 w-7 text-petal-600" aria-hidden />
                    <span className="font-semibold">
                      {progress ? t("uploading", { current: progress.current, total: progress.total }) : t("add")}
                    </span>
                    {!working && <span className="text-xs text-cocoa/60">{t("drop")}</span>}
                  </label>
                </li>
              )}
            </ul>

            {shots.length === 0 && <p className="mt-3 text-sm text-cocoa/60">{t("empty")}</p>}
            {error && (
              <p role="alert" className="mt-3 text-sm text-red-700">
                {error}
              </p>
            )}
          </Card>
        )}
      </div>

      {deleting && (
        <ConfirmDialog
          title={t("deleteTitle")}
          text={t("deleteText")}
          confirmLabel={tc("delete")}
          cancelLabel={tc("cancel")}
          closeLabel={tc("close")}
          workingLabel={tc("working")}
          errorFallback={tc("error")}
          danger
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await adminFetch(`/api/admin/reviews/${deleting}`, { method: "DELETE" });
            queryClient.setQueryData<ReviewShot[]>(KEY, (old) => (old ?? []).filter((s) => s.id !== deleting));
          }}
        />
      )}
    </div>
  );
}