"use client";

import { motion } from "motion/react";

export type BirdState = "idle" | "thinking" | "flying" | "carrying" | "happy";

export interface CourierBirdProps {
  state?: BirdState;
  size?: number;
}

/* ── Sub-shapes defined at module level (react-hooks/static-components safe) ── */

function HeadTuft() {
  return (
    <>
      <ellipse cx="52" cy="14" rx="4.5" ry="7.5" fill="#4A6828" />
      <ellipse cx="52" cy="14" rx="2.8" ry="5.2" fill="#7BA050" />
    </>
  );
}

function Cape() {
  return (
    <>
      {/* Outer cape body — darker for more visibility */}
      <path
        d="M 30 42 C 4 54 6 92 44 100 C 82 92 84 54 58 42 Q 51 38 44 38 Q 37 38 30 42 Z"
        fill="#3D4824"
      />
      {/* Cape highlight fold */}
      <path
        d="M 44 38 C 40 44 36 56 38 80 C 40 90 44 96 44 100 C 48 88 50 68 48 50 C 46 42 44 38 44 38 Z"
        fill="#4D572E"
        opacity={0.6}
      />
    </>
  );
}

function Backpack() {
  return (
    <g>
      {/* Backpack body */}
      <rect x="57" y="52" width="17" height="22" rx="4" fill="#B98C50" />
      {/* Backpack body shade */}
      <rect x="57" y="52" width="5" height="22" rx="4" fill="rgba(74,62,32,0.12)" />
      {/* Top flap */}
      <rect x="56" y="49" width="19" height="11" rx="4" fill="#865F32" />
      {/* Strap detail */}
      <rect x="60" y="44" width="4" height="8" rx={2} fill="#9A7040" opacity={0.8} />
      {/* Buckle */}
      <rect x="61" y="68" width="6" height="3.5" rx="1" fill="#9A7040" />
      {/* Envelope peeking from top — larger and more visible */}
      <rect x="59" y="41" width="11" height="9" rx="2.5" fill="#FBF4E3" />
      {/* Envelope flap line */}
      <path
        d="M 59 41 L 64.5 46 L 70 41"
        stroke="#D8613E"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      />
      {/* Envelope text lines */}
      <line x1="61" y1="47.5" x2="68" y2="47.5" stroke="#B7AF96" strokeWidth="1" strokeLinecap="round" />
      <line x1="61" y1="49.5" x2="66" y2="49.5" stroke="#B7AF96" strokeWidth="1" strokeLinecap="round" />
    </g>
  );
}

export function CourierBird({ state = "idle", size = 88 }: CourierBirdProps) {
  const isFlying = state === "flying";
  const isThinking = state === "thinking";
  const isHappy = state === "happy";
  const isCarrying = state === "carrying";
  const isIdle = state === "idle";

  /* ── Whole-body float ── */
  const bodyY = isHappy
    ? [0, -14, 0]
    : isFlying
      ? [0, -5, 0]
      : isCarrying
        ? [0, -3, 0]
        : [0, -4, 0]; // idle + thinking

  const bodyRotate = isFlying ? [-3, 0, -3] : [0, 0, 0];

  const bodyTransition = isHappy
    ? {
        y: {
          type: "spring" as const,
          stiffness: 180,
          damping: 8,
          repeat: Infinity,
          repeatType: "mirror" as const,
        },
        rotate: { duration: 0.6, repeat: Infinity, ease: "easeInOut" as const },
      }
    : isFlying
      ? {
          y: { duration: 1.2, repeat: Infinity, ease: "easeInOut" as const },
          rotate: { duration: 1.2, repeat: Infinity, ease: "easeInOut" as const },
        }
      : {
          y: { duration: 3.2, repeat: Infinity, ease: "easeInOut" as const },
          rotate: { duration: 3.2, repeat: Infinity, ease: "easeInOut" as const },
        };

  /* ── Head tilt ── */
  const headRotate = isThinking ? [-14, 14, -14] : [0, 0, 0];
  const headTransition = isThinking
    ? { duration: 2, repeat: Infinity, ease: "easeInOut" as const }
    : { duration: 0.3 };

  /* ── Wing flap ── */
  const leftWingRotate = isFlying
    ? [-35, 12, -35]
    : isHappy
      ? [-15, -45, -15]
      : [0, 0, 0];

  const rightWingRotate = isFlying
    ? [30, -10, 30]
    : isHappy
      ? [15, 45, 15]
      : [0, 0, 0];

  const wingTransition = isFlying
    ? { duration: 0.4, repeat: Infinity, ease: "easeInOut" as const }
    : isHappy
      ? { duration: 0.6, repeat: Infinity, ease: "easeInOut" as const }
      : { duration: 0.3 };

  const vw = 96;
  const vh = 108;

  return (
    <svg
      width={size}
      height={(size * vh) / vw}
      viewBox={`0 0 ${vw} ${vh}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={`信使鸟 小叶 — ${state}`}
    >
      {/* Ground shadow */}
      <ellipse cx="44" cy="104" rx="20" ry="4" fill="rgba(74,62,32,0.08)" />

      {/* Whole bird group — floats up/down */}
      <motion.g
        animate={{ y: bodyY, rotate: bodyRotate }}
        transition={bodyTransition}
        style={{ transformOrigin: "44px 66px" }}
      >
        {/* Cape (behind body) */}
        <Cape />

        {/* Left wing */}
        <motion.g
          animate={{ rotate: leftWingRotate }}
          transition={wingTransition}
          style={{ transformBox: "fill-box", transformOrigin: "100% 0%" }}
        >
          {/* Outer wing layer (darker) */}
          <ellipse
            cx="26"
            cy="62"
            rx="9.5"
            ry="15"
            fill="#5A7835"
            transform="rotate(-15 26 62)"
          />
          {/* Mid wing layer */}
          <ellipse
            cx="26"
            cy="62"
            rx="6.5"
            ry="9.5"
            fill="#6A8840"
            transform="rotate(-15 26 62)"
          />
          {/* Inner highlight */}
          <ellipse
            cx="26"
            cy="58"
            rx="3.5"
            ry="5"
            fill="#8AB060"
            opacity={0.7}
            transform="rotate(-15 26 58)"
          />
        </motion.g>

        {/* Body — rounder and fuller */}
        <ellipse cx="44" cy="66" rx="20" ry="24" fill="#7BA050" />

        {/* Body highlight */}
        <ellipse cx="40" cy="58" rx="8" ry="9" fill="#8AB860" opacity={0.35} />

        {/* Belly (light patch — larger and more prominent) */}
        <ellipse cx="44" cy="72" rx="13" ry="16" fill="#B8D888" />
        {/* Belly texture */}
        <ellipse cx="44" cy="75" rx="8" ry="10" fill="#C8E898" opacity={0.5} />

        {/* Right wing (partially behind backpack) */}
        <motion.g
          animate={{ rotate: rightWingRotate }}
          transition={wingTransition}
          style={{ transformBox: "fill-box", transformOrigin: "0% 0%" }}
        >
          {/* Outer right wing */}
          <ellipse
            cx="63"
            cy="62"
            rx="8.5"
            ry="12"
            fill="#4E6825"
            transform="rotate(15 63 62)"
          />
          {/* Inner right wing lighter */}
          <ellipse
            cx="63"
            cy="62"
            rx="5"
            ry="7"
            fill="#6A8840"
            transform="rotate(15 63 62)"
          />
        </motion.g>

        {/* Backpack */}
        <Backpack />

        {/* Head group */}
        <motion.g
          animate={{ rotate: headRotate }}
          transition={headTransition}
          style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
        >
          <HeadTuft />
          {/* Head circle — slightly larger */}
          <circle cx="52" cy="28" r="17" fill="#7BA050" />
          {/* Head highlight */}
          <ellipse cx="48" cy="22" rx="6" ry="5" fill="#8AB860" opacity={0.3} />
          {/* Beak */}
          <path d="M 67 26 L 83 30 L 67 34 Z" fill="#DBA940" />
          {/* Beak highlight */}
          <line
            x1="68"
            y1="27"
            x2="79"
            y2="30"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Eye */}
          <circle cx="61" cy="24" r="4.5" fill="#222414" />
          {/* Eye highlight (larger, more prominent) */}
          <circle cx="63" cy="22" r="2" fill="white" />
          {/* Second small highlight */}
          <circle cx="59.5" cy="25.5" r="1" fill="rgba(255,255,255,0.5)" />

          {/* Blink eyelid — only animates in idle state */}
          {isIdle && (
            <motion.ellipse
              cx="61"
              cy="26"
              rx="4.5"
              ry="3"
              fill="#7BA050"
              animate={{ scaleY: [0, 1, 0] }}
              transition={{
                duration: 0.22,
                repeat: Infinity,
                repeatDelay: 3.78,
                ease: "easeInOut",
              }}
              style={{ transformOrigin: "61px 24px" }}
            />
          )}

          {/* Cheek blush */}
          <ellipse cx="66" cy="33" rx="4.5" ry="2.5" fill="rgba(216,97,62,0.14)" />
        </motion.g>

        {/* Feet — orange claws */}
        <g stroke="#D4803A" strokeLinecap="round">
          <line x1="38" y1="88" x2="34" y2="97" strokeWidth="3" />
          <line x1="34" y1="97" x2="27" y2="96" strokeWidth="2.5" />
          <line x1="34" y1="97" x2="34" y2="102" strokeWidth="2.5" />
          <line x1="34" y1="97" x2="41" y2="96" strokeWidth="2.5" />
          <line x1="50" y1="88" x2="54" y2="97" strokeWidth="3" />
          <line x1="54" y1="97" x2="47" y2="96" strokeWidth="2.5" />
          <line x1="54" y1="97" x2="54" y2="102" strokeWidth="2.5" />
          <line x1="54" y1="97" x2="61" y2="96" strokeWidth="2.5" />
        </g>

        {/* Seed held in beak (carrying state) */}
        {isCarrying && (
          <g>
            <ellipse
              cx="89"
              cy="30"
              rx="5.5"
              ry="7"
              fill="#A9753D"
              transform="rotate(-20 89 30)"
            />
            <ellipse
              cx="88"
              cy="28"
              rx="2"
              ry="2.5"
              fill="rgba(255,255,255,0.24)"
              transform="rotate(-20 88 28)"
            />
          </g>
        )}
      </motion.g>
    </svg>
  );
}
