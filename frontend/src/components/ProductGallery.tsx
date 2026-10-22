"use client";

import Image from "next/image";
import { useState } from "react";
import ImagePlaceholder from "./ImagePlaceholder";

type Props = { images: { id: string; url: string }[]; alt: string; inStock: boolean };

export default function ProductGallery({ images, alt, inStock }: Props) {
  const [index, setIndex] = useState(0);
  const frame = "relative aspect-4/5 overflow-hidden rounded-t-full rounded-b-2xl bg-blush/60";

  if (images.length === 0) {
    return (
      <div className={frame}>
        <ImagePlaceholder />
      </div>
    );
  }

  const current = images[Math.min(index, images.length - 1)];

  return (
    <div>
      <div className={frame}>
        <Image
          src={current.url}
          alt={alt}
          fill
          priority
          sizes="(min-width: 768px) 50vw, 100vw"
          className={`object-cover ${inStock ? "" : "opacity-70 grayscale"}`}
        />
      </div>
      {images.length > 1 && (
        <ul className="mt-4 flex justify-center gap-3">
          {images.map((image, i) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`${alt} ${i + 1}`}
                aria-current={i === index}
                className={`relative block h-16 w-14 overflow-hidden rounded-lg border-2 ${
                  i === index ? "border-rose-dark" : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <Image src={image.url} alt="" fill sizes="56px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}