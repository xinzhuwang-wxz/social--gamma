"use client";

import useSWR from "swr";
import Link from "next/link";
import Image from "next/image";
import { Bell } from "lucide-react";
import { motion } from "motion/react";
import { CourierBird, Plant, type PlantStage } from "@/components/world";

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

/** 稳定散列：同一事件始终同一科植物（含薰衣草） */
function familyOf(id: string): 0 | 1 | 2 | 3 {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 997;
  return (h % 4) as 0 | 1 | 2 | 3;
}

/** 底图（public/garden-bg.jpg，正方形）上土壤种植位的中心坐标（%，网格标定） */
const PLOTS: { x: number; y: number }[] = [
  { x: 47, y: 73 },
  { x: 61.5, y: 46 },
  { x: 25.5, y: 74 },
  { x: 37, y: 80 },
  { x: 73, y: 51 },
  { x: 64, y: 58 },
];

type PlantItem = {
  kind: "seed" | "room";
  id: string;
  title: string;
  stage: string;
  href: string;
};

function WelcomeBubble({ unread, hasPlants }: { unread: number; hasPlants: boolean }) {
  const message =
    unread > 0
      ? "你好呀，有新的种子想和你分享！"
      : hasPlants
        ? "你好呀，今天想一起做点什么？"
        : "你好呀，我是信使小绿。花园还空着，种下第一颗种子吧！";

  return (
    <div className="flex items-start gap-1.5">
      <CourierBird state="idle" size={52} />
      <div className="relative mt-1">
        <div
          className="absolute -left-1.5 top-3.5 h-3 w-3 rotate-45 bg-white"
          style={{ boxShadow: "-1px 1px 3px rgba(74,62,32,0.07)" }}
        />
        <div
          className="relative rounded-2xl bg-white px-3 py-1.5"
          style={{
            maxWidth: 168,
            border: "1px solid rgba(74,62,32,0.10)",
            boxShadow: "0 2px 10px rgba(74,62,32,0.07)",
          }}
        >
          <p className="font-kai text-xs leading-relaxed text-ink">{message}</p>
          {unread > 0 && (
            <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-alert px-1 text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** 种在土壤位上的植物 */
function PlotPlant({ plant, plot }: { plant: PlantItem; plot: { x: number; y: number } }) {
  return (
    <Link
      href={plant.href}
      className="absolute flex flex-col items-center"
      style={{
        left: `${plot.x}%`,
        top: `${plot.y}%`,
        // 植物底部（土壤）贴住种植位中心，标签垂在位下方
        transform: "translate(-50%, calc(-100% + 20px))",
        zIndex: Math.round(plot.y),
      }}
    >
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 14 }}
      >
        <Plant stage={toPlantStage[plant.stage] ?? "seed"} family={familyOf(plant.id)} size={56} />
      </motion.div>
      <span
        className="mt-0.5 max-w-[76px] truncate rounded-full px-1.5 py-px text-center text-[10px] font-medium text-olive"
        style={{ background: "rgba(255,249,235,0.92)", border: "1px solid rgba(86,84,59,0.14)" }}
      >
        {plant.title}
      </span>
    </Link>
  );
}

/** 空土壤位上的播种引导 */
function PlotEmpty({ plot }: { plot: { x: number; y: number } }) {
  return (
    <Link
      href="/seed/new"
      aria-label="播下一颗种子"
      className="absolute z-10 flex h-9 w-9 items-center justify-center rounded-full"
      style={{
        left: `${plot.x}%`,
        top: `${plot.y}%`,
        transform: "translate(-50%, -60%)",
      }}
    >
      <motion.span
        className="flex h-7 w-7 items-center justify-center rounded-full text-lg font-light text-white"
        style={{ background: "rgba(137,151,75,0.85)" }}
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        +
      </motion.span>
    </Link>
  );
}

export function GardenView() {
  const { data } = useSWR("/api/garden", fetcher, { refreshInterval: 4000 });
  const { data: meData } = useSWR("/api/me", fetcher, { refreshInterval: 5000 });

  const plants: PlantItem[] = data?.plants ?? [];
  const mailboxUnread: number = meData?.counts?.mailboxUnread ?? 0;
  const anyMatching = plants.some((p) => p.stage === "matching");

  const inScene = plants.slice(0, PLOTS.length);
  const overflow = plants.slice(PLOTS.length);
  const firstEmptyPlot = PLOTS[inScene.length] ?? null;

  return (
    <main className="min-h-dvh">
      <header className="flex items-center justify-between px-5 pt-5">
        <h1 className="text-2xl font-bold text-olive">我的花园</h1>
        <div className="flex items-center gap-4">
          <Link href="/plaza" className="font-kai text-sm text-ink-2">
            公共花园 →
          </Link>
          <Link href="/mailbox" aria-label="通知">
            <Bell size={22} className="text-ink-2" />
          </Link>
        </div>
      </header>

      {/* 花园世界（seedream 底图 + 土壤位植物） */}
      <section className="relative mx-4 mt-3 overflow-hidden rounded-lg" style={{ aspectRatio: "1 / 1" }}>
        <Image
          src="/garden-bg.jpg"
          alt="我的花园"
          fill
          sizes="(max-width: 480px) 100vw, 448px"
          className="object-cover"
          priority
        />

        {/* 种植位上的植物 */}
        {inScene.map((p, i) => (
          <PlotPlant key={p.id} plant={p} plot={PLOTS[i]} />
        ))}
        {firstEmptyPlot && <PlotEmpty plot={firstEmptyPlot} />}

        {/* 信使小绿 */}
        <div className="pointer-events-none absolute left-2.5 top-2.5 z-20">
          <WelcomeBubble unread={mailboxUnread} hasPlants={plants.length > 0} />
        </div>
        {anyMatching && (
          <div className="pointer-events-none absolute right-4 top-10 z-10">
            <CourierBird state="flying" size={44} />
          </div>
        )}
      </section>

      {/* 场景放不下的植物（第 8 棵起） */}
      {overflow.length > 0 && (
        <section className="mx-4 mt-3 grid grid-cols-2 gap-3 pb-6">
          {overflow.map((p) => (
            <Link
              key={p.id}
              href={p.href}
              className="flex flex-col items-center gap-1 rounded-md bg-grass/40 p-3"
              style={{ border: "1.5px solid rgba(80,95,45,0.30)" }}
            >
              <Plant stage={toPlantStage[p.stage] ?? "seed"} family={familyOf(p.id)} size={56} />
              <span className="text-center text-sm font-semibold text-ink">{p.title}</span>
              <span className="text-center text-[11px] text-ink-2">
                {stageText[p.stage] ?? p.stage}
              </span>
            </Link>
          ))}
        </section>
      )}

      {/* 进行中状态速览 */}
      {inScene.length > 0 && (
        <section className="mx-4 mt-3 flex flex-col gap-1.5 pb-6">
          {inScene.map((p) => (
            <Link key={p.id} href={p.href} className="flex items-center justify-between text-xs">
              <span className="truncate font-medium text-ink">{p.title}</span>
              <span className="shrink-0 text-ink-3">{stageText[p.stage] ?? p.stage}</span>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
