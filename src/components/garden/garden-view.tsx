"use client";

import useSWR from "swr";
import Link from "next/link";
import { Bell } from "lucide-react";
import { CourierBird, GardenScene, Plant, type PlantStage } from "@/components/world";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

const stageText: Record<string, string> = {
  matching: "信使鸟正在送信",
  delivered: "已送达候选同伴",
  sprout: "刚刚发芽 · 去打个招呼",
  leafing: "正在长叶 · 聊得不错",
  growing: "快速生长 · 正在敲定计划",
  bud: "花苞待放 · 行动已约好",
  bloom: "已经开花 · 行动完成",
};

/** 事件状态 → 植物阶段 */
const toPlantStage: Record<string, PlantStage> = {
  matching: "seed",
  delivered: "seed",
  sprout: "sprout",
  leafing: "leafing",
  growing: "growing",
  bud: "bud",
  bloom: "bloom",
};

/** 稳定散列：让同一事件始终长同一科植物 */
function familyOf(id: string): 0 | 1 | 2 {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 997;
  return (h % 3) as 0 | 1 | 2;
}

export function GardenView() {
  const { data } = useSWR("/api/garden", fetcher, { refreshInterval: 4000 });
  const plants: {
    kind: "seed" | "room";
    id: string;
    title: string;
    stage: string;
    href: string;
  }[] = data?.plants ?? [];

  const anyMatching = plants.some((p) => p.stage === "matching");

  return (
    <main className="min-h-dvh">
      <header className="flex items-center justify-between px-5 pt-5">
        <h1 className="text-2xl font-bold text-olive">我的花园</h1>
        <Link href="/mailbox" aria-label="通知">
          <Bell size={22} className="text-ink-2" />
        </Link>
      </header>

      {/* 花园世界场景 */}
      <section className="mx-4 mt-4 overflow-hidden rounded-lg">
        <GardenScene height={plants.length === 0 ? 300 : 260}>
          {plants.length === 0 && (
            <div className="flex h-full flex-col items-center justify-end gap-2 pb-6 text-center">
              <CourierBird state="idle" size={72} />
              <p className="font-kai text-sm text-olive">
                你好呀，我是你的信使小绿。
                <br />
                花园还空着，点下方 + 种下第一颗种子吧！
              </p>
            </div>
          )}
          {plants.length > 0 && anyMatching && (
            <div className="absolute left-8 top-6">
              <CourierBird state="flying" size={48} />
            </div>
          )}
        </GardenScene>
      </section>

      {/* 植物格子（隐形草地 Grid） */}
      {plants.length > 0 && (
        <section className="mx-4 mt-3 grid grid-cols-2 gap-3 pb-6">
          {plants.map((p) => (
            <Link
              key={p.id}
              href={p.href}
              className="flex flex-col items-center gap-1 rounded-md bg-grass/40 p-3 transition-colors active:bg-grass/60"
              style={{ border: "1.5px solid rgba(80,95,45,0.30)" }}
            >
              <Plant stage={toPlantStage[p.stage] ?? "seed"} family={familyOf(p.id)} size={72} />
              <span className="text-center text-sm font-semibold text-ink">{p.title}</span>
              <span className="text-center text-[11px] text-ink-2">
                {stageText[p.stage] ?? p.stage}
              </span>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
