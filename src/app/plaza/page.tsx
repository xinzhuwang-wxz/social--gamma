"use client";

import useSWR from "swr";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ChevronLeft } from "lucide-react";
import { Plant, GardenScene } from "@/components/world";
import type { PlantFamily } from "@/components/world";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

type PlantItem = {
  id: string;
  title: string;
  date: string;
  family: PlantFamily;
};

type PlazaResponse = {
  stats: { blooming: number; seeking: number };
  plants: PlantItem[];
};

export default function PlazaPage() {
  const router = useRouter();
  const { data } = useSWR<PlazaResponse>("/api/plaza", fetcher, {
    refreshInterval: 30000,
  });

  const blooming = data?.stats.blooming ?? 0;
  const seeking = data?.stats.seeking ?? 0;
  const plants: PlantItem[] = data?.plants ?? [];

  return (
    <motion.main
      className="min-h-dvh"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-10 flex items-center gap-3 border-b bg-paper px-4 py-3"
        style={{ borderColor: "var(--color-card-border)" }}
      >
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-mint"
          aria-label="返回"
        >
          <ChevronLeft size={22} />
        </button>
        <div>
          <h1 className="font-bold text-olive leading-tight">公共花园</h1>
          <p className="font-kai text-xs text-ink-3 leading-tight">
            整个校园一起长出来的森林
          </p>
        </div>
      </header>

      {/* Stats row */}
      <div className="px-5 pt-4 flex gap-3">
        <div className="card flex-1 flex flex-col items-center py-3 gap-0.5">
          <span className="text-2xl font-bold text-olive">{blooming}</span>
          <span className="text-xs text-ink-2 text-center">🌸 已开花的行动</span>
        </div>
        <div className="card flex-1 flex flex-col items-center py-3 gap-0.5">
          <span className="text-2xl font-bold text-olive">{seeking}</span>
          <span className="text-xs text-ink-2 text-center">🌰 正在寻找同伴的种子</span>
        </div>
      </div>

      {/* Atmosphere scene */}
      <div className="mt-4">
        <GardenScene height={220} />
      </div>

      {/* Plant grid or empty state */}
      <div className="px-5 pb-8 pt-4">
        {plants.length === 0 ? (
          <div className="mt-8 flex flex-col items-center gap-3 text-center">
            <Plant stage="seed" family={1} size={72} />
            <p className="font-kai text-ink-2">
              还没有开花的行动，去种下第一颗种子吧
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {plants.map((p) => (
              <div
                key={p.id}
                className="card flex flex-col items-center gap-1 py-3 px-1"
              >
                <Plant stage="bloom" family={p.family} size={64} />
                <span className="text-xs text-center line-clamp-1 text-ink w-full px-1">
                  {p.title}
                </span>
                <span className="text-[10px] text-ink-3">{p.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.main>
  );
}
