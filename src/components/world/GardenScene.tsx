"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

export interface GardenSceneProps {
  children?: ReactNode;
  height?: number;
}

const VW = 375;
const VH = 300;
const GRASS_Y = 142;

/* ── Smoke puff (animated upward drift) ── */
function SmokePuff({
  cx,
  cy,
  rx,
  ry,
  delay,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  delay: number;
}) {
  return (
    <motion.g
      animate={{ y: [0, -6, -14], opacity: [0, 0.58, 0], scale: [0.7, 1.1, 1.5] }}
      transition={{
        duration: 3.8,
        delay,
        repeat: Infinity,
        ease: "easeOut",
        times: [0, 0.42, 1],
      }}
      style={{ transformOrigin: `${cx}px ${cy}px` }}
    >
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="rgba(251,244,227,0.9)" />
    </motion.g>
  );
}

/* ── Round crown tree ── */
function TreeRound({
  x,
  y,
  s = 1,
  phase = 0,
}: {
  x: number;
  y: number;
  s?: number;
  phase?: number;
}) {
  const dir = phase % 2 === 0 ? 1 : -1;
  return (
    <motion.g
      animate={{ rotate: [0, dir, 0, -dir, 0] }}
      transition={{ duration: 8 + phase, repeat: Infinity, ease: "easeInOut" }}
      style={{ transformOrigin: `${x}px ${y + 30 * s}px` }}
    >
      <ellipse
        cx={x + 2}
        cy={y + 32 * s}
        rx={16 * s}
        ry={3.5 * s}
        fill="rgba(74,62,32,0.06)"
      />
      <rect
        x={x - 3 * s}
        y={y + 14 * s}
        width={6 * s}
        height={18 * s}
        rx={2}
        fill="#B98C50"
      />
      <ellipse cx={x} cy={y} rx={22 * s} ry={26 * s} fill="#5A7835" />
      <ellipse cx={x + 7 * s} cy={y - 3 * s} rx={15 * s} ry={20 * s} fill="#7BA050" />
      <ellipse
        cx={x - 5 * s}
        cy={y + 5 * s}
        rx={12 * s}
        ry={16 * s}
        fill="#6A8840"
        opacity={0.85}
      />
      <ellipse
        cx={x + 4 * s}
        cy={y - 9 * s}
        rx={5 * s}
        ry={6 * s}
        fill="#8AB060"
        opacity={0.5}
      />
    </motion.g>
  );
}

/* ── Double crown tree ── */
function TreeDouble({
  x,
  y,
  s = 1,
  phase = 0,
}: {
  x: number;
  y: number;
  s?: number;
  phase?: number;
}) {
  const dir = phase % 2 === 0 ? -0.8 : 0.8;
  return (
    <motion.g
      animate={{ rotate: [0, dir, 0, -dir, 0] }}
      transition={{ duration: 9 + phase * 0.5, repeat: Infinity, ease: "easeInOut" }}
      style={{ transformOrigin: `${x}px ${y + 36 * s}px` }}
    >
      <ellipse
        cx={x}
        cy={y + 38 * s}
        rx={12 * s}
        ry={3 * s}
        fill="rgba(74,62,32,0.06)"
      />
      <rect
        x={x - 3 * s}
        y={y + 20 * s}
        width={6 * s}
        height={20 * s}
        rx={2}
        fill="#B98C50"
      />
      <ellipse cx={x - 11 * s} cy={y + 4 * s} rx={18 * s} ry={22 * s} fill="#4E7030" />
      <ellipse cx={x + 11 * s} cy={y + 4 * s} rx={16 * s} ry={20 * s} fill="#4E7030" />
      <ellipse cx={x - 11 * s} cy={y + 4 * s} rx={12 * s} ry={14 * s} fill="#7BA050" />
      <ellipse cx={x + 11 * s} cy={y + 4 * s} rx={10 * s} ry={13 * s} fill="#89974B" />
    </motion.g>
  );
}

/* ── Conical / pointed crown tree ── */
function TreeConical({
  x,
  y,
  s = 1,
  phase = 0,
}: {
  x: number;
  y: number;
  s?: number;
  phase?: number;
}) {
  return (
    <motion.g
      animate={{ rotate: [0, 0.7, 0, -0.7, 0] }}
      transition={{ duration: 10 + phase * 0.7, repeat: Infinity, ease: "easeInOut" }}
      style={{ transformOrigin: `${x}px ${y + 36 * s}px` }}
    >
      <ellipse
        cx={x}
        cy={y + 38 * s}
        rx={9 * s}
        ry={3 * s}
        fill="rgba(74,62,32,0.06)"
      />
      <rect
        x={x - 3 * s}
        y={y + 26 * s}
        width={5 * s}
        height={14 * s}
        rx={2}
        fill="#B98C50"
      />
      <path
        d={`M ${x} ${y - 18 * s} L ${x - 16 * s} ${y + 28 * s} L ${x + 16 * s} ${y + 28 * s} Z`}
        fill="#4E7030"
      />
      <path
        d={`M ${x} ${y - 10 * s} L ${x - 13 * s} ${y + 18 * s} L ${x + 13 * s} ${y + 18 * s} Z`}
        fill="#5E8035"
      />
      <path
        d={`M ${x} ${y - 4 * s} L ${x - 9 * s} ${y + 10 * s} L ${x + 9 * s} ${y + 10 * s} Z`}
        fill="#6A8840"
      />
    </motion.g>
  );
}

/* ── Refined house (left rear, green-tile roof, cream walls, picket fence) ── */
function RefinedHouse({ x, y }: { x: number; y: number }) {
  const wallW = 84;
  const wallH = 68;
  const cx = x + wallW / 2; // 50 when x=8
  const roofH = 44;
  const peakY = y - roofH; // roof peak
  const chimneyX = cx + 14;
  const chimneyTopY = peakY - 10;

  return (
    <g>
      {/* Ground shadow */}
      <ellipse
        cx={cx}
        cy={y + wallH + 8}
        rx={50}
        ry={6}
        fill="rgba(74,62,32,0.07)"
      />

      {/* Chimney body — rendered before roof so roof overlaps its base */}
      <rect
        x={chimneyX}
        y={chimneyTopY}
        width={13}
        height={36}
        rx={2}
        fill="#9A7040"
      />
      {/* Chimney cap */}
      <rect
        x={chimneyX - 2}
        y={chimneyTopY - 5}
        width={17}
        height={6}
        rx={2}
        fill="#7A5828"
      />

      {/* Roof — two-slope: main gable front + lighter back-slope suggestion */}
      {/* Back slope (lighter, offset) */}
      <path
        d={`M ${cx} ${peakY} L ${x + wallW + 14} ${y} L ${x + wallW + 6} ${y} Z`}
        fill="#8AB455"
        opacity={0.55}
      />
      {/* Main gable front */}
      <path
        d={`M ${x - 8} ${y} L ${cx} ${peakY} L ${x + wallW + 8} ${y} Z`}
        fill="#6A9040"
      />
      {/* Roof highlight (lighter band near ridge) */}
      <path
        d={`M ${cx - 12} ${peakY + 14} L ${cx} ${peakY} L ${cx + 12} ${peakY + 14} Z`}
        fill="#8AB455"
        opacity={0.65}
      />
      {/* Ridge cap */}
      <rect x={cx - 4} y={peakY - 3} width={8} height={6} rx={2} fill="#527030" />

      {/* Wall (cream/white) */}
      <rect x={x} y={y} width={wallW} height={wallH} rx={3} fill="#F2EDD8" />

      {/* Roof shadow on wall top */}
      <rect x={x} y={y} width={wallW} height={7} rx={3} fill="rgba(74,62,32,0.05)" />

      {/* Window left — 2×2 grid */}
      <rect x={x + 7} y={y + 9} width={22} height={18} rx={3} fill="#A8D4E8" />
      <line
        x1={x + 18}
        y1={y + 9}
        x2={x + 18}
        y2={y + 27}
        stroke="#C8D4D8"
        strokeWidth={1.5}
      />
      <line
        x1={x + 7}
        y1={y + 18}
        x2={x + 29}
        y2={y + 18}
        stroke="#C8D4D8"
        strokeWidth={1.5}
      />
      <rect
        x={x + 6}
        y={y + 8}
        width={24}
        height={20}
        rx={4}
        fill="none"
        stroke="#C0A878"
        strokeWidth={1.5}
      />

      {/* Window right — 2×2 grid */}
      <rect x={x + wallW - 29} y={y + 9} width={22} height={18} rx={3} fill="#A8D4E8" />
      <line
        x1={x + wallW - 18}
        y1={y + 9}
        x2={x + wallW - 18}
        y2={y + 27}
        stroke="#C8D4D8"
        strokeWidth={1.5}
      />
      <line
        x1={x + wallW - 29}
        y1={y + 18}
        x2={x + wallW - 7}
        y2={y + 18}
        stroke="#C8D4D8"
        strokeWidth={1.5}
      />
      <rect
        x={x + wallW - 30}
        y={y + 8}
        width={24}
        height={20}
        rx={4}
        fill="none"
        stroke="#C0A878"
        strokeWidth={1.5}
      />

      {/* Door (wooden, arched) */}
      <rect
        x={cx - 14}
        y={y + wallH - 38}
        width={28}
        height={40}
        rx={4}
        fill="#865F32"
      />
      {/* Door arch */}
      <path
        d={`M ${cx - 14} ${y + wallH - 38} Q ${cx} ${y + wallH - 54} ${cx + 14} ${y + wallH - 38}`}
        fill="#9A7040"
      />
      {/* Door panel detail */}
      <rect
        x={cx - 10}
        y={y + wallH - 34}
        width={9}
        height={14}
        rx={2}
        fill="rgba(74,62,32,0.12)"
      />
      <rect
        x={cx + 1}
        y={y + wallH - 34}
        width={9}
        height={14}
        rx={2}
        fill="rgba(74,62,32,0.12)"
      />
      {/* Door knob */}
      <circle cx={cx + 9} cy={y + wallH - 18} r={2.5} fill="#D7B67A" />
      {/* Door frame */}
      <rect
        x={cx - 15}
        y={y + wallH - 39}
        width={30}
        height={41}
        rx={5}
        fill="none"
        stroke="#9A7040"
        strokeWidth={1.5}
      />

      {/* Picket fence (front) */}
      {[-6, 3, 12, 21, 62, 71, 80, 89].map((fx) => (
        <rect
          key={fx}
          x={x + fx}
          y={y + wallH + 1}
          width={5}
          height={14}
          rx={2.5}
          fill="#D7B67A"
        />
      ))}
      {/* Fence rail */}
      <rect
        x={x - 8}
        y={y + wallH + 7}
        width={wallW + 18}
        height={3}
        rx={1.5}
        fill="#B98C50"
      />
      <rect
        x={x - 8}
        y={y + wallH + 12}
        width={wallW + 18}
        height={2}
        rx={1}
        fill="rgba(74,62,32,0.12)"
      />

      {/* Smoke puffs (rendered last = on top) */}
      <SmokePuff cx={chimneyX + 6} cy={chimneyTopY - 8} rx={4} ry={5} delay={0} />
      <SmokePuff cx={chimneyX + 3} cy={chimneyTopY - 16} rx={3} ry={4} delay={1.7} />
    </g>
  );
}

/* ── Scene Mailbox (more 3D, red flag) ── */
function SceneMailbox({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {/* Ground shadow */}
      <ellipse
        cx={x + 27}
        cy={y + 66}
        rx={22}
        ry={4}
        fill="rgba(74,62,32,0.07)"
      />
      {/* Post */}
      <rect x={x + 13} y={y + 4} width={8} height={62} rx={3} fill="#B98C50" />
      {/* Post side shadow */}
      <rect x={x + 13} y={y + 4} width={3} height={62} rx={3} fill="rgba(74,62,32,0.12)" />

      {/* Box body */}
      <rect x={x} y={y - 12} width={54} height={36} rx={8} fill="#B98C50" />
      {/* Arch top highlight */}
      <path
        d={`M ${x} ${y + 5} Q ${x} ${y - 12} ${x + 9} ${y - 12} L ${x + 45} ${y - 12} Q ${x + 54} ${y - 12} ${x + 54} ${y + 5}`}
        fill="#C99B60"
      />
      {/* Box face panel */}
      <rect x={x + 4} y={y - 8} width={46} height={28} rx={6} fill="#D7B67A" />

      {/* Delivery slot */}
      <rect x={x + 12} y={y + 8} width={30} height={5} rx={2.5} fill="#865F32" />
      {/* Slot shadow */}
      <rect x={x + 12} y={y + 11} width={30} height={2} rx={1} fill="rgba(74,62,32,0.15)" />

      {/* Box outline */}
      <rect
        x={x}
        y={y - 12}
        width={54}
        height={36}
        rx={8}
        fill="none"
        stroke="#9A7040"
        strokeWidth={1.5}
      />

      {/* Flag post */}
      <rect x={x + 48} y={y - 16} width={3.5} height={24} rx={1.5} fill="#865F32" />
      {/* Flag (raised — decorative) */}
      <path
        d={`M ${x + 51.5} ${y - 16} L ${x + 68} ${y - 10} L ${x + 51.5} ${y - 4} Z`}
        fill="#D8613E"
      />
    </g>
  );
}

/* ── Wooden bench ── */
function SceneBench({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {/* Ground shadow */}
      <ellipse
        cx={x + 38}
        cy={y + 52}
        rx={38}
        ry={5}
        fill="rgba(74,62,32,0.07)"
      />
      {/* Back legs */}
      <rect x={x + 2} y={y + 2} width={6} height={28} rx={2} fill="#9A7040" />
      <rect x={x + 68} y={y + 2} width={6} height={28} rx={2} fill="#9A7040" />
      {/* Back rest */}
      <rect x={x} y={y} width={76} height={9} rx={3} fill="#D7B67A" />
      <rect x={x + 2} y={y + 2} width={72} height={5} rx={2} fill="#B98C50" />
      <line
        x1={x + 26}
        y1={y}
        x2={x + 26}
        y2={y + 9}
        stroke="#9A7040"
        strokeWidth={1.5}
      />
      <line
        x1={x + 50}
        y1={y}
        x2={x + 50}
        y2={y + 9}
        stroke="#9A7040"
        strokeWidth={1.5}
      />
      {/* Seat */}
      <rect x={x} y={y + 20} width={76} height={9} rx={3} fill="#D7B67A" />
      <rect x={x + 2} y={y + 22} width={72} height={5} rx={2} fill="#B98C50" />
      <line
        x1={x + 26}
        y1={y + 20}
        x2={x + 26}
        y2={y + 29}
        stroke="#9A7040"
        strokeWidth={1.5}
      />
      <line
        x1={x + 50}
        y1={y + 20}
        x2={x + 50}
        y2={y + 29}
        stroke="#9A7040"
        strokeWidth={1.5}
      />
      {/* Front legs */}
      <rect x={x + 4} y={y + 29} width={6} height={22} rx={2} fill="#B98C50" />
      <rect x={x + 66} y={y + 29} width={6} height={22} rx={2} fill="#B98C50" />
    </g>
  );
}

/* ── Forest signpost (vertical post + horizontal arrow board) ── */
function ForestSignpost({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {/* Ground shadow */}
      <ellipse
        cx={x + 5}
        cy={y + 60}
        rx={14}
        ry={3}
        fill="rgba(74,62,32,0.07)"
      />
      {/* Vertical post */}
      <rect x={x} y={y} width={10} height={60} rx={3} fill="#B98C50" />
      {/* Post shadow side */}
      <rect x={x} y={y} width={3.5} height={60} rx={3} fill="rgba(74,62,32,0.10)" />

      {/* Arrow board (pointing right) */}
      <path
        d={`M ${x + 10} ${y + 8} L ${x + 54} ${y + 8} L ${x + 64} ${y + 22} L ${x + 54} ${y + 36} L ${x + 10} ${y + 36} Z`}
        fill="#D7B67A"
      />
      <path
        d={`M ${x + 10} ${y + 8} L ${x + 54} ${y + 8} L ${x + 64} ${y + 22} L ${x + 54} ${y + 36} L ${x + 10} ${y + 36} Z`}
        fill="none"
        stroke="#9A7040"
        strokeWidth={1.5}
      />
      {/* Board wood grain line */}
      <line
        x1={x + 10}
        y1={y + 22}
        x2={x + 60}
        y2={y + 22}
        stroke="rgba(74,62,32,0.08)"
        strokeWidth={1}
      />
      {/* Sign text */}
      <text
        x={x + 34}
        y={y + 25}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={11}
        fontFamily="LXGW WenKai Screen, serif"
        fill="#4D572E"
        fontWeight="600"
      >
        森林
      </text>
    </g>
  );
}

/* ── Simple decorative sunflower for the scene ── */
function SceneSunflower({
  x,
  y,
  s = 1,
}: {
  x: number;
  y: number;
  s?: number;
}) {
  const petalAngles = [0, 40, 80, 120, 160, 200, 240, 280, 320];
  return (
    <g>
      {/* Stem */}
      <line
        x1={x}
        y1={y}
        x2={x - 2 * s}
        y2={y + 28 * s}
        stroke="#6A8840"
        strokeWidth={2.5 * s}
        strokeLinecap="round"
      />
      {/* Leaf */}
      <ellipse
        cx={x - 8 * s}
        cy={y + 14 * s}
        rx={9 * s}
        ry={4 * s}
        fill="#7BA050"
        transform={`rotate(-40 ${x - 8 * s} ${y + 14 * s})`}
      />
      {/* Petals */}
      {petalAngles.map((angle) => (
        <ellipse
          key={angle}
          cx={x}
          cy={y - 7 * s}
          rx={2.5 * s}
          ry={6 * s}
          fill="#DBA940"
          transform={`rotate(${angle} ${x} ${y})`}
        />
      ))}
      {/* Disc */}
      <circle cx={x} cy={y} r={6 * s} fill="#865F32" />
      <circle cx={x} cy={y} r={4 * s} fill="#9A6E38" />
    </g>
  );
}

/* ── Tiny decorative wildflower ── */
function SceneFlower({
  x,
  y,
  color,
  s = 1,
}: {
  x: number;
  y: number;
  color: string;
  s?: number;
}) {
  return (
    <g>
      {[0, 60, 120, 180, 240, 300].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const px = x + Math.cos(rad) * 4.5 * s;
        const py = y + Math.sin(rad) * 4.5 * s;
        return (
          <circle key={angle} cx={px} cy={py} r={2 * s} fill={color} opacity={0.82} />
        );
      })}
      <circle cx={x} cy={y} r={2.2 * s} fill="#DBA940" />
    </g>
  );
}

/* ── Watercolor grass patch ── */
function GrassPatch({
  cx,
  cy,
  rx,
  ry,
  color,
  opacity,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  color: string;
  opacity: number;
}) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={color} opacity={opacity} />;
}

export function GardenScene({ children, height = 300 }: GardenSceneProps) {
  return (
    <div className="relative overflow-hidden w-full" style={{ height }}>
      {/* Background SVG layer */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Sky */}
        <rect x="0" y="0" width={VW} height={VH} fill="#FBF4E3" />

        {/* Distant hills — back layer (darker #B8C88A) */}
        <ellipse cx="52" cy="196" rx="165" ry="84" fill="#B8C88A" />
        <ellipse cx="328" cy="200" rx="152" ry="80" fill="#B8C88A" />

        {/* Distant hills — front layer (slightly lighter/warmer) */}
        <ellipse cx="112" cy="205" rx="132" ry="66" fill="#C3CF6A" opacity={0.7} />
        <ellipse cx="268" cy="208" rx="120" ry="63" fill="#BFCA75" opacity={0.65} />

        {/* Main grass block */}
        <rect x="0" y={GRASS_Y} width={VW} height={VH - GRASS_Y} fill="#CCD56F" />

        {/* Grass top-edge soft watercolor variation */}
        <path
          d={`M 0 ${GRASS_Y} Q 95 ${GRASS_Y - 9} 192 ${GRASS_Y} Q 298 ${GRASS_Y + 10} ${VW} ${GRASS_Y} L ${VW} ${GRASS_Y + 14} L 0 ${GRASS_Y + 14} Z`}
          fill="#D8DE83"
          opacity={0.9}
        />

        {/* Watercolor grass texture patches */}
        <GrassPatch cx={78} cy={176} rx={72} ry={18} color="#D8DE83" opacity={0.34} />
        <GrassPatch cx={248} cy={188} rx={92} ry={22} color="#C3CF68" opacity={0.38} />
        <GrassPatch cx={342} cy={204} rx={56} ry={15} color="#D8DE83" opacity={0.28} />

        {/* Trees — back to front, varied shapes */}
        <TreeConical x={42} y={120} s={0.62} phase={0} />
        <TreeRound x={122} y={112} s={0.78} phase={1} />
        <TreeDouble x={198} y={108} s={0.85} phase={2} />
        <TreeRound x={296} y={116} s={0.72} phase={3} />
        <TreeConical x={358} y={124} s={0.58} phase={1} />

        {/* Refined house — left rear */}
        <RefinedHouse x={8} y={155} />

        {/* Sunflower clusters flanking house */}
        <SceneSunflower x={4} y={172} s={0.75} />
        <SceneSunflower x={16} y={164} s={0.9} />
        <SceneSunflower x={100} y={167} s={0.82} />
        <SceneSunflower x={112} y={173} s={0.7} />

        {/* Mailbox — left-mid */}
        <SceneMailbox x={148} y={200} />

        {/* Scattered small wildflowers (white / pink / yellow / blue) */}
        <SceneFlower x={138} y={218} color="#FDFAFF" s={0.85} />
        <SceneFlower x={164} y={234} color="#F4A8C0" s={0.8} />
        <SceneFlower x={196} y={222} color="#DBA940" s={0.88} />
        <SceneFlower x={220} y={240} color="#A8C8E8" s={0.76} />
        <SceneFlower x={272} y={226} color="#F4A8C0" s={0.72} />
        <SceneFlower x={310} y={244} color="#FDFAFF" s={0.8} />
        <SceneFlower x={152} y={252} color="#DBA940" s={0.65} />
        <SceneFlower x={244} y={252} color="#A8C8E8" s={0.7} />

        {/* Bench — center-right */}
        <SceneBench x={232} y={216} />

        {/* Forest signpost — right foreground */}
        <ForestSignpost x={320} y={177} />
      </svg>

      {/* Children rendered over the grass area */}
      <div
        className="absolute left-0 right-0 bottom-0"
        style={{ top: `${(GRASS_Y / VH) * 100}%` }}
      >
        {children}
      </div>
    </div>
  );
}
