"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ImagePlus, Moon, Pencil, Plus, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import ImagePlaceholder from "@/components/ImagePlaceholder";
import { ApiError, adminFetch } from "@/lib/admin/api";
import type { AdminCategory, AdminProduct } from "@/lib/admin/catalogTypes";
import { isAcceptedImage, prepareImage } from "@/lib/admin/images";
import { imageUrlOrNull, localized } from "@/lib/format";
import { Skeleton } from "./Card";
import ConfirmDialog from "./ConfirmDialog";
import Dialog from "./Dialog";
import { Chip, ErrorNote, LanguagePair, PRIMARY, SECONDARY, Toggle } from "./FormBits";
import { useToast } from "./Toasts";

function toRequest(c: AdminCategory, sortOrder: number) {
  return {
    name: { en: c.name.en ?? c.name.fr ?? "", fr: c.name.fr ?? c.name.en ?? "" },
    description: { en: c.description.en, fr: c.description.fr },
    imageUrl: c.imageUrl,
    sortOrder,
    active: c.active,
  };
}

export default function CategoriesView() {
  const t = useTranslations("admin.categories");
  const tc = useTranslations("admin.common");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const toast = useToast();

  const categories = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: () => adminFetch<AdminCategory[]>("/api/admin/categories"),
  });
  const products = useQuery({
    queryKey: ["admin", "products", "all"],
    queryFn: () => adminFetch<AdminProduct[]>("/api/admin/products?includeArchived=true"),
  });

  const [editing, setEditing] = useState<AdminCategory | "new" | null>(null);
  const [deleting, setDeleting] = useState<AdminCategory | null>(null);
  const [moving, setMoving] = useState(false);

  const list = categories.data ?? [];
  const counts = new Map<string, number>();
  for (const p of products.data ?? []) counts.set(p.categoryId, (counts.get(p.categoryId) ?? 0) + 1);

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (moving || target < 0 || target >= list.length) return;
    const reordered = [...list];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setMoving(true);
    try {
      await Promise.all(
        reordered.map((c, i) =>
          c.sortOrder === i
            ? null
            : adminFetch(`/api/admin/categories/${c.id}`, { method: "PUT", body: JSON.stringify(toRequest(c, i)) }),
        ),
      );
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    } catch {
      toast.push({ title: tc("error") });
    } finally {
      setMoving(false);
    }
  }

  const iconButton =
    "rounded-full p-2 text-cocoa/60 transition-colors hover:bg-petal-100 hover:text-petal-700 disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl">{t("title")}</h1>
          <p className="mt-1 text-cocoa/60">{t("subtitle")}</p>
        </div>
        <button type="button" onClick={() => setEditing("new")} className={`${PRIMARY} flex items-center gap-2`}>
          <Plus className="h-4 w-4" aria-hidden />
          {t("new")}
        </button>
      </header>

      <div className="mt-8">
        {categories.isPending ? (
          <Skeleton />
        ) : categories.isError ? (
          <div className="rounded-3xl border border-petal-200/70 bg-white/75 p-8 text-center">
            <p className="text-cocoa/70">{t("loadError")}</p>
            <button type="button" onClick={() => void categories.refetch()} className={`${SECONDARY} mt-4`}>
              {t("retry")}
            </button>
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-3xl border border-petal-200/70 bg-white/75 p-12 text-center">
            <Moon className="mx-auto h-10 w-10 text-rose/60" aria-hidden />
            <p className="mt-4 font-display text-2xl">{t("empty")}</p>
            <p className="mt-2 text-sm text-cocoa/60">{t("emptyHint")}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {list.map((c, i) => {
              const name = localized(c.name, locale);
              const count = counts.get(c.id) ?? 0;
              const image = imageUrlOrNull(c.imageUrl);
              return (
                <li
                  key={c.id}
                  className="flex items-center gap-4 rounded-3xl border border-petal-200/70 bg-white/75 p-4 shadow-sm"
                >
                  <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-t-full rounded-b-xl bg-petal-100">
                    {image ? (
                      <Image src={image} alt={name} fill sizes="64px" className="object-cover" />
                    ) : (
                      <ImagePlaceholder />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-bold">{name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-sm text-cocoa/60">{t("products", { count })}</span>
                      {!c.active && <Chip tone="stone">{t("hidden")}</Chip>}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => void move(i, -1)}
                        disabled={i === 0 || moving}
                        aria-label={t("moveUp")}
                        title={t("moveUp")}
                        className={`${iconButton} p-1`}
                      >
                        <ArrowUp className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => void move(i, 1)}
                        disabled={i === list.length - 1 || moving}
                        aria-label={t("moveDown")}
                        title={t("moveDown")}
                        className={`${iconButton} p-1`}
                      >
                        <ArrowDown className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditing(c)}
                      aria-label={t("edit")}
                      title={t("edit")}
                      className={iconButton}
                    >
                      <Pencil className="h-5 w-5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(c)}
                      disabled={count > 0}
                      aria-label={count > 0 ? t("deleteBlocked") : t("delete")}
                      title={count > 0 ? t("deleteBlocked") : t("delete")}
                      className={`${iconButton} hover:text-terracotta-dark`}
                    >
                      <Trash2 className="h-5 w-5" aria-hidden />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {editing && (
        <CategoryDialog
          category={editing === "new" ? null : editing}
          nextOrder={list.length}
          onClose={() => setEditing(null)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title={t("deleteTitle")}
          text={t("deleteText", { name: localized(deleting.name, locale) })}
          confirmLabel={tc("delete")}
          cancelLabel={tc("cancel")}
          closeLabel={tc("close")}
          workingLabel={tc("working")}
          errorFallback={tc("error")}
          danger
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await adminFetch(`/api/admin/categories/${deleting.id}`, { method: "DELETE" });
            await queryClient.invalidateQueries({ queryKey: ["admin"] });
            toast.push({ title: t("deleted") });
          }}
        />
      )}
    </div>
  );
}

function CategoryDialog({
  category,
  nextOrder,
  onClose,
}: {
  category: AdminCategory | null;
  nextOrder: number;
  onClose: () => void;
}) {
  const t = useTranslations("admin.categories");
  const tf = useTranslations("admin.categories.form");
  const tc = useTranslations("admin.common");
  const queryClient = useQueryClient();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const [nameEn, setNameEn] = useState(category?.name.en ?? "");
  const [nameFr, setNameFr] = useState(category?.name.fr ?? "");
  const [descEn, setDescEn] = useState(category?.description.en ?? "");
  const [descFr, setDescFr] = useState(category?.description.fr ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(category?.imageUrl ?? null);
  const [active, setActive] = useState(category?.active ?? true);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | undefined>();

  const save = useMutation({
    mutationFn: (body: object) =>
      adminFetch<AdminCategory>(category ? `/api/admin/categories/${category.id}` : "/api/admin/categories", {
        method: category ? "PUT" : "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast.push({ title: category ? t("saved") : t("created") });
      onClose();
    },
  });

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!isAcceptedImage(file)) {
      setPhotoError(tf("errors.photoType"));
      return;
    }
    setUploading(true);
    setPhotoError(null);
    try {
      const body = new FormData();
      body.append("file", await prepareImage(file));
      const result = await adminFetch<{ url: string }>("/api/admin/uploads?folder=categories", {
        method: "POST",
        body,
      });
      setImageUrl(result.url);
    } catch {
      setPhotoError(tf("errors.photo"));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (save.isPending || uploading) return;
    if (!nameEn.trim() && !nameFr.trim()) {
      setNameError(tf("errors.name"));
      document.getElementById("cat-name-en")?.focus();
      return;
    }
    setNameError(undefined);
    save.mutate({
      name: { en: nameEn.trim() || nameFr.trim(), fr: nameFr.trim() || nameEn.trim() },
      description: { en: descEn.trim() || null, fr: descFr.trim() || null },
      imageUrl,
      sortOrder: category ? category.sortOrder : nextOrder,
      active,
    });
  }

  const preview = imageUrlOrNull(imageUrl);
  const error =
    save.error instanceof ApiError && save.error.message ? save.error.message : save.isError ? tc("error") : null;

  return (
    <Dialog title={category ? t("editTitle") : t("newTitle")} closeLabel={tc("close")} onClose={onClose}>
      <form onSubmit={onSubmit} noValidate className="mt-5 space-y-5">
        <LanguagePair
          id="cat-name"
          label={tf("name")}
          hint={tf("nameHint")}
          error={nameError}
          en={nameEn}
          fr={nameFr}
          onEn={setNameEn}
          onFr={setNameFr}
          enLabel={tf("english")}
          frLabel={tf("french")}
          maxLength={150}
        />
        <LanguagePair
          id="cat-desc"
          label={tf("description")}
          en={descEn}
          fr={descFr}
          onEn={setDescEn}
          onFr={setDescFr}
          enLabel={tf("english")}
          frLabel={tf("french")}
          rows={2}
          maxLength={2000}
        />

        <div>
          <p className="mb-1.5 text-sm font-semibold">{tf("photo")}</p>
          <div className="flex items-center gap-4">
            <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-t-full rounded-b-xl bg-petal-100">
              {preview ? <Image src={preview} alt="" fill sizes="80px" className="object-cover" /> : <ImagePlaceholder />}
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                id="cat-photo"
                onChange={(e) => void onFile(e.target.files?.[0])}
              />
              <label
                htmlFor="cat-photo"
                className={`${SECONDARY} inline-flex cursor-pointer items-center gap-2 ${uploading ? "pointer-events-none opacity-50" : ""}`}
              >
                <ImagePlus className="h-4 w-4" aria-hidden />
                {uploading ? tf("uploading") : preview ? tf("changePhoto") : tf("addPhoto")}
              </label>
              {preview && (
                <button type="button" onClick={() => setImageUrl(null)} className={`${SECONDARY} inline-flex items-center gap-2`}>
                  <X className="h-4 w-4" aria-hidden />
                  {tf("removePhoto")}
                </button>
              )}
            </div>
          </div>
          {photoError && <p role="alert" className="mt-2 text-sm text-red-700">{photoError}</p>}
        </div>

        <Toggle checked={active} onChange={setActive} label={tf("visible")} hint={tf("visibleHint")} />

        {error && <ErrorNote>{error}</ErrorNote>}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={SECONDARY}>
            {tc("cancel")}
          </button>
          <button type="submit" disabled={save.isPending || uploading} className={PRIMARY}>
            {save.isPending ? tf("saving") : tf("save")}
          </button>
        </div>
      </form>
    </Dialog>
  );
}