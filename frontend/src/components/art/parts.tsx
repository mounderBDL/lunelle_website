/**
 * Small drawing helpers for the vintage plant illustrations. Everything is plain SVG:
 * no images to download, and each plant keeps its own natural colours.
 * No trigonometry is used where a component can end up in the browser, so server and browser draw the same thing.
 */

export const COLORS = {
  ink: "#5a4636",
  sage: "#98a883",
  sageDark: "#5f7350",
  olive: "#8c8c55",
  oliveDark: "#5b5a34",
  pink: "#e6a3b0",
  pinkDark: "#b4606f",
  blushPetal: "#f1c5cc",
  cream: "#fbf1dc",
  creamDark: "#cdb48a",
  mustard: "#d4a843",
  mustardDark: "#94701f",
  lavender: "#9d89c7",
  lavenderDark: "#6a5894",
  lemon: "#ead35f",
  lemonDark: "#b09526",
  rust: "#a4532f",
  brown: "#7d5c3d",
  brownDark: "#4d3623",
  peach: "#f0bf9f",
  peachDark: "#c47f5c",
  gold: "#c9a24f",
  paper: "#f8f0e0",
} as const;

const r2 = (n: number) => Math.round(n * 100) / 100;

type LeafProps = {
  x?: number;
  y?: number;
  r?: number;
  l?: number;
  w?: number;
  fill: string;
  stroke: string;
  veins?: boolean;
};

/** A pointed leaf, drawn from its base outward, with a shaded half and a midrib. */
export function Leaf({ x = 0, y = 0, r = 0, l = 30, w = 10, fill, stroke, veins = true }: LeafProps) {
  const body = `M0 0C${r2(l * 0.25)} ${-w} ${r2(l * 0.75)} ${r2(-w * 0.9)} ${l} 0C${r2(l * 0.75)} ${r2(w * 0.9)} ${r2(l * 0.25)} ${w} 0 0Z`;
  const shade = `M0 0C${r2(l * 0.3)} ${r2(w * 0.04)} ${r2(l * 0.7)} ${r2(w * 0.04)} ${l} 0C${r2(l * 0.75)} ${r2(w * 0.9)} ${r2(l * 0.25)} ${w} 0 0Z`;
  return (
    <g transform={`translate(${r2(x)} ${r2(y)}) rotate(${r2(r)})`}>
      <path d={body} fill={fill} stroke={stroke} strokeWidth={0.8} strokeLinejoin="round" />
      <path d={shade} fill="#000" opacity={0.09} />
      <path d={`M0 0C${r2(l * 0.3)} 0 ${r2(l * 0.7)} 0 ${r2(l * 0.95)} 0`} fill="none" stroke={stroke} strokeWidth={0.6} opacity={0.85} />
      {veins &&
        [0.3, 0.5, 0.7].map((k) => (
          <path
            key={k}
            d={`M${r2(l * k)} 0L${r2(l * (k + 0.13))} ${r2(-w * 0.62)}M${r2(l * k)} 0L${r2(l * (k + 0.13))} ${r2(w * 0.62)}`}
            fill="none"
            stroke={stroke}
            strokeWidth={0.45}
            opacity={0.55}
          />
        ))}
    </g>
  );
}

type BloomProps = { cx: number; cy: number; r: number; c1: string; c2: string; c3: string; stroke: string };

/** A rose or peony seen from above: rings of petals around a curled heart. */
export function Bloom({ cx, cy, r, c1, c2, c3, stroke }: BloomProps) {
  return (
    <g transform={`translate(${r2(cx)} ${r2(cy)})`} stroke={stroke} strokeWidth={0.7} strokeLinejoin="round">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <ellipse key={`a${i}`} cx={r2(r * 0.56)} rx={r2(r * 0.48)} ry={r2(r * 0.34)} transform={`rotate(${r2((i * 360) / 7)})`} fill={c1} />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <ellipse key={`b${i}`} cx={r2(r * 0.34)} rx={r2(r * 0.34)} ry={r2(r * 0.25)} transform={`rotate(${i * 72 + 20})`} fill={c2} />
      ))}
      {[0, 1, 2].map((i) => (
        <ellipse key={`c${i}`} cx={r2(r * 0.15)} rx={r2(r * 0.2)} ry={r2(r * 0.15)} transform={`rotate(${i * 120 + 50})`} fill={c3} />
      ))}
      <path d={`M${r2(-r * 0.1)} 0C${r2(-r * 0.1)} ${r2(-r * 0.14)} ${r2(r * 0.12)} ${r2(-r * 0.14)} ${r2(r * 0.12)} 0C${r2(r * 0.12)} ${r2(r * 0.1)} ${r2(-r * 0.02)} ${r2(r * 0.1)} ${r2(-r * 0.02)} 0`} fill="none" strokeWidth={0.6} />
    </g>
  );
}

/** A five-petal jasmine blossom. */
export function Jasmine({ cx, cy, r, rot = 0 }: { cx: number; cy: number; r: number; rot?: number }) {
  return (
    <g transform={`translate(${r2(cx)} ${r2(cy)}) rotate(${rot})`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i} transform={`rotate(${i * 72})`}>
          <Leaf l={r} w={r * 0.36} fill="#fffaf0" stroke="#bfae8c" veins={false} />
        </g>
      ))}
      <circle r={r2(r * 0.16)} fill={COLORS.mustard} stroke={COLORS.mustardDark} strokeWidth={0.5} />
    </g>
  );
}

/** A little round berry with a highlight. */
export function Berry({ cx, cy, r = 3, fill = COLORS.mustard, stroke = COLORS.mustardDark }: { cx: number; cy: number; r?: number; fill?: string; stroke?: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={0.6} />
      <circle cx={r2(cx - r * 0.3)} cy={r2(cy - r * 0.32)} r={r2(r * 0.28)} fill="#fff" opacity={0.55} />
    </g>
  );
}

/** A sprig of lavender: a thin stem with paired buds. Grows upward from (x, y). */
export function Lavender({ x, y, r = 0, l = 40 }: { x: number; y: number; r?: number; l?: number }) {
  const rows = Math.floor(l / 4.2);
  return (
    <g transform={`translate(${r2(x)} ${r2(y)}) rotate(${r})`}>
      <path d={`M0 0C1 ${-l * 0.3} -1 ${-l * 0.6} 0 ${-l}`} fill="none" stroke={COLORS.sageDark} strokeWidth={1} strokeLinecap="round" />
      {Array.from({ length: rows }, (_, i) => {
        const yy = -l * 0.35 - (i * l * 0.65) / rows;
        const s = 1 - (i / rows) * 0.45;
        return (
          <g key={i}>
            <ellipse cx={r2(-2.4 * s)} cy={r2(yy)} rx={r2(2.1 * s)} ry={r2(3.2 * s)} transform={`rotate(-24 ${r2(-2.4 * s)} ${r2(yy)})`} fill={COLORS.lavender} stroke={COLORS.lavenderDark} strokeWidth={0.5} />
            <ellipse cx={r2(2.4 * s)} cy={r2(yy - 1.6)} rx={r2(2.1 * s)} ry={r2(3.2 * s)} transform={`rotate(24 ${r2(2.4 * s)} ${r2(yy - 1.6)})`} fill={COLORS.lavender} stroke={COLORS.lavenderDark} strokeWidth={0.5} />
          </g>
        );
      })}
      <ellipse cx={0} cy={-l - 2} rx={1.8} ry={3.2} fill={COLORS.lavender} stroke={COLORS.lavenderDark} strokeWidth={0.5} />
    </g>
  );
}

export type Pt = [number, number];

/** A point on a cubic curve, with the direction the curve is heading there (in degrees). */
export function along(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number) {
  const u = 1 - t;
  const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
  const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
  const dx = 3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
  const dy = 3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
  return { x: r2(x), y: r2(y), a: r2((Math.atan2(dy, dx) * 180) / Math.PI) };
}

export const curve = (p0: Pt, p1: Pt, p2: Pt, p3: Pt) => `M${p0[0]} ${p0[1]}C${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]} ${p3[0]} ${p3[1]}`;
