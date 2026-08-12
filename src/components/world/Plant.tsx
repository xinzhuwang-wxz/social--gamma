"use client";

export type PlantStage = "seed" | "sprout" | "leafing" | "growing" | "bud" | "bloom";
export type PlantFamily = 0 | 1 | 2 | 3;

export interface PlantProps {
  stage?: PlantStage;
  family?: PlantFamily;
  size?: number;
}

/* ── Shared soil mound ── */
function SoilMound({ opacity = 0.5 }: { opacity?: number }) {
  return <ellipse cx="40" cy="112" rx="22" ry="6" fill="#A9753D" opacity={opacity} />;
}

/* ── Stem helper ── */
function Stem({
  x1 = 40,
  y1 = 112,
  x2 = 40,
  y2 = 60,
  width = 3,
  color = "#89974B",
}: {
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  width?: number;
  color?: string;
}) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
    />
  );
}

/* ── Leaf helper (ellipse, rotated) ── */
function Leaf({
  cx,
  cy,
  rx,
  ry,
  rotate,
  fill = "#7BA050",
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotate: number;
  fill?: string;
}) {
  return (
    <ellipse
      cx={cx}
      cy={cy}
      rx={rx}
      ry={ry}
      fill={fill}
      transform={`rotate(${rotate} ${cx} ${cy})`}
    />
  );
}

/* ══════════════════════════════════════════════
   STAGE: seed  (shared across all families)
══════════════════════════════════════════════ */
function SeedStage() {
  return (
    <>
      <SoilMound opacity={0.7} />
      <ellipse cx="40" cy="106" rx="8" ry="6" fill="#A9753D" />
      <ellipse cx="38" cy="105" rx="2.5" ry="1.8" fill="rgba(255,255,255,0.22)" />
    </>
  );
}

/* ══════════════════════════════════════════════
   STAGE: sprout
══════════════════════════════════════════════ */
function SproutStage({ family }: { family: PlantFamily }) {
  if (family === 3) {
    // Lavender: two narrow upright leaves
    return (
      <>
        <SoilMound opacity={0.45} />
        <Stem y2={82} width={2} color="#7A8850" />
        <Leaf cx={34} cy={90} rx={5} ry={10} rotate={-10} fill="#8A7FB0" />
        <Leaf cx={46} cy={90} rx={5} ry={10} rotate={10} fill="#9C8ABF" />
      </>
    );
  }

  const leafFill = (["#7BA050", "#6A8A40", "#5E8030"] as const)[family];
  return (
    <>
      <SoilMound opacity={0.45} />
      <Stem y2={80} width={2.5} />
      {family === 0 && (
        <>
          <Leaf cx={32} cy={86} rx={9} ry={5} rotate={-30} fill={leafFill} />
          <Leaf cx={48} cy={86} rx={9} ry={5} rotate={30} fill={leafFill} />
        </>
      )}
      {family === 1 && (
        <>
          <Leaf cx={33} cy={88} rx={7} ry={4} rotate={-25} fill={leafFill} />
          <Leaf cx={47} cy={88} rx={7} ry={4} rotate={25} fill={leafFill} />
        </>
      )}
      {family === 2 && (
        <>
          <Leaf cx={31} cy={85} rx={10} ry={5.5} rotate={-35} fill={leafFill} />
          <Leaf cx={49} cy={85} rx={10} ry={5.5} rotate={35} fill={leafFill} />
        </>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════
   STAGE: leafing
══════════════════════════════════════════════ */
function LeafingStage({ family }: { family: PlantFamily }) {
  if (family === 3) {
    // Lavender: narrow upright gray-green leaves
    return (
      <>
        <SoilMound opacity={0.4} />
        <Stem y2={60} width={2.5} color="#7A8850" />
        <Leaf cx={30} cy={85} rx={6} ry={18} rotate={-12} fill="#7A8848" />
        <Leaf cx={50} cy={85} rx={6} ry={18} rotate={12} fill="#8A9858" />
        <Leaf cx={34} cy={68} rx={4} ry={12} rotate={-8} fill="#8A9858" />
        <Leaf cx={46} cy={68} rx={4} ry={12} rotate={8} fill="#7A8848" />
      </>
    );
  }

  const darkLeaf = (["#5A7835", "#4E7030", "#486820"] as const)[family];
  const lightLeaf = (["#7BA050", "#6A8A40", "#5E8030"] as const)[family];

  if (family === 0) {
    return (
      <>
        <SoilMound opacity={0.4} />
        <Stem y2={62} width={3} />
        <Leaf cx={27} cy={93} rx={13} ry={6} rotate={-42} fill={darkLeaf} />
        <Leaf cx={53} cy={93} rx={13} ry={6} rotate={42} fill={lightLeaf} />
        <Leaf cx={29} cy={74} rx={11} ry={5.5} rotate={-38} fill={lightLeaf} />
        <Leaf cx={51} cy={74} rx={11} ry={5.5} rotate={38} fill={darkLeaf} />
      </>
    );
  }
  if (family === 1) {
    return (
      <>
        <SoilMound opacity={0.4} />
        <Stem y2={60} width={3} />
        <Leaf cx={29} cy={88} rx={8} ry={18} rotate={-15} fill={darkLeaf} />
        <Leaf cx={51} cy={88} rx={8} ry={18} rotate={15} fill={lightLeaf} />
      </>
    );
  }
  return (
    <>
      <SoilMound opacity={0.4} />
      <Stem y2={58} width={3.5} />
      <Leaf cx={24} cy={90} rx={16} ry={8} rotate={-48} fill={darkLeaf} />
      <Leaf cx={56} cy={90} rx={16} ry={8} rotate={48} fill={lightLeaf} />
      <Leaf cx={27} cy={72} rx={13} ry={6} rotate={-42} fill={lightLeaf} />
      <Leaf cx={53} cy={72} rx={13} ry={6} rotate={42} fill={darkLeaf} />
    </>
  );
}

/* ══════════════════════════════════════════════
   STAGE: growing
══════════════════════════════════════════════ */
function GrowingStage({ family }: { family: PlantFamily }) {
  if (family === 3) {
    // Lavender: taller with more narrow leaves, buds starting to form
    return (
      <>
        <SoilMound opacity={0.4} />
        <Stem y2={40} width={2.5} color="#7A8850" />
        {/* Branching side stems */}
        <line x1="40" y1="80" x2="30" y2="68" stroke="#7A8850" strokeWidth={2} strokeLinecap="round" />
        <line x1="40" y1="72" x2="50" y2="60" stroke="#7A8850" strokeWidth={2} strokeLinecap="round" />
        <Leaf cx={26} cy={92} rx={5} ry={18} rotate={-10} fill="#7A8848" />
        <Leaf cx={54} cy={92} rx={5} ry={18} rotate={10} fill="#8A9858" />
        <Leaf cx={30} cy={72} rx={4} ry={14} rotate={-8} fill="#8A9858" />
        <Leaf cx={50} cy={72} rx={4} ry={14} rotate={8} fill="#7A8848" />
        {/* Tiny purple buds at branch tips */}
        <ellipse cx="29" cy="65" rx="3" ry="5" fill="#9C8ABF" opacity={0.7} />
        <ellipse cx="51" cy="58" rx="3" ry="5" fill="#9C8ABF" opacity={0.7} />
      </>
    );
  }

  const dark = (["#5A7835", "#4E7030", "#486820"] as const)[family];
  const light = (["#7BA050", "#6A8A40", "#5E8030"] as const)[family];

  if (family === 0) {
    return (
      <>
        <SoilMound opacity={0.4} />
        <Stem y2={44} width={3} />
        <Leaf cx={24} cy={98} rx={15} ry={7} rotate={-46} fill={dark} />
        <Leaf cx={56} cy={98} rx={15} ry={7} rotate={46} fill={light} />
        <Leaf cx={26} cy={80} rx={13} ry={6} rotate={-40} fill={light} />
        <Leaf cx={54} cy={80} rx={13} ry={6} rotate={40} fill={dark} />
        <Leaf cx={29} cy={62} rx={10} ry={5} rotate={-35} fill={light} />
        <Leaf cx={51} cy={62} rx={10} ry={5} rotate={35} fill={dark} />
      </>
    );
  }
  if (family === 1) {
    return (
      <>
        <SoilMound opacity={0.4} />
        <Stem y2={42} width={3} />
        <Leaf cx={27} cy={86} rx={9} ry={24} rotate={-12} fill={dark} />
        <Leaf cx={53} cy={86} rx={9} ry={24} rotate={12} fill={light} />
        <Leaf cx={30} cy={60} rx={6} ry={14} rotate={-8} fill={light} />
        <Leaf cx={50} cy={60} rx={6} ry={14} rotate={8} fill={dark} />
      </>
    );
  }
  return (
    <>
      <SoilMound opacity={0.4} />
      <Stem y2={40} width={4} />
      <Leaf cx={20} cy={95} rx={19} ry={9} rotate={-50} fill={dark} />
      <Leaf cx={60} cy={95} rx={19} ry={9} rotate={50} fill={light} />
      <Leaf cx={22} cy={76} rx={16} ry={7.5} rotate={-44} fill={light} />
      <Leaf cx={58} cy={76} rx={16} ry={7.5} rotate={44} fill={dark} />
      <Leaf cx={26} cy={58} rx={12} ry={6} rotate={-38} fill={dark} />
      <Leaf cx={54} cy={58} rx={12} ry={6} rotate={38} fill={light} />
    </>
  );
}

/* ══════════════════════════════════════════════
   STAGE: bud
══════════════════════════════════════════════ */
function BudStage({ family }: { family: PlantFamily }) {
  if (family === 3) {
    // Lavender bud: spike with closed purple buds
    return (
      <>
        <SoilMound opacity={0.4} />
        <Stem y2={38} width={2.5} color="#7A8850" />
        <Leaf cx={26} cy={90} rx={5} ry={18} rotate={-10} fill="#7A8848" />
        <Leaf cx={54} cy={90} rx={5} ry={18} rotate={10} fill="#8A9858" />
        {/* Central spike with closed buds */}
        <ellipse cx="40" cy="54" rx="4" ry="18" fill="#7A6898" />
        <ellipse cx="40" cy="40" rx="4.5" ry="7" fill="#9C8ABF" />
        <ellipse cx="36" cy="50" rx="3.5" ry="5.5" fill="#9C8ABF" />
        <ellipse cx="44" cy="48" rx="3.5" ry="5.5" fill="#8A78A8" />
        <ellipse cx="37" cy="60" rx="3" ry="4.5" fill="#9C8ABF" opacity={0.8} />
        <ellipse cx="43" cy="57" rx="3" ry="4.5" fill="#8A78A8" opacity={0.8} />
      </>
    );
  }

  const dark = (["#5A7835", "#4E7030", "#486820"] as const)[family];
  const light = (["#7BA050", "#6A8A40", "#5E8030"] as const)[family];

  const budShape =
    family === 0 ? (
      <>
        <ellipse cx="40" cy="30" rx="8" ry="11" fill={dark} />
        <ellipse cx="40" cy="28" rx="5.5" ry="8" fill="#DCE3AE" />
      </>
    ) : family === 1 ? (
      <>
        <ellipse cx="40" cy="28" rx="7" ry="13" fill="#C87060" />
        <path d="M 33 32 Q 40 14 47 32" fill="#B86050" />
        <ellipse cx="40" cy="27" rx="3" ry="6" fill="#E89080" />
      </>
    ) : (
      <>
        <ellipse cx="40" cy="26" rx="11" ry="12" fill={dark} />
        <ellipse cx="40" cy="24" rx="7" ry="8" fill="#7BA050" />
        <ellipse cx="40" cy="22" rx="4" ry="5" fill="#DBA940" opacity="0.7" />
      </>
    );

  return (
    <>
      <SoilMound opacity={0.4} />
      <Stem y2={40} width={3} />
      <Leaf cx={24} cy={90} rx={15} ry={7} rotate={-46} fill={dark} />
      <Leaf cx={56} cy={90} rx={15} ry={7} rotate={46} fill={light} />
      <Leaf cx={27} cy={68} rx={11} ry={5.5} rotate={-40} fill={light} />
      <Leaf cx={53} cy={68} rx={11} ry={5.5} rotate={40} fill={dark} />
      <ellipse cx="40" cy="40" rx="6" ry="5" fill={dark} />
      {budShape}
    </>
  );
}

/* ══════════════════════════════════════════════
   STAGE: bloom
══════════════════════════════════════════════ */
function BloomStage({ family }: { family: PlantFamily }) {
  if (family === 3) {
    // Lavender bloom: tall spike with open purple flower clusters
    // Reaches high in viewBox for height differentiation
    const flowerPositions = [
      { cx: 40, cy: 18, rx: 4, ry: 4 },
      { cx: 34, cy: 26, rx: 3.5, ry: 4 },
      { cx: 46, cy: 24, rx: 3.5, ry: 4 },
      { cx: 36, cy: 34, rx: 4, ry: 4.5 },
      { cx: 44, cy: 32, rx: 4, ry: 4.5 },
      { cx: 38, cy: 42, rx: 3.5, ry: 4 },
      { cx: 44, cy: 42, rx: 3, ry: 3.5 },
      { cx: 40, cy: 50, rx: 3, ry: 3.5 },
    ];
    return (
      <>
        <SoilMound opacity={0.4} />
        <Stem y2={34} width={2.5} color="#7A8850" />
        {/* Leaves */}
        <Leaf cx={24} cy={90} rx={5} ry={20} rotate={-10} fill="#7A8848" />
        <Leaf cx={56} cy={90} rx={5} ry={20} rotate={10} fill="#8A9858" />
        <Leaf cx={28} cy={70} rx={4} ry={14} rotate={-8} fill="#8A9858" />
        <Leaf cx={52} cy={70} rx={4} ry={14} rotate={8} fill="#7A8848" />
        {/* Spike stem */}
        <line x1="40" y1="90" x2="40" y2="16" stroke="#7A8850" strokeWidth={2} strokeLinecap="round" />
        {/* Flower clusters along spike */}
        {flowerPositions.map((pos, i) => (
          <g key={i}>
            <ellipse
              cx={pos.cx}
              cy={pos.cy}
              rx={pos.rx}
              ry={pos.ry}
              fill={i % 2 === 0 ? "#9C8ABF" : "#7A6898"}
            />
            <ellipse
              cx={pos.cx - 0.5}
              cy={pos.cy - 1}
              rx={pos.rx * 0.5}
              ry={pos.ry * 0.4}
              fill="#C4B8E0"
              opacity={0.5}
            />
          </g>
        ))}
        {/* Top bud tip */}
        <ellipse cx="40" cy="13" rx="3" ry="5" fill="#B8AAD5" />
      </>
    );
  }

  const dark = (["#5A7835", "#4E7030", "#486820"] as const)[family];
  const light = (["#7BA050", "#6A8A40", "#5E8030"] as const)[family];

  if (family === 0) {
    const petalAngles = [0, 45, 90, 135, 180, 225, 270, 315];
    const petalColors = ["#E8A87C", "#D49060"];
    return (
      <>
        <SoilMound opacity={0.4} />
        <Stem y2={38} width={3} />
        <Leaf cx={24} cy={90} rx={15} ry={7} rotate={-46} fill={dark} />
        <Leaf cx={56} cy={90} rx={15} ry={7} rotate={46} fill={light} />
        <Leaf cx={27} cy={68} rx={11} ry={5.5} rotate={-40} fill={light} />
        <Leaf cx={53} cy={68} rx={11} ry={5.5} rotate={40} fill={dark} />
        {petalAngles.map((angle, i) => (
          <ellipse
            key={angle}
            cx="40"
            cy="18"
            rx="5.5"
            ry="10"
            fill={petalColors[i % 2]}
            transform={`rotate(${angle} 40 30)`}
          />
        ))}
        <circle cx="40" cy="30" r="8" fill="#DBA940" />
        <circle cx="40" cy="30" r="5" fill="#C08020" />
        <circle cx="37.5" cy="27.5" r="2" fill="rgba(255,255,255,0.28)" />
      </>
    );
  }

  if (family === 1) {
    return (
      <>
        <SoilMound opacity={0.4} />
        <Stem y2={38} width={3} />
        <Leaf cx={26} cy={88} rx={9} ry={26} rotate={-12} fill={dark} />
        <Leaf cx={54} cy={88} rx={9} ry={26} rotate={12} fill={light} />
        <path d="M 32 50 Q 26 30 40 22 Q 54 30 48 50 Z" fill="#C87060" />
        <path d="M 36 48 Q 30 28 40 20 Q 50 28 44 48 Z" fill="#D88070" />
        <path d="M 34 52 Q 22 38 28 24 Q 38 26 40 44 Z" fill="#B86050" />
        <path d="M 46 52 Q 58 38 52 24 Q 42 26 40 44 Z" fill="#B86050" />
        <path d="M 36 50 Q 34 34 40 26 Q 46 34 44 50 Z" fill="#E89080" />
        <ellipse cx="40" cy="36" rx="3" ry="5" fill="rgba(255,255,255,0.20)" />
      </>
    );
  }

  // Sunflower
  const rayAngles = Array.from({ length: 14 }, (_, i) => (i * 360) / 14);
  return (
    <>
      <SoilMound opacity={0.4} />
      <Stem y2={36} width={4.5} />
      <Leaf cx={20} cy={92} rx={18} ry={8} rotate={-48} fill={dark} />
      <Leaf cx={60} cy={92} rx={18} ry={8} rotate={48} fill={light} />
      <Leaf cx={23} cy={72} rx={15} ry={7} rotate={-42} fill={light} />
      <Leaf cx={57} cy={72} rx={15} ry={7} rotate={42} fill={dark} />
      {rayAngles.map((angle) => (
        <ellipse
          key={angle}
          cx="40"
          cy="16"
          rx="4.5"
          ry="11"
          fill="#D4A030"
          transform={`rotate(${angle} 40 30)`}
        />
      ))}
      <circle cx="40" cy="30" r="13" fill="#865F32" />
      <circle cx="40" cy="30" r="9" fill="#9A6E38" />
      <circle cx="36" cy="27" r="1.5" fill="#6A4820" />
      <circle cx="40" cy="26" r="1.5" fill="#6A4820" />
      <circle cx="44" cy="27" r="1.5" fill="#6A4820" />
      <circle cx="38" cy="31" r="1.5" fill="#6A4820" />
      <circle cx="42" cy="31" r="1.5" fill="#6A4820" />
      <circle cx="36" cy="26" r="3" fill="rgba(255,255,255,0.15)" />
    </>
  );
}

/* ══════════════════════════════════════════════
   Main Plant component
══════════════════════════════════════════════ */
export function Plant({ stage = "seed", family = 0, size = 80 }: PlantProps) {
  const vw = 80;
  const vh = 120;

  const stageMap: Record<PlantStage, React.ReactNode> = {
    seed: <SeedStage />,
    sprout: <SproutStage family={family} />,
    leafing: <LeafingStage family={family} />,
    growing: <GrowingStage family={family} />,
    bud: <BudStage family={family} />,
    bloom: <BloomStage family={family} />,
  };

  return (
    <svg
      width={size}
      height={(size * vh) / vw}
      viewBox={`0 0 ${vw} ${vh}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={`植物 — ${stage} 阶段 科 ${family}`}
    >
      {stageMap[stage]}
    </svg>
  );
}
