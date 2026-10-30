import Image from "next/image";
import type { PublicPackItem } from "@/lib/api/types";
import { imageUrlOrNull } from "@/lib/format";
import ImagePlaceholder from "./ImagePlaceholder";

/** Shown on pack cards that have no photo of their own: a small fan of the items inside. */
export default function PackFanMini({ items }: { items: PublicPackItem[] }) {
  const photos = items
    .map((item) => imageUrlOrNull(item.imageUrl))
    .filter((url): url is string => url !== null)
    .slice(0, 3);
  if (photos.length === 0) return <ImagePlaceholder />;

  const n = photos.length;
  return (
    <div
      aria-hidden
      className="absolute inset-0 flex items-end justify-center overflow-hidden bg-linear-to-b from-blush/70 to-petal-100/60 pb-5"
    >
      <div className="relative h-[66%] w-full">
        {photos.map((url, i) => (
          <div
            key={i}
            className="pack-fan-mini-card absolute bottom-0 left-1/2 aspect-3/4 h-full overflow-hidden rounded-xl border-[3px] border-white bg-blush shadow-md"
            style={{ "--a": `${(i - (n - 1) / 2) * 14}deg`, zIndex: i } as React.CSSProperties}
          >
            <Image src={url} alt="" fill sizes="140px" className="object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
}