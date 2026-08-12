"use client";

import { motion } from "motion/react";

export type BirdState = "idle" | "thinking" | "flying" | "carrying" | "happy";

export interface CourierBirdProps {
  state?: BirdState;
  size?: number;
}

// Feather tuft at top of head
function HeadTuft() {
  return (
    <>
      <ellipse cx="52" cy="14" rx="4" ry="7" fill="#5A7835" />
      <ellipse cx="52" cy="14" rx="2.5" ry="5" fill="#7BA050" />
    </>
  );
}

// Cape behind body
function Cape() {
  return (
    <path
      d="M 32 44 C 6 54 8 88 44 96 C 80 88 82 54 56 44 Q 50 40 44 40 Q 38 40 32 44 Z"
      fill="#4D572E"
    />
  );
}

// Backpack on bird's back (viewer's right)
function Backpack() {
  return (
    <g>
      {/* Backpack body */}
      <rect x="56" y="52" width="17" height="22" rx="4" fill="#B98C50" />
      {/* Backpack top flap */}
      <rect x="55" y="49" width="19" height="11" rx="4" fill="#865F32" />
      {/* Buckle */}
      <rect x="61" y="67" width="6" height="3.5" rx="1" fill="#9A7040" />
      {/* Small rolled paper/letter peeking from top */}
      <rect x="60" y="44" width="9" height="7" rx="2" fill="#FBF4E3" />
      <line x1="61" y1="46.5" x2="68" y2="46.5" stroke="#B7AF96" strokeWidth="1" strokeLinecap="round" />
      <line x1="61" y1="48.5" x2="66" y2="48.5" stroke="#B7AF96" strokeWidth="1" strokeLinecap="round" />
    </g>
  );
}

export function CourierBird({ state = "idle", size = 88 }: CourierBirdProps) {
  const isFlying = state === "flying";
  const isThinking = state === "thinking";
  const isHappy = state === "happy";
  const isCarrying = state === "carrying";

  // Whole-body float animation
  const bodyY = isHappy
    ? [0, -14, 0]
    : isFlying
      ? [0, -4, 0]
      : isCarrying
        ? [0, -3, 0]
        : [0, -4, 0];

  const bodyRotate = isFlying ? [-3, 0, -3] : [0, 0, 0];

  const bodyTransition = isHappy
    ? {
        y: { type: "spring" as const, stiffness: 180, damping: 8, repeat: Infinity, repeatType: "mirror" as const },
        rotate: { duration: 0.6, repeat: Infinity, ease: "easeInOut" as const },
      }
    : isFlying
      ? {
          y: { duration: 1.2, repeat: Infinity, ease: "easeInOut" as const },
          rotate: { duration: 1.2, repeat: Infinity, ease: "easeInOut" as const },
        }
      : {
          y: { duration: 3, repeat: Infinity, ease: "easeInOut" as const },
          rotate: { duration: 3, repeat: Infinity, ease: "easeInOut" as const },
        };

  // Head tilt for thinking
  const headRotate = isThinking ? [-14, 14, -14] : [0, 0, 0];
  const headTransition = isThinking
    ? { duration: 2, repeat: Infinity, ease: "easeInOut" as const }
    : { duration: 0.3 };

  // Wing flap for flying
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
      aria-label={`信使鸟 小绿 — ${state}`}
    >
      {/* Ground shadow */}
      <ellipse cx="44" cy="104" rx="20" ry="4" fill="rgba(74,62,32,0.08)" />

      {/* Whole bird group — floats up/down */}
      <motion.g
        animate={{ y: bodyY, rotate: bodyRotate }}
        transition={bodyTransition}
        style={{ transformOrigin: "44px 66px" }}
      >
        {/* Cape (rendered behind body) */}
        <Cape />

        {/* Left wing */}
        <motion.g
          animate={{ rotate: leftWingRotate }}
          transition={wingTransition}
          style={{ transformBox: "fill-box", transformOrigin: "100% 0%" }}
        >
          <ellipse cx="27" cy="62" rx="9" ry="14" fill="#6A8840" transform="rotate(-15 27 62)" />
          <ellipse cx="27" cy="62" rx="5.5" ry="8.5" fill="#8AB860" transform="rotate(-15 27 62)" />
        </motion.g>

        {/* Body */}
        <ellipse cx="44" cy="66" rx="18" ry="22" fill="#7BA050" />

        {/* Belly (lighter patch) */}
        <ellipse cx="44" cy="70" rx="12" ry="14" fill="#A0C870" />

        {/* Right wing (partially behind backpack) */}
        <motion.g
          animate={{ rotate: rightWingRotate }}
          transition={wingTransition}
          style={{ transformBox: "fill-box", transformOrigin: "0% 0%" }}
        >
          <ellipse cx="62" cy="62" rx="8" ry="11" fill="#5A7835" transform="rotate(15 62 62)" />
        </motion.g>

        {/* Backpack */}
        <Backpack />

        {/* Head group — can tilt for thinking */}
        <motion.g
          animate={{ rotate: headRotate }}
          transition={headTransition}
          style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
        >
          <HeadTuft />
          {/* Head circle */}
          <circle cx="52" cy="28" r="16" fill="#7BA050" />
          {/* Beak */}
          <path d="M 66 26 L 82 30 L 66 34 Z" fill="#DBA940" />
          {/* Beak highlight */}
          <line x1="67" y1="27" x2="78" y2="30" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" strokeLinecap="round" />
          {/* Eye */}
          <circle cx="61" cy="24" r="4" fill="#333524" />
          <circle cx="62.5" cy="22.5" r="1.5" fill="white" />
          {/* Cheek blush */}
          <ellipse cx="65" cy="32" rx="4.5" ry="2.5" fill="rgba(216,97,62,0.14)" />
        </motion.g>

        {/* Feet */}
        <g stroke="#5A7835" strokeLinecap="round">
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
              cx="88"
              cy="30"
              rx="5.5"
              ry="7"
              fill="#A9753D"
              transform="rotate(-20 88 30)"
            />
            <ellipse
              cx="87"
              cy="28"
              rx="2"
              ry="2.5"
              fill="rgba(255,255,255,0.22)"
              transform="rotate(-20 87 28)"
            />
          </g>
        )}
      </motion.g>
    </svg>
  );
}
