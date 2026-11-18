type Props = { label: string; large?: boolean; className?: string };

/** A tilted "stamp" for the corner of a picture. The text comes from the caller, so it follows the language. */
export default function OutOfStockStamp({ label, large = false, className = "" }: Props) {
  const size = large
    ? "px-4 py-1.5 text-xs tracking-[0.2em] sm:text-sm"
    : "px-2.5 py-1 text-[10px] tracking-[0.16em] sm:px-3 sm:text-xs";
  return (
    <span
      className={`inline-block -rotate-6 rounded-md border-2 border-rose-dark/80 bg-cream/85 font-semibold uppercase text-rose-dark shadow-sm outline outline-1 outline-offset-2 outline-rose-dark/30 backdrop-blur-[2px] ${size} ${className}`}
    >
      {label}
    </span>
  );
}