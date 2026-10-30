import { parseScentNotes } from "@/lib/scent";
import ScentPyramid from "./ScentPyramid";

/**
 * "Top: …", "Middle: …", "Base: …" (or Tête, Cœur, Fond) become the interactive pyramid.
 * Notes written in any other way are shown as a plain list, as before.
 */
export default function ScentNotes({ text }: { text: string }) {
  const parsed = parseScentNotes(text);
  if (parsed) {
    return <ScentPyramid levels={parsed.levels} other={parsed.other} />;
  }

  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const i = line.indexOf(":");
      return i > 0 && i <= 24
        ? { label: line.slice(0, i).trim(), value: line.slice(i + 1).trim() }
        : { label: "", value: line };
    });

  return (
    <dl className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex flex-wrap gap-x-4">
          {row.label && <dt className="w-28 text-xs uppercase tracking-wider text-rose-dark">{row.label}</dt>}
          <dd className="text-sm text-cocoa/80">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}