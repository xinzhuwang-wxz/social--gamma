"use client";

import useSWR from "swr";
import Link from "next/link";
import Image from "next/image";
import { Bell, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { CourierBird, Plant, type PlantStage } from "@/components/world";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

const stageText: Record<string, string> = {
  matching: "正在寻找同行者",
  delivered: "种子已送达候选同伴",
  sprout: "刚刚成为搭子",
  leafing: "正在商量行动",
  growing: "正在敲定计划",
  bud: "已约好，等待行动",
  bloom: "这次行动完成了",
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

/** 底图种植位中心坐标（%，网格标定） */
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

type ForestItem = {
  id: string;
  title: string;
  summary: string | null;
  withName: string;
  withEmoji: string;
  date: string;
  imageUrl: string | null;
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "深夜好";
  if (h < 11) return "早上好";
  if (h < 14) return "中午好";
  if (h < 18) return "下午好";
  return "晚上好";
}

function WelcomeBubble({ unread, hasPlants }: { unread: number; hasPlants: boolean }) {
  const message =
    unread > 0
      ? "你好呀，有新的种子想和你分享！"
      : hasPlants
        ? "小叶已经替你留意新的同行机会"
        : "你好呀，我是信使小叶。花园还空着，种下第一颗种子吧！";

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
        transform: "translate(-50%, calc(-100% + 20px))",
        zIndex: Math.round(plot.y),
      }}
    >
      {/* 只留植物图形，名字在下方「正在生长」列表，避免 Hero 内标签拥挤 */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 14 }}
        title={plant.title}
      >
        <Plant stage={toPlantStage[plant.stage] ?? "seed"} family={familyOf(plant.id)} size={54} />
      </motion.div>
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
  const { data: gardenData } = useSWR("/api/garden", fetcher, { refreshInterval: 4000 });
  const { data: meData } = useSWR("/api/me", fetcher, { refreshInterval: 5000 });
  const { data: forestData } = useSWR("/api/forest", fetcher, { refreshInterval: 10000 });

  const plants: PlantItem[] = gardenData?.plants ?? [];
  const mailboxUnread: number = meData?.counts?.mailboxUnread ?? 0;
  const anyMatching = plants.some((p) => p.stage === "matching");
  const userName: string = meData?.me?.name ?? "";

  /** 花园场景：最多 6 个植物位 */
  const inScene = plants.slice(0, PLOTS.length);
  const firstEmptyPlot = PLOTS[inScene.length] ?? null;

  /** 进行中事件（排除 bloom，bloom = 已完成待沉淀）*/
  const activePlants = plants.filter((p) => p.stage !== "bloom");
  const activeCount = activePlants.length;

  /** 共同回忆（最近 3 条）*/
  const memories: ForestItem[] = ((forestData?.memories ?? []) as ForestItem[]).slice(0, 3);
  const forestLoaded = forestData !== undefined;

  const greeting = getGreeting();

  return (
    <main className="min-h-dvh pb-10">

      {/* ── 顶部问候 ── */}
      <header className="flex items-end justify-between px-[18px] pb-4 pt-12">
        <div>
          <p className="mb-0.5 text-[11px] font-semibold tracking-wide text-ink-2">
            {greeting}，{userName || "朋友"}
          </p>
          <h1 className="text-[24px] font-extrabold leading-tight text-ink">我的花园</h1>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/plaza" className="text-[12px] font-semibold text-ink-2">
            公共花园 →
          </Link>
          <Link
            href="/mailbox"
            aria-label="通知"
            className="relative flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: "var(--color-mint)" }}
          >
            <Bell size={18} className="text-primary" />
            {mailboxUnread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-alert px-0.5 text-[9px] font-bold text-white">
                {mailboxUnread}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* ── Hero 卡（水彩等距花园）── */}
      <section
        className="mx-[18px] overflow-hidden"
        style={{
          borderRadius: 24,
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="relative" style={{ aspectRatio: "1 / 1" }}>
          {/* 水彩底图 */}
          <Image
            src="/garden-bg.jpg"
            alt="我的花园"
            fill
            sizes="(max-width: 480px) 100vw, 444px"
            className="object-cover"
            priority
          />

          {/* 状态 pill — 左上 */}
          <div className="absolute left-3 top-3 z-20">
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
              style={{
                background: "rgba(255,254,250,0.92)",
                border: "1px solid rgba(63,120,81,0.18)",
                boxShadow: "0 2px 12px rgba(48,76,57,0.10)",
                backdropFilter: "blur(8px)",
              }}
            >
              <span className="text-[11px]">🌱</span>
              <span className="text-[11px] font-bold" style={{ color: "var(--color-primary)" }}>
                {activeCount > 0 ? `${activeCount} 个行动进行中` : "花园等待新种子"}
              </span>
            </div>
          </div>

          {/* 土壤位植物 */}
          {inScene.map((p, i) => (
            <PlotPlant key={p.id} plant={p} plot={PLOTS[i]} />
          ))}
          {firstEmptyPlot && <PlotEmpty plot={firstEmptyPlot} />}

          {/* 信使小叶 — 右下（小叶落地等待） */}
          <div className="pointer-events-none absolute bottom-3 left-2.5 z-20">
            <WelcomeBubble unread={mailboxUnread} hasPlants={plants.length > 0} />
          </div>

          {/* 飞行信使鸟 — 右上（匹配中时出现） */}
          {anyMatching && (
            <div className="pointer-events-none absolute right-4 top-10 z-10">
              <CourierBird state="flying" size={44} />
            </div>
          )}
        </div>
      </section>

      {/* ── 正在生长 ── */}
      <section className="mt-6 px-[18px]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-ink">正在生长</h2>
          <Link
            href="/actions"
            className="text-[12px] font-semibold"
            style={{ color: "var(--color-primary)" }}
          >
            进入行动 →
          </Link>
        </div>

        {activePlants.length === 0 ? (
          /* 空状态 */
          <div
            className="rounded-[24px] px-5 py-8 text-center"
            style={{
              background: "var(--color-card)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <p className="mb-5 text-[13px] leading-relaxed text-ink-2">
              花园里还没有正在生长的行动。
              <br />
              种下一件最近想做的事吧。
            </p>
            <Link
              href="/seed/new"
              className="btn-primary inline-flex items-center justify-center px-6 text-[14px]"
            >
              发布种子
            </Link>
          </div>
        ) : (
          /* 事件卡列表 */
          <div className="flex flex-col gap-3">
            {activePlants.map((p) => (
              <Link
                key={p.id}
                href={p.href}
                className="flex items-center gap-3 rounded-[24px] px-4 py-3.5"
                style={{
                  background: "var(--color-card)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                {/* 植物图标 */}
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px]"
                  style={{ background: "var(--color-mint)" }}
                >
                  <Plant
                    stage={toPlantStage[p.stage] ?? "seed"}
                    family={familyOf(p.id)}
                    size={44}
                  />
                </div>

                {/* 文字信息 */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold leading-snug text-ink">
                    {p.title}
                  </p>
                  <p className="mt-0.5 text-[12px] text-ink-2">
                    {stageText[p.stage] ?? p.stage}
                  </p>
                </div>

                {/* 箭头 */}
                <ChevronRight size={18} className="shrink-0 text-ink-3" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── 我的森林 ── */}
      <section className="mt-6 px-[18px]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-ink">我的森林</h2>
          <Link
            href="/forest"
            className="text-[12px] font-semibold"
            style={{ color: "var(--color-primary)" }}
          >
            全部回忆 →
          </Link>
        </div>

        {forestLoaded && memories.length === 0 ? (
          /* 空状态 */
          <div
            className="rounded-[24px] px-5 py-6 text-center"
            style={{
              background: "var(--color-card)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <p className="text-[13px] leading-relaxed text-ink-2">
              完成一次真实行动后，它会在这里开花。
            </p>
          </div>
        ) : memories.length > 0 ? (
          /* 横向回忆卡 */
          <div className="no-scrollbar -mx-[18px] flex gap-3 overflow-x-auto px-[18px] pb-2">
            {memories.map((m) => (
              <Link
                key={m.id}
                href={`/memory/${m.id}`}
                className="flex shrink-0 flex-col overflow-hidden rounded-[20px]"
                style={{
                  width: 140,
                  background: "var(--color-card)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                {/* 封面 */}
                <div
                  className="relative flex h-[100px] items-center justify-center overflow-hidden"
                  style={
                    m.imageUrl
                      ? undefined
                      : { background: "linear-gradient(145deg, #c6dfba, #f8d99e)" }
                  }
                >
                  {m.imageUrl ? (
                    <Image
                      src={m.imageUrl}
                      alt={m.title}
                      fill
                      sizes="140px"
                      className="object-cover"
                    />
                  ) : (
                    <Plant stage="bloom" family={familyOf(m.id)} size={56} />
                  )}
                </div>

                {/* 文字 */}
                <div className="p-3">
                  <p className="mb-0.5 line-clamp-2 text-[12px] font-bold leading-snug text-ink">
                    {m.title}
                  </p>
                  <p className="text-[11px] text-ink-2">
                    和 {m.withName || m.withEmoji}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
