"use client";

import { ImagePlus, X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import ImagePlaceholder from "@/components/ImagePlaceholder";
import { adminFetch } from "@/lib/admin/api";
import { isAcceptedImage, prepareImage } from "@/lib/admin/images";
import { imageUrlOrNull } from "@/lib/format";
import { SECONDARY } from "./FormBits";

export default function PackPhoto({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const t = useTranslations("admin.packs.photo");
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preview = imageUrlOrNull(value);

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!isAcceptedImage(file)) {
      setError(t("type"));
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", await prepareImage(file));
      const result = await adminFetch<{ url: string }>("/api/admin/uploads?folder=packs", { method: "POST", body });
      onChange(result.url);
    } catch {
      setError(t("error"));
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold">{t("title")}</p>
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative aspect-4/3 w-48 overflow-hidden rounded-2xl bg-petal-100">
          {preview ? <Image src={preview} alt="" fill sizes="192px" className="object-cover" /> : <ImagePlaceholder />}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            id="pack-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          <label
            htmlFor="pack-photo"
            className={`${SECONDARY} inline-flex cursor-pointer items-center gap-2 ${uploading ? "pointer-events-none opacity-50" : ""}`}
          >
            <ImagePlus className="h-4 w-4" aria-hidden />
            {uploading ? t("uploading") : preview ? t("change") : t("add")}
          </label>
          {preview && (
            <button type="button" onClick={() => onChange(null)} className={`${SECONDARY} inline-flex items-center gap-2`}>
              <X className="h-4 w-4" aria-hidden />
              {t("remove")}
            </button>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}