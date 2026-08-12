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

/** 稳定散列：让同一事件始终长同一科植物（含第 4 科薰衣草） */
function familyOf(id: string): 0 | 1 | 2 | 3 {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 997;
  return (h % 4) as 0 | 1 | 2 | 3;
}

/* ── Welcome bubble component (defined at module level) ── */
function WelcomeBubble({
  unread,
  hasPlants,
}: {
  unread: number;
  hasPlants: boolean;
}) {
  const message =
    unread > 0
      ? "你好呀，我是你的信使小绿，有新的种子想和你分享！"
      : hasPlants
        ? "你好呀，今天想一起做点什么？"
        : "你好呀，我是你的信使小绿。花园还空着，种下第一颗种子吧！";

  return (
    <div className="flex items-start gap-2">
      <CourierBird state="idle" size={56} />
      <div className="relative mt-2">
        {/* Bubble tail (pointing left toward bird) */}
        <div
          className="absolute -left-2 top-4 h-4 w-4 rotate-45 bg-white"
          style={{ boxShadow: "-1px 1px 3px rgba(74,62,32,0.07)" }}
        />
        {/* Bubble body */}
        <div
          className="relative rounded-2xl bg-white px-3 py-2"
          style={{
            maxWidth: 176,
            border: "1px solid rgba(74,62,32,0.10)",
            boxShadow: "0 2px 10px rgba(74,62,32,0.07)",
          }}
        >
          <p className="font-kai text-xs leading-relaxed text-ink">{message}</p>
          {unread > 0 && (
            <span
              className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-alert px-1 text-[10px] font-bold text-white"
            >
              {unread}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Empty seed slot (defined at module level) ── */
function EmptySeedSlot() {
  return (
    <Link
      href="/seed/new"
      className="flex flex-col items-center justify-center gap-1 rounded-md p-3 transition-colors active:bg-grass/20"
      style={{
        border: "1.5px dashed rgba(80,95,45,0.22)",
        minHeight: 108,
      }}
      aria-label="播下一颗种子"
    >
      <span
        className="text-2xl font-light leading-none"
        style={{ color: "rgba(80,95,45,0.32)" }}
      >
        +
      </span>
      <span className="font-kai text-xs text-ink-4">播下种子</span>
    </Link>
  );
}

export function GardenView() {
  const { data } = useSWR("/api/garden", fetcher, { refreshInterval: 4000 });
  const { data: meData } = useSWR("/api/me", fetcher, { refreshInterval: 5000 });

  const plants: {
    kind: "seed" | "room";
    id: string;
    title: string;
    stage: string;
    href: string;
  }[] = data?.plants ?? [];

  const mailboxUnread: number = meData?.counts?.mailboxUnread ?? 0;
  const anyMatching = plants.some((p) => p.stage === "matching");

  return (
    <main className="min-h-dvh">
      <header className="flex items-center justify-between px-5 pt-5">
        <h1 className="text-2xl font-bold text-olive">我的花园</h1>
        <Link href="/mailbox" aria-label="通知">
          <Bell size={22} className="text-ink-2" />
        </Link>
      </header>

      {/* 花园世界场景 + 信使小绿欢迎气泡 */}
      <section className="relative mx-4 mt-4 overflow-hidden rounded-lg">
        <GardenScene height={plants.length === 0 ? 300 : 260}>
          {/* Flying bird shown in scene when actively matching */}
          {plants.length > 0 && anyMatching && (
            <div className="pointer-events-none absolute right-8 top-4">
              <CourierBird state="flying" size={48} />
            </div>
          )}
        </GardenScene>

        {/* Welcome bubble — overlaid on top-left of scene, always visible */}
        <div className="pointer-events-none absolute left-3 top-3 z-10">
          <WelcomeBubble unread={mailboxUnread} hasPlants={plants.length > 0} />
        </div>
      </section>

      {/* 植物格子（隐形草地 Grid） */}
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
        {/* Empty seed slot — always show at end to encourage planting */}
        <EmptySeedSlot />
      </section>
    </main>
  );
}
