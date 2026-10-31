/** The products or packs of a page: centered rows, two per row on phones and tablets (see .card-grid in globals.css). */
export default function CardGrid({
  kind,
  className = "",
  children,
}: {
  kind: "products" | "packs";
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`card-grid card-grid-${kind} ${className}`}>{children}</div>;
}