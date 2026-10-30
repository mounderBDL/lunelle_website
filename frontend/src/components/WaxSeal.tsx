const RADII = [47, 44.5, 48.5, 45.5, 49, 44, 47.5, 46, 49.5, 44.8, 48, 45.2, 49.2, 44.4, 47.8, 46.2];

const f = (n: number) => n.toFixed(2);

/** A slightly uneven, smooth blob: wax is never a perfect circle. */
function blobPath(radii: number[]) {
  const n = radii.length;
  const points = radii.map((r, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    return [50 + r * Math.cos(angle), 50 + r * Math.sin(angle)] as const;
  });
  const mid = (a: readonly [number, number], b: readonly [number, number]) =>
    [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as const;

  const start = mid(points[n - 1], points[0]);
  let d = `M ${f(start[0])} ${f(start[1])}`;
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const m = mid(p, points[(i + 1) % n]);
    d += ` Q ${f(p[0])} ${f(p[1])} ${f(m[0])} ${f(m[1])}`;
  }
  return `${d} Z`;
}

const BLOB = blobPath(RADII);

/** The wax seal with the crescent moon. It drops, stamps and settles (see .wax-* in globals.css). */
export default function WaxSeal({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`wax-seal relative ${className}`}>
      <span className="wax-shadow absolute inset-x-[12%] bottom-[-5%] h-[16%] rounded-full bg-cocoa/35 blur-md" />
      <span className="wax-ripple absolute inset-0 rounded-full border-2 border-petal-400" />

      <svg viewBox="0 0 100 100" className="wax-body relative h-full w-full drop-shadow-lg">
        <defs>
          <radialGradient id="wax-body-fill" cx="36%" cy="28%" r="85%">
            <stop offset="0" stopColor="#dc8f9b" />
            <stop offset="0.5" stopColor="#b95a70" />
            <stop offset="1" stopColor="#7e3548" />
          </radialGradient>
          <mask id="wax-moon-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
            <rect width="100" height="100" fill="white" />
            <circle cx="58" cy="44" r="19" fill="black" />
          </mask>
        </defs>

        <path d={BLOB} fill="url(#wax-body-fill)" />
        <path d={BLOB} fill="none" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="1.2" transform="translate(-0.7 -0.7)" />

        {/* the raised ring */}
        <circle cx="50" cy="50" r="33" fill="none" stroke="#6f2c3e" strokeOpacity="0.5" strokeWidth="1.6" />
        <circle cx="50" cy="50" r="34.4" fill="none" stroke="#f0b4be" strokeOpacity="0.45" strokeWidth="1" />

        {/* the crescent: a darker copy underneath, a lighter one on top, to look pressed into the wax */}
        <g transform="translate(1.3 1.7)">
          <circle cx="50" cy="52" r="19" fill="#6a2a3b" fillOpacity="0.6" mask="url(#wax-moon-cut)" />
        </g>
        <circle cx="50" cy="52" r="19" fill="#f6cdd3" mask="url(#wax-moon-cut)" />

        <circle cx="69" cy="33" r="1.5" fill="#f6cdd3" />
        <circle cx="73.5" cy="44" r="1" fill="#f6cdd3" fillOpacity="0.8" />
        <circle cx="64" cy="26" r="1" fill="#f6cdd3" fillOpacity="0.8" />

        {/* the shine */}
        <ellipse cx="33" cy="26" rx="13" ry="6.5" fill="#ffffff" fillOpacity="0.2" transform="rotate(-32 33 26)" />
      </svg>
    </div>
  );
}