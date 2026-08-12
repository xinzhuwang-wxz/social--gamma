"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plant } from "./Plant";
import type { PlantFamily } from "./Plant";

export interface SproutAnimationProps {
  family?: PlantFamily;
  size?: number;
  /** Called when the animation completes one cycle */
  onComplete?: () => void;
}

type Phase = "seed" | "cracking" | "sprout";

export function SproutAnimation({ family = 0, size = 80, onComplete }: SproutAnimationProps) {
  const [phase, setPhase] = useState<Phase>("seed");

  useEffect(() => {
    // Pause on seed, then crack, then show sprout
    const t1 = setTimeout(() => setPhase("cracking"), 300);
    const t2 = setTimeout(() => setPhase("sprout"), 800);
    const t3 = setTimeout(() => onComplete?.(), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <div
      className="relative inline-block"
      style={{ width: size, height: (size * 120) / 80 }}
      aria-label="种子发芽动画"
    >
      {/* Seed phase */}
      <AnimatePresence>
        {phase === "seed" && (
          <motion.div
            key="seed"
            className="absolute inset-0"
            initial={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.4, ease: "easeIn" }}
          >
            <Plant stage="seed" family={family} size={size} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cracking / soil movement hint */}
      <AnimatePresence>
        {phase === "cracking" && (
          <motion.div
            key="cracking"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Plant stage="seed" family={family} size={size} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sprout emerging */}
      <AnimatePresence>
        {phase === "sprout" && (
          <motion.div
            key="sprout"
            className="absolute inset-0 flex items-end"
            style={{ transformOrigin: "bottom center" }}
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{
              scaleY: {
                duration: 0.8,
                ease: [0.34, 1.56, 0.64, 1], // spring-like overshoot
              },
              opacity: { duration: 0.3 },
            }}
          >
            <Plant stage="sprout" family={family} size={size} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
