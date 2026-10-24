export default function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-3xl border border-petal-200/70 bg-white/75 p-5 shadow-sm sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-2xl">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Skeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="h-24 animate-pulse rounded-3xl bg-petal-100/70" />
      <div className="h-64 animate-pulse rounded-3xl bg-petal-100/70" />
    </div>
  );
}