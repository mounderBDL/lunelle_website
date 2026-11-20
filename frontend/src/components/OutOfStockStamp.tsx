type Props = { label: string; large?: boolean; className?: string };

/**
 * A translucent band across the middle of a picture. The parent must be positioned (relative).
 * The text comes from the caller, so it follows the language.
 */
export default function OutOfStockStamp({ label, large = false, className = "" }: Props) {
  const size = large
    ? "py-4 text-base tracking-[0.22em] sm:py-6 sm:text-xl"
    : "py-2.5 text-xs tracking-[0.18em] sm:py-4 sm:text-base";
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 bg-cream/75 text-center font-medium uppercase text-cocoa backdrop-blur-[2px] ${size} ${className}`}
    >
      {label}
    </div>
  );
}
