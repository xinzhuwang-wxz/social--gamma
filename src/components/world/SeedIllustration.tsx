"use client";

export interface SeedIllustrationProps {
  size?: number;
}

export function SeedIllustration({ size = 32 }: SeedIllustrationProps) {
  const vw = 32;
  const vh = 40;

  return (
    <svg
      width={size}
      height={(size * vh) / vw}
      viewBox={`0 0 ${vw} ${vh}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="种子"
    >
      {/* Seed shadow */}
      <ellipse cx="16" cy="37" rx="10" ry="3" fill="rgba(74,62,32,0.1)" />

      {/* Seed body — teardrop / oval shape */}
      <ellipse cx="16" cy="20" rx="10" ry="14" fill="#A9753D" transform="rotate(-8 16 20)" />

      {/* Seed belly — lighter sheen */}
      <ellipse cx="17" cy="22" rx="7" ry="10" fill="#B98550" transform="rotate(-8 17 22)" />

      {/* Seed tip line */}
      <path d="M 16 6 Q 16.5 4 17 3" stroke="#865F32" strokeWidth="1.5" strokeLinecap="round" />

      {/* Highlight */}
      <ellipse cx="12" cy="14" rx="3" ry="4.5" fill="rgba(255,255,255,0.28)" transform="rotate(-15 12 14)" />

      {/* Small specular dot */}
      <circle cx="11" cy="12" r="1.2" fill="rgba(255,255,255,0.40)" />
    </svg>
  );
}
