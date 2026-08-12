"use client";

import { motion } from "motion/react";

export interface MailboxIconProps {
  hasNew?: boolean;
  size?: number;
}

export function MailboxIcon({ hasNew = false, size = 48 }: MailboxIconProps) {
  const vw = 48;
  const vh = 64;

  return (
    <svg
      width={size}
      height={(size * vh) / vw}
      viewBox={`0 0 ${vw} ${vh}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={hasNew ? "信箱 — 有新种子" : "信箱"}
    >
      {/* Post */}
      <rect x="20" y="28" width="8" height="36" rx="3" fill="#B98C50" />
      {/* Post shadow */}
      <rect x="20" y="28" width="4" height="36" rx="3" fill="rgba(74,62,32,0.12)" />

      {/* Box body */}
      <rect x="2" y="8" width="44" height="28" rx="7" fill="#B98C50" />
      {/* Box top rounded edge (arch) */}
      <path d="M 2 18 Q 2 8 9 8 L 39 8 Q 46 8 46 18" fill="#C99B60" />

      {/* Box face (lighter wood panel) */}
      <rect x="6" y="12" width="36" height="20" rx="5" fill="#D7B67A" />

      {/* Mail slot */}
      <rect x="10" y="22" width="28" height="4.5" rx="2.25" fill="#865F32" />

      {/* Box outline */}
      <rect x="2" y="8" width="44" height="28" rx="7" fill="none" stroke="#9A7040" strokeWidth="1.5" />

      {/* Flag post */}
      <rect x="41" y="6" width="3.5" height="20" rx="1.5" fill="#865F32" />

      {/* Flag — animates between up and angled-down */}
      <motion.g
        animate={hasNew ? { rotate: 0 } : { rotate: 70 }}
        transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
        style={{ transformOrigin: "42.75px 6px" }}
      >
        <path
          d="M 42.75 6 L 58 10 L 42.75 16 Z"
          fill="#D8613E"
        />
      </motion.g>

      {/* Ground shadow */}
      <ellipse cx="24" cy="63" rx="14" ry="3" fill="rgba(74,62,32,0.08)" />
    </svg>
  );
}
