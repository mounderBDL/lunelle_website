import Image from "next/image";

/** Shown when a product, pack or category has no photo yet. */
export default function ImagePlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-blush/70">
      <Image
        src="/brand/logo.png"
        alt=""
        width={160}
        height={80}
        className="h-auto w-2/5 opacity-50 mix-blend-multiply"
      />
    </div>
  );
}