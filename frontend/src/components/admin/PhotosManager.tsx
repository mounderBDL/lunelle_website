"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, ImagePlus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { ApiError, adminFetch } from "@/lib/admin/api";
import type { AdminProduct } from "@/lib/admin/catalogTypes";
import { isAcceptedImage, prepareImage } from "@/lib/admin/images";
import { imageUrlOrNull } from "@/lib/format";
import Card from "./Card";
import ConfirmDialog from "./ConfirmDialog";

const MAX_PHOTOS = 8;

export default function PhotosManager({ product }: { product: AdminProduct }) {
  const t = useTranslations("admin.products.photos");
  const tc = useTranslations("admin.common");
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const images = product.images;

  function apply(updated: AdminProduct) {
    queryClient.setQueryData(["admin", "products", product.id], updated);
    void queryClient.invalidateQueries({ queryKey: ["admin", "products", "all"] });
  }

  async function upload(files: File[]) {
    if (busy || files.length === 0) return;
    setError(null);
    const valid = files.filter(isAcceptedImage);
    const room = MAX_PHOTOS - images.length;
    if (room <= 0) {
      setError(t("full", { count: MAX_PHOTOS }));
      return;
    }
    const batch = valid.slice(0, room);
    if (valid.length < files.length) setError(t("wrongType"));
    else if (valid.length > room) setError(t("tooMany", { count: MAX_PHOTOS }));
    if (batch.length === 0) return;

    setBusy(true);
    try {
      let latest: AdminProduct | null = null;
      for (const file of batch) {
        const body = new FormData();
        body.append("file", await prepareImage(file));
        latest = await adminFetch<AdminProduct>(`/api/admin/products/${product.id}/images`, {
          method: "POST",
          body,
        });
      }
      if (latest) apply(latest);
    } catch (e) {
      setError(e instanceof ApiError && e.message ? e.message : t("error"));
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (busy || target < 0 || target >= images.length) return;
    const ids = images.map((i) => i.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setBusy(true);
    setError(null);
    try {
      apply(
        await adminFetch<AdminProduct>(`/api/admin/products/${product.id}/images/order`, {
          method: "PUT",
          body: JSON.stringify({ imageIds: ids }),
        }),
      );
    } catch {
      setError(t("error"));
    } finally {
      setBusy(false);
    }
  }

  const arrow =
    "rounded-full p-1.5 text-cocoa/60 transition-colors hover:bg-petal-100 hover:text-petal-700 disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <Card title={t("title")}>
      <p className="text-sm text-cocoa/70">{t("hint", { count: MAX_PHOTOS })}</p>

      <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((image, i) => {
          const src = imageUrlOrNull(image.url);
          return (
            <li key={image.id}>
              <div className="relative aspect-4/5 overflow-hidden rounded-2xl bg-petal-100">
                {src && <Image src={src} alt="" fill sizes="200px" className="object-cover" />}
                {i === 0 && (
                  <span className="absolute left-2 top-2 rounded-full bg-petal-700 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white">
                    {t("cover")}
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => void move(i, -1)}
                    disabled={i === 0 || busy}
                    aria-label={t("moveEarlier")}
                    title={t("moveEarlier")}
                    className={arrow}
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => void move(i, 1)}
                    disabled={i === images.length - 1 || busy}
                    aria-label={t("moveLater")}
                    title={t("moveLater")}
                    className={arrow}
                  >
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleting(image.id)}
                  disabled={busy}
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

        {images.length < MAX_PHOTOS && (
          <li>
            <input
              ref={fileInput}
              id="photos-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={(e) => void upload(Array.from(e.target.files ?? []))}
            />
            <label
              htmlFor="photos-input"
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
              className={`flex aspect-4/5 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-3 text-center text-sm transition-colors ${
                dragging ? "border-petal-700 bg-petal-100" : "border-petal-300 hover:bg-petal-50"
              } ${busy ? "pointer-events-none opacity-50" : ""}`}
            >
              <ImagePlus className="h-7 w-7 text-petal-600" aria-hidden />
              <span className="font-semibold">{busy ? t("uploading") : t("add")}</span>
              {!busy && <span className="text-xs text-cocoa/60">{t("drop")}</span>}
            </label>
          </li>
        )}
      </ul>

      {images.length === 0 && <p className="mt-3 text-sm text-cocoa/60">{t("empty")}</p>}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}

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
          onConfirm={async () => apply(await adminFetch<AdminProduct>(`/api/admin/product-images/${deleting}`, { method: "DELETE" }))}
        />
      )}
    </Card>
  );
}