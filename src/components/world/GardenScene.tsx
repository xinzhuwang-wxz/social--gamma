"use client";

import type { ReactNode } from "react";

export interface GardenSceneProps {
  children?: ReactNode;
  height?: number;
}

/* ── House (right side of scene) ── */
function House({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {/* Chimney */}
      <rect x={x + 46} y={y - 50} width={16} height={30} rx={2} fill="#B98C50" />
      <rect x={x + 43} y={y - 53} width={22} height={7} rx={2} fill="#9A7040" />
      {/* Smoke wisps */}
      <ellipse cx={x + 54} cy={y - 60} rx={4} ry={5} fill="rgba(251,244,227,0.55)" />
      <ellipse cx={x + 51} cy={y - 68} rx={3} ry={4} fill="rgba(251,244,227,0.4)" />
      {/* Roof */}
      <path
        d={`M ${x - 10} ${y} L ${x + 46} ${y - 46} L ${x + 102} ${y} Z`}
        fill="#B98C50"
      />
      {/* Roof shadow */}
      <path
        d={`M ${x - 10} ${y} L ${x + 46} ${y - 46} L ${x + 60} ${y} Z`}
        fill="rgba(74,62,32,0.08)"
      />
      {/* Wall */}
      <rect x={x} y={y} width={92} height={82} rx={3} fill="#D7B67A" />
      {/* Door */}
      <rect x={x + 32} y={y + 40} width={28} height={42} rx={5} fill="#865F32" />
      <circle cx={x + 55} cy={y + 62} r={3} fill="#9A7040" />
      {/* Door frame */}
      <rect x={x + 30} y={y + 38} width={32} height={44} rx={6} fill="none" stroke="#9A7040" strokeWidth="2" />
      {/* Window left */}
      <rect x={x + 8} y={y + 12} width={24} height={20} rx={3} fill="#A8D4E8" />
      <line x1={x + 20} y1={y + 12} x2={x + 20} y2={y + 32} stroke="#D7B67A" strokeWidth={1.5} />
      <line x1={x + 8} y1={y + 22} x2={x + 32} y2={y + 22} stroke="#D7B67A" strokeWidth={1.5} />
      {/* Window right */}
      <rect x={x + 60} y={y + 12} width={24} height={20} rx={3} fill="#A8D4E8" />
      <line x1={x + 72} y1={y + 12} x2={x + 72} y2={y + 32} stroke="#D7B67A" strokeWidth={1.5} />
      <line x1={x + 60} y1={y + 22} x2={x + 84} y2={y + 22} stroke="#D7B67A" strokeWidth={1.5} />
    </g>
  );
}

/* ── Mailbox (left side of scene) ── */
function SceneMailbox({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {/* Post */}
      <rect x={x + 10} y={y} width={8} height={62} rx={3} fill="#B98C50" />
      {/* Box body */}
      <rect x={x} y={y - 8} width={52} height={34} rx={7} fill="#B98C50" />
      {/* Box face (lighter) */}
      <rect x={x + 4} y={y - 4} width={44} height={26} rx={5} fill="#D7B67A" />
      {/* Mail slot */}
      <rect x={x + 12} y={y + 10} width={28} height={5} rx={2.5} fill="#865F32" />
      {/* Flag post */}
      <rect x={x + 46} y={y - 10} width={3.5} height={24} rx={1} fill="#865F32" />
      {/* Flag (always raised for decorative scene) */}
      <path
        d={`M ${x + 49.5} ${y - 10} L ${x + 66} ${y - 4} L ${x + 49.5} ${y + 2} Z`}
        fill="#D8613E"
      />
    </g>
  );
}

/* ── Bench ── */
function Bench({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {/* Back legs */}
      <rect x={x} y={y} width={6} height={28} rx={2} fill="#B98C50" />
      <rect x={x + 68} y={y} width={6} height={28} rx={2} fill="#B98C50" />
      {/* Back rest */}
      <rect x={x} y={y} width={74} height={9} rx={3} fill="#D7B67A" />
      <rect x={x + 2} y={y + 2} width={70} height={5} rx={2} fill="#B98C50" />
      {/* Seat */}
      <rect x={x} y={y + 18} width={74} height={9} rx={3} fill="#D7B67A" />
      <rect x={x + 2} y={y + 20} width={70} height={5} rx={2} fill="#B98C50" />
      {/* Slat lines */}
      <line x1={x + 25} y1={y + 18} x2={x + 25} y2={y + 27} stroke="#9A7040" strokeWidth={1.5} />
      <line x1={x + 50} y1={y + 18} x2={x + 50} y2={y + 27} stroke="#9A7040" strokeWidth={1.5} />
      {/* Front legs */}
      <rect x={x + 4} y={y + 27} width={6} height={22} rx={2} fill="#B98C50" />
      <rect x={x + 64} y={y + 27} width={6} height={22} rx={2} fill="#B98C50" />
    </g>
  );
}

/* ── Tree group (simple crown blobs) ── */
function TreeGroup({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={22} ry={28} fill="#6A8840" />
      <ellipse cx={x + 20} cy={y + 4} rx={18} ry={23} fill="#7BA050" />
      <ellipse cx={x - 16} cy={y + 6} rx={16} ry={20} fill="#89974B" />
      {/* Simple trunk hint */}
      <rect x={x - 2} y={y + 24} width={6} height={16} rx={2} fill="#B98C50" />
    </g>
  );
}

export function GardenScene({ children, height = 300 }: GardenSceneProps) {
  // Reference width = 375 (mobile)
  const vw = 375;
  const vh = 300;

  // Grass starts at ~45% from top in 300px tall scene
  const grassY = 135;

  return (
    <div
      className="relative overflow-hidden w-full"
      style={{ height }}
    >
      {/* Background SVG layer */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${vw} ${vh}`}
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Sky */}
        <rect x="0" y="0" width={vw} height={vh} fill="#FBF4E3" />

        {/* Distant hills (back layer) */}
        <ellipse cx="65" cy="195" rx="155" ry="80" fill="#B8C88A" />
        <ellipse cx="320" cy="198" rx="140" ry="75" fill="#B8C88A" />
        {/* Center overlap hill */}
        <ellipse cx="190" cy="202" rx="110" ry="58" fill="#C3CF68" opacity="0.6" />

        {/* Far tree clusters */}
        <TreeGroup x={38} y={148} />
        <TreeGroup x={338} y={145} />
        {/* Single trees mid-distance */}
        <ellipse cx="120" cy="152" rx="16" ry="20" fill="#7BA050" opacity="0.7" />
        <ellipse cx="255" cy="150" rx="14" ry="18" fill="#89974B" opacity="0.7" />

        {/* Grass (main ground block) */}
        <rect x="0" y={grassY} width={vw} height={vh - grassY} fill="#CCD56F" />

        {/* Grass top edge — soft water-color variation */}
        <path
          d={`M 0 ${grassY} Q 90 ${grassY - 7} 188 ${grassY} Q 290 ${grassY + 8} ${vw} ${grassY} L ${vw} ${grassY + 12} L 0 ${grassY + 12} Z`}
          fill="#D8DE83"
        />

        {/* House — right side */}
        <House x={252} y={160} />

        {/* Mailbox — left side */}
        <SceneMailbox x={45} y={198} />

        {/* Bench — center-left */}
        <Bench x={128} y={214} />

        {/* Ground shadow under objects */}
        <ellipse cx="298" cy="244" rx="46" ry="7" fill="rgba(74,62,32,0.07)" />
        <ellipse cx="71" cy="260" rx="28" ry="5" fill="rgba(74,62,32,0.06)" />
        <ellipse cx="165" cy="250" rx="36" ry="5" fill="rgba(74,62,32,0.06)" />
      </svg>

      {/* Children rendered over the grass area */}
      <div
        className="absolute left-0 right-0 bottom-0"
        style={{ top: `${(grassY / vh) * 100}%` }}
      >
        {children}
      </div>
    </div>
  );
}
