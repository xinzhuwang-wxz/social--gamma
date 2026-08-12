"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plant } from "./Plant";
import type { PlantFamily } from "./Plant";

export interface BloomAnimationProps {
  family?: PlantFamily;
  size?: number;
  /** Called when the bloom opens */
  onComplete?: () => void;
}

type Phase = "bud" | "blooming" | "bloom";

export function BloomAnimation({ family = 0, size = 80, onComplete }: BloomAnimationProps) {
  const [phase, setPhase] = useState<Phase>("bud");

  useEffect(() => {
    // Pause on bud then bloom
    const t1 = setTimeout(() => setPhase("blooming"), 400);
    const t2 = setTimeout(() => {
      setPhase("bloom");
      onComplete?.();
    }, 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onComplete]);

  return (
    <div
      className="relative inline-block"
      style={{ width: size, height: (size * 120) / 80 }}
      aria-label="花苞绽放动画"
    >
      {/* Bud */}
      <AnimatePresence>
        {(phase === "bud" || phase === "blooming") && (
          <motion.div
            key="bud"
            className="absolute inset-0"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <Plant stage="bud" family={family} size={size} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bloom opening */}
      <AnimatePresence>
        {phase === "bloom" && (
          <motion.div
            key="bloom"
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.8,
              ease: [0.34, 1.56, 0.64, 1],
            }}
            style={{ transformOrigin: "50% 70%" }}
          >
            <Plant stage="bloom" family={family} size={size} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
