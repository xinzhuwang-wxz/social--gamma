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

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  interested: { label: "已表达意向", bg: "var(--color-mint)", color: "var(--color-olive)" },
  declined: { label: "已婉拒", bg: "var(--color-sky)", color: "var(--color-ink-3)" },
  chosen: { label: "已成局 🎉", bg: "var(--color-mint)", color: "var(--color-olive)" },
  closed: { label: "种子已找到同行者", bg: "var(--color-sky)", color: "var(--color-ink-3)" },
};

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
      className="relative flex items-center gap-1.5 pb-3 text-sm font-semibold transition-colors"
      style={{
        color: active ? "var(--color-primary)" : "var(--color-ink-3)",
        borderBottom: active ? "2px solid var(--color-primary)" : "2px solid transparent",
        marginBottom: -1,
      }}
    >
      {label}
      {badge !== undefined && (
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

function ReceivedCard({ item }: { item: MailboxItem }) {
  const isUnread = item.unread && item.status === "delivered";
  const statusCfg = item.status !== "delivered" ? STATUS_CONFIG[item.status] : null;

  return (
    <Link
      href={`/invite/${item.id}`}
      className="card relative flex items-stretch gap-3 overflow-hidden p-4"
    >
      {/* Left info column */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {isUnread && (
          <span
            className="mb-1 self-start rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
            style={{ background: "var(--color-mint)", color: "var(--color-olive)" }}
          >
            新的邀请
          </span>
        )}
        {!isUnread && statusCfg && (
          <span
            className="mb-1 self-start rounded-full px-2.5 py-0.5 text-[11px] font-medium"
            style={{ background: statusCfg.bg, color: statusCfg.color }}
          >
            {statusCfg.label}
          </span>
        )}

        <span className="line-clamp-2 font-semibold leading-snug text-ink">
          {item.seedTitle}
        </span>
        <span className="text-xs text-ink-2">
          📅 {item.whenText} · 👥 {item.groupSize}
        </span>
        <span className="text-xs text-ink-2">📍 {item.whereText}</span>
        <span className="mt-1 text-xs text-ink-3">
          {item.ownerEmoji} {item.ownerName} 发起
        </span>
      </div>

      {/* Right: illustration + button */}
      <div className="flex shrink-0 flex-col items-center justify-between gap-2">
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: 72,
            height: 72,
            background: "linear-gradient(135deg, #DCE3AE 60%, #CCD56F55 100%)",
          }}
        >
          <SeedIllustration size={46} />
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
    </Link>
  );
}

function SentSeedCard({ seed }: { seed: SentSeed }) {
  const family = tagToFamily(seed.tags ?? []);
  const stage = statusToStage(seed.status);
  const statusLabel = SEED_STATUS_LABELS[seed.status] ?? seed.status;

  return (
    <Link href={`/seed/${seed.id}`} className="card flex items-center gap-3 p-4">
      {/* Plant illustration */}
      <div
        className="flex shrink-0 items-end justify-center rounded-full"
        style={{
          width: 64,
          height: 64,
          background: "linear-gradient(135deg, #DCE3AE 60%, #CCD56F40 100%)",
          paddingBottom: 2,
        }}
      >
        <Plant stage={stage} family={family} size={52} />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="flex-1 truncate font-semibold text-ink">{seed.title}</span>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{ background: "var(--color-mint)", color: "var(--color-olive)" }}
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

function EmptyState({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="mt-16 flex flex-col items-center gap-3 text-center">
      <span className="text-5xl">{emoji}</span>
      <p className="font-kai whitespace-pre-line text-ink-2">{text}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MailboxPage() {
  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");

  const { data: mailboxData } = useSWR("/api/mailbox", fetcher, {
    refreshInterval: 4000,
  });
  const { data: seedsData } = useSWR("/api/seeds", fetcher, {
    refreshInterval: 4000,
  });

  const receivedItems: MailboxItem[] = mailboxData?.items ?? [];
  const sentSeeds: SentSeed[] = seedsData?.seeds ?? [];
  const unreadCount = receivedItems.filter(
    (m) => m.unread && m.status === "delivered",
  ).length;

  return (
    <main className="min-h-dvh px-5 pt-5">
      <h1 className="text-2xl font-bold text-olive">信箱</h1>
      <p className="mt-1 text-sm text-ink-3">信使鸟带回来的种子</p>

      {/* Tabs */}
      <div
        className="mt-4 flex gap-5 border-b"
        style={{ borderColor: "var(--color-card-border)" }}
      >
        <TabButton
          active={activeTab === "received"}
          onClick={() => setActiveTab("received")}
          label="收到的种子"
          badge={unreadCount > 0 ? unreadCount : undefined}
        />
        <TabButton
          active={activeTab === "sent"}
          onClick={() => setActiveTab("sent")}
          label="我发出的"
        />
      </div>

      {/* Content */}
      {activeTab === "received" ? (
        receivedItems.length === 0 ? (
          <EmptyState
            emoji="📮"
            text={"信箱空空的，\n信使鸟正在为你留意合适的种子"}
          />
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {receivedItems.map((m) => (
              <ReceivedCard key={m.id} item={m} />
            ))}
          </div>
        )
      ) : sentSeeds.length === 0 ? (
        <EmptyState emoji="🌱" text={"还没有发出的种子，\n去种下你的第一颗吧"} />
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {sentSeeds.map((s) => (
            <SentSeedCard key={s.id} seed={s} />
          ))}
        </div>
      )}
    </main>
  );
}
