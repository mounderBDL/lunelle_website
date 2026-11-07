import { COLORS, Berry, Bloom, Jasmine, Leaf, Lavender, along, curve, type Pt } from "./parts";

type Spray = { stem: [Pt, Pt, Pt, Pt]; n: number; l: number; w: number; fill: string; stroke: string; from?: number };

// stems start at the ribbon (200, 372) and fan out
const SPRAYS: Spray[] = [
  { stem: [[200, 372], [150, 330], [96, 250], [86, 150]], n: 9, l: 34, w: 11, fill: COLORS.sage, stroke: COLORS.sageDark },
  { stem: [[200, 372], [250, 330], [304, 250], [316, 148]], n: 9, l: 34, w: 11, fill: "#a7b48f", stroke: COLORS.sageDark },
  { stem: [[200, 372], [172, 320], [140, 230], [150, 100]], n: 8, l: 30, w: 9, fill: COLORS.olive, stroke: COLORS.oliveDark },
  { stem: [[200, 372], [232, 320], [262, 230], [252, 94]], n: 8, l: 30, w: 9, fill: COLORS.sage, stroke: COLORS.sageDark },
];

function Spray({ s }: { s: Spray }) {
  const [a, b, c, d] = s.stem;
  return (
    <g>
      <path d={curve(a, b, c, d)} stroke={s.stroke} strokeWidth={2.2} fill="none" strokeLinecap="round" />
      {Array.from({ length: s.n }, (_, i) => {
        const t = 0.22 + (i / s.n) * 0.78;
        const p = along(a, b, c, d, t);
        const side = i % 2 ? 1 : -1;
        const k = 1 - t * 0.35;
        return (
          <g key={i} transform={`translate(${p.x} ${p.y}) rotate(${p.a + side * 50})`}>
            <Leaf l={s.l * k} w={s.w * k} fill={s.fill} stroke={s.stroke} />
          </g>
        );
      })}
    </g>
  );
}

/** A vintage bouquet in an oval frame: peony, ranunculus, rose, jasmine and lavender, tied with a ribbon. */
export default function StoryBouquet({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 400 480" className={className} fill="none">
      <defs>
        <radialGradient id="story-paper" cx="0.42" cy="0.35" r="0.85">
          <stop offset="0" stopColor="#fffaf0" />
          <stop offset="0.7" stopColor="#f8eddb" />
          <stop offset="1" stopColor="#efdcbc" />
        </radialGradient>
      </defs>

      {/* the oval plate */}
      <ellipse cx={200} cy={236} rx={172} ry={214} fill="url(#story-paper)" />
      <ellipse cx={200} cy={236} rx={172} ry={214} stroke={COLORS.gold} strokeWidth={1.4} />
      <ellipse cx={200} cy={236} rx={181} ry={223} stroke={COLORS.gold} strokeWidth={0.7} opacity={0.75} />
      {[[200, 13], [200, 459], [19, 236], [381, 236]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3.2} fill={COLORS.gold} />
      ))}

      {/* the bouquet sways a little */}
      <g className="story-sway">
        {SPRAYS.map((s, i) => (
          <Spray key={i} s={s} />
        ))}

        {/* lavender behind the flowers */}
        <Lavender x={176} y={338} r={-34} l={118} />
        <Lavender x={224} y={338} r={30} l={124} />
        <Lavender x={190} y={344} r={-12} l={96} />

        {/* mustard berries */}
        <path d="M232 150C246 128 262 110 272 92" stroke={COLORS.oliveDark} strokeWidth={1.4} />
        <Berry cx={274} cy={90} r={5} />
        <Berry cx={264} cy={104} r={4.4} />
        <Berry cx={254} cy={118} r={4} />
        <Berry cx={278} cy={104} r={4} />
        <path d="M168 150C154 130 140 112 128 96" stroke={COLORS.oliveDark} strokeWidth={1.4} />
        <Berry cx={126} cy={94} r={5} />
        <Berry cx={138} cy={106} r={4.4} />
        <Berry cx={148} cy={120} r={4} />
        <Berry cx={122} cy={108} r={4} />

        {/* leaves tucked under the big flowers */}
        <Leaf x={200} y={246} r={-146} l={62} w={19} fill={COLORS.sageDark} stroke="#3f5236" />
        <Leaf x={200} y={246} r={-34} l={62} w={19} fill={COLORS.sage} stroke={COLORS.sageDark} />
        <Leaf x={200} y={260} r={118} l={58} w={17} fill={COLORS.sage} stroke={COLORS.sageDark} />
        <Leaf x={200} y={260} r={62} l={58} w={17} fill={COLORS.sageDark} stroke="#3f5236" />

        {/* the flowers: smaller ones first, the big peony on top */}
        <Bloom cx={128} cy={266} r={42} c1="#f3e2b4" c2="#f7ecc8" c3={COLORS.mustard} stroke="#b79a58" />
        <Bloom cx={276} cy={262} r={44} c1={COLORS.peach} c2="#f6d4bd" c3="#d9946e" stroke={COLORS.peachDark} />
        <Bloom cx={200} cy={196} r={66} c1={COLORS.pink} c2={COLORS.blushPetal} c3="#c9667a" stroke={COLORS.pinkDark} />

        <Jasmine cx={152} cy={140} r={17} rot={8} />
        <Jasmine cx={248} cy={132} r={16} rot={-14} />
        <Jasmine cx={92} cy={306} r={14} rot={30} />
        <Jasmine cx={312} cy={312} r={15} rot={-20} />
        <Jasmine cx={200} cy={110} r={12} rot={4} />
      </g>

      {/* the ribbon */}
      <g stroke="#7e3344" strokeWidth={0.9} strokeLinejoin="round">
        <path d="M200 372C174 358 150 366 150 384C150 400 176 392 200 376Z" fill="#c56f81" />
        <path d="M200 372C226 358 250 366 250 384C250 400 224 392 200 376Z" fill="#c56f81" />
        <path d="M196 376C176 400 166 420 150 438L168 436L176 446C182 424 194 404 204 382Z" fill="#b25a6d" />
        <path d="M204 376C224 400 234 420 250 438L232 436L224 446C218 424 206 404 196 382Z" fill="#b25a6d" />
        <ellipse cx={200} cy={376} rx={11} ry={9} fill="#d98a9b" />
      </g>
    </svg>
  );
}
