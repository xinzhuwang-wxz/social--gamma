"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { CourierBird } from "./CourierBird";

export interface FlyDeliveryProps {
  /** Bird size in px */
  size?: number;
  /** Whether the animation is playing; defaults to true */
  playing?: boolean;
  /** Duration of one pass in ms (400–1000) */
  duration?: number;
  /** Called each time the bird completes a pass */
  onPass?: () => void;
}

export function FlyDelivery({
  size = 72,
  playing = true,
  duration = 800,
  onPass,
}: FlyDeliveryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(375);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    ro.observe(containerRef.current);
    setContainerWidth(containerRef.current.offsetWidth);
    return () => ro.disconnect();
  }, []);

  const birdHeight = (size * 104) / 96;
  const startX = -(size + 20);
  const endX = containerWidth + 20;

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden w-full"
      style={{ height: birdHeight + 16 }}
      aria-label="信使鸟送信动画"
    >
      {playing && (
        <motion.div
          className="absolute"
          style={{ top: 8 }}
          initial={{ x: startX }}
          animate={{ x: endX }}
          transition={{
            duration: duration / 1000,
            ease: "linear",
            repeat: Infinity,
            repeatType: "loop",
          }}
          onAnimationComplete={() => onPass?.()}
        >
          <CourierBird state="carrying" size={size} />
        </motion.div>
      )}
    </div>
  );
}
