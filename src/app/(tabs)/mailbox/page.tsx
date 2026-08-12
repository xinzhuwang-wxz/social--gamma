"use client";

import useSWR from "swr";
import Link from "next/link";
import { useState } from "react";
import { Plant, SeedIllustration } from "@/components/world";
import type { PlantStage, PlantFamily } from "@/components/world";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

// ── Types ──────────────────────────────────────────────────────────────────────

type MailboxItem = {
  id: string;
  seedTitle: string;
  whenText: string;
  whereText: string;
  groupSize: string;
  ownerName: string;
  ownerEmoji: string;
  status: string;
  unread: boolean;
};

type SentSeed = {
  id: string;
  title: string;
  whenText: string;
  whereText: string;
  groupSize: string;
  status: string;
  tags: string[];
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const SEED_STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  matching: "匹配中",
  delivered: "已投递",
  formed: "已成局",
  closed: "已关闭",
};

function tagToFamily(tags: string[]): PlantFamily {
  const flat = tags.join(" ").toLowerCase();
  if (
    flat.includes("户外") ||
    flat.includes("爬山") ||
    flat.includes("运动") ||
    flat.includes("徒步")
  )
    return 2;
  if (
    flat.includes("文艺") ||
    flat.includes("音乐") ||
    flat.includes("展览") ||
    flat.includes("读书")
  )
    return 1;
  return 0;
}

function statusToStage(status: string): PlantStage {
  if (status === "formed") return "bloom";
  if (status === "delivered") return "growing";
  if (status === "draft") return "seed";
  return "sprout";
}

// ── Sub-components ────────────────────────────────────────────────────────────

type TabId = "received" | "waiting" | "sent";

function TabButton({
  active,
  onClick,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex shrink-0 items-center gap-1.5 pb-3 text-sm font-semibold transition-colors"
      style={{
        color: active ? "var(--color-primary)" : "var(--color-ink-3)",
        borderBottom: active
          ? "2px solid var(--color-primary)"
          : "2px solid transparent",
        marginBottom: -1,
      }}
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <span
          className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none"
          style={{ background: "var(--color-alert)", color: "#fff" }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

/** 收到的种子卡（status=delivered，候选人视角）
 *  信息优先级：行动名称 → 时间/地点 → 发起人 */
function ReceivedCard({ item }: { item: MailboxItem }) {
  return (
    <Link
      href={`/invite/${item.id}`}
      className="card relative flex overflow-hidden"
    >
      {/* Unread left stripe */}
      {item.unread && (
        <div
          className="w-1 shrink-0 self-stretch rounded-l-[24px]"
          style={{ background: "var(--color-primary)" }}
        />
      )}

      <div className="flex flex-1 items-stretch gap-3 p-4">
        {/* Left column */}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {item.unread && (
            <span
              className="mb-0.5 self-start rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              style={{
                background: "var(--color-mint)",
                color: "var(--color-olive)",
              }}
            >
              新的邀请
            </span>
          )}

          {/* 行动名称 — 最优先 */}
          <span
            className="line-clamp-2 font-bold leading-snug"
            style={{ fontSize: 15, color: "var(--color-ink)" }}
          >
            {item.seedTitle}
          </span>

          {/* 时间/地点 — 不得用浅色 */}
          <div className="flex flex-col gap-0.5">
            <span
              className="text-[13px] font-medium"
              style={{ color: "var(--color-ink)" }}
            >
              📅 {item.whenText}
            </span>
            <span
              className="text-[13px] font-medium"
              style={{ color: "var(--color-ink)" }}
            >
              📍 {item.whereText}
            </span>
          </div>

          {/* 发起人 */}
          <span
            className="text-xs"
            style={{ color: "var(--color-ink-2)" }}
          >
            {item.ownerEmoji} {item.ownerName} 发起
          </span>
        </div>

        {/* Right: illustration + CTA */}
        <div className="flex shrink-0 flex-col items-center justify-between gap-2">
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: 64,
              height: 64,
              background:
                "linear-gradient(135deg, #DCE3AE 60%, #CCD56F55 100%)",
            }}
          >
            <SeedIllustration size={40} />
          </div>
          <span
            className="rounded-full px-3 py-1 text-[11px] font-semibold"
            style={{
              background: "var(--color-primary)",
              color: "var(--color-primary-foreground)",
            }}
          >
            查看种子
          </span>
        </div>
      </div>
    </Link>
  );
}

/** 等待回应卡（status=interested，已表达意向，等发起人确认） */
function WaitingCard({ item }: { item: MailboxItem }) {
  return (
    <Link href={`/invite/${item.id}`} className="card flex items-center gap-3 p-4">
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
        style={{ background: "var(--color-mint)" }}
      >
        <span className="text-xl">🌱</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-start gap-2">
          <span
            className="flex-1 font-semibold leading-snug"
            style={{ fontSize: 14, color: "var(--color-ink)" }}
          >
            {item.seedTitle}
          </span>
          <span
            className="shrink-0 self-start rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{
              background: "var(--color-mint)",
              color: "var(--color-olive)",
            }}
          >
            已表达意向
          </span>
        </div>
        <p className="text-xs" style={{ color: "var(--color-ink-2)" }}>
          {item.ownerEmoji} {item.ownerName} 发起 · 等待发起人选择
        </p>
      </div>
    </Link>
  );
}

/** 我发出的种子卡 */
function SentSeedCard({ seed }: { seed: SentSeed }) {
  const family = tagToFamily(seed.tags ?? []);
  const stage = statusToStage(seed.status);
  const statusLabel = SEED_STATUS_LABELS[seed.status] ?? seed.status;

  return (
    <Link href={`/seed/${seed.id}`} className="card flex items-center gap-3 p-4">
      <div
        className="flex shrink-0 items-end justify-center rounded-full"
        style={{
          width: 56,
          height: 56,
          background: "linear-gradient(135deg, #DCE3AE 60%, #CCD56F40 100%)",
          paddingBottom: 2,
        }}
      >
        <Plant stage={stage} family={family} size={46} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="flex-1 truncate font-semibold text-ink">
            {seed.title}
          </span>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{
              background: "var(--color-mint)",
              color: "var(--color-olive)",
            }}
          >
            {statusLabel}
          </span>
        </div>
        <p className="text-xs text-ink-2">📅 {seed.whenText}</p>
        <p className="mt-0.5 text-xs text-ink-3">📍 {seed.whereText}</p>
      </div>
    </Link>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mt-16 flex flex-col items-center gap-3 px-4 text-center">
      <span className="text-4xl">{icon}</span>
      <p
        className="font-kai text-sm leading-relaxed"
        style={{ color: "var(--color-ink-2)" }}
      >
        {title}
      </p>
      {subtitle && (
        <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MailboxPage() {
  const [activeTab, setActiveTab] = useState<TabId>("received");

  const { data: mailboxData } = useSWR("/api/mailbox", fetcher, {
    refreshInterval: 4000,
  });
  const { data: seedsData } = useSWR("/api/seeds", fetcher, {
    refreshInterval: 4000,
  });

  const allItems: MailboxItem[] = mailboxData?.items ?? [];
  const sentSeeds: SentSeed[] = seedsData?.seeds ?? [];

  // 收到的种子：未回应（delivered）
  const receivedItems = allItems.filter((m) => m.status === "delivered");
  // 等待回应：已表达意向（interested）
  const waitingItems = allItems.filter((m) => m.status === "interested");

  const unreadCount = receivedItems.filter((m) => m.unread).length;

  return (
    <main className="min-h-dvh px-5 pt-5">
      <h1
        className="text-2xl font-bold"
        style={{ color: "var(--color-olive)" }}
      >
        信箱
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--color-ink-3)" }}>
        信使鸟带回来的种子
      </p>

      {/* Tabs */}
      <div
        className="mt-4 flex gap-5 border-b"
        style={{ borderColor: "var(--color-card-border)" }}
      >
        <TabButton
          active={activeTab === "received"}
          onClick={() => setActiveTab("received")}
          label="收到的种子"
          badge={unreadCount}
        />
        <TabButton
          active={activeTab === "waiting"}
          onClick={() => setActiveTab("waiting")}
          label="等待回应"
          badge={waitingItems.length}
        />
        <TabButton
          active={activeTab === "sent"}
          onClick={() => setActiveTab("sent")}
          label="我发出的"
        />
      </div>

      {/* Content */}
      <div className="mt-4 pb-24">
        {activeTab === "received" &&
          (receivedItems.length === 0 ? (
            <EmptyState
              icon="📮"
              title="暂时没有新的种子，小叶会继续帮你留意。"
            />
          ) : (
            <div className="flex flex-col gap-3">
              {receivedItems.map((m) => (
                <ReceivedCard key={m.id} item={m} />
              ))}
            </div>
          ))}

        {activeTab === "waiting" &&
          (waitingItems.length === 0 ? (
            <EmptyState
              icon="🌱"
              title="你还没有回应任何种子。"
              subtitle="看看信箱里收到的邀请吧"
            />
          ) : (
            <div className="flex flex-col gap-3">
              {waitingItems.map((m) => (
                <WaitingCard key={m.id} item={m} />
              ))}
            </div>
          ))}

        {activeTab === "sent" &&
          (sentSeeds.length === 0 ? (
            <EmptyState
              icon="🌱"
              title="还没有发出的种子，去种下你的第一颗吧"
            />
          ) : (
            <div className="flex flex-col gap-3">
              {sentSeeds.map((s) => (
                <SentSeedCard key={s.id} seed={s} />
              ))}
            </div>
          ))}
      </div>
    </main>
  );
}
