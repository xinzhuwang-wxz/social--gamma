"use client";

import useSWR from "swr";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ArrowRight } from "lucide-react";
import { FlyDelivery } from "@/components/world";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

// ── Types ──────────────────────────────────────────────────────────────────────

type SeedRequirements = { must: string[]; flexible: string[] };

type Seed = {
  id: string;
  ownerId: string;
  title: string;
  what: string;
  whenText: string;
  whereText: string;
  groupSize: string;
  requirements: SeedRequirements;
  tags: string[];
  status: string;
};

type Reason = { type: string; text: string };

type Candidate = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  grade: string | null;
  major: string | null;
  bio: string | null;
};

type Intent = {
  matchId: string;
  status: string;
  score: number;
  reasons: Reason[];
  note: string | null;
  candidate: Candidate;
};

type SeedDetailResponse = {
  seed: Seed;
  isOwner: boolean;
  intents: Intent[];
  roomId: string | null;
};

type ChooseResult = { ok: boolean; roomId: string };

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  matching: "匹配中",
  delivered: "已投递",
  formed: "已成局",
  closed: "已关闭",
};

const REASON_ICONS: Record<string, string> = {
  time: "📅",
  place: "📍",
  interest: "✨",
  experience: "🎯",
};

function reasonIcon(type: string): string {
  return REASON_ICONS[type] ?? "·";
}

/** 从 groupSize 字符串中解析上限人数。"3-4人" → 4, "3人" → 3, "2人" → 2 */
function parseGroupSizeMax(groupSize: string): number {
  const match = groupSize.match(/(\d+)/g);
  if (!match) return 2;
  const nums = match.map(Number);
  return Math.max(...nums);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InfoRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-px text-sm leading-none">{icon}</span>
      <span className="text-sm leading-snug" style={{ color: "var(--color-ink)" }}>
        {text}
      </span>
    </div>
  );
}

/** 确认邀请弹层（Spec 4.6） */
function ConfirmModal({
  candidateName,
  onConfirm,
  onCancel,
  confirming,
}: {
  candidateName: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirming: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(25, 49, 38, 0.45)" }}
      onClick={onCancel}
    >
      <div
        className="w-full rounded-t-[var(--radius-sheet)] px-6 pb-10 pt-6 shadow-xl"
        style={{ background: "var(--color-card)", maxWidth: 480 }}
        onClick={(e) => e.stopPropagation()}
      >
        <p
          className="mb-2 text-center text-[11px] font-medium tracking-wide"
          style={{ color: "var(--color-ink-3)" }}
        >
          选择同行者
        </p>
        <p
          className="mb-6 text-center text-[17px] font-bold leading-snug"
          style={{ color: "var(--color-olive)" }}
        >
          确认邀请 {candidateName} 成为这次行动的搭子吗？
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="h-12 flex-1 rounded-[var(--radius-sm)] text-sm font-semibold"
            style={{ color: "var(--color-ink-2)" }}
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={confirming}
            className="btn-primary h-12 flex-1 text-sm disabled:opacity-50"
          >
            {confirming ? "正在邀请…" : "确认邀请"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** 候选人卡（Spec 4.6 状态二） */
function IntentCard({
  intent,
  onRequestChoose,
  choosing,
  anyChoosing,
  groupMode,
  selected,
  onToggleSelect,
}: {
  intent: Intent;
  onRequestChoose: (matchId: string, name: string) => void;
  choosing: boolean;
  anyChoosing: boolean;
  groupMode: boolean;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const { candidate, reasons, note, status, matchId } = intent;

  return (
    <div className="card p-4">
      {/* 头像 / 昵称 / 校园认证 */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {/* 群体模式勾选圆 */}
          {groupMode && status === "interested" && (
            <button
              onClick={() => onToggleSelect(matchId)}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
              style={{
                borderColor: selected
                  ? "var(--color-primary)"
                  : "var(--color-card-border)",
                background: selected ? "var(--color-primary)" : "transparent",
              }}
              aria-label={selected ? "取消选择" : "选择"}
            >
              {selected && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="white"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          )}

          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl"
            style={{ background: candidate.color }}
          >
            {candidate.emoji}
          </span>

          <div className="min-w-0">
            <p className="font-semibold leading-tight" style={{ color: "var(--color-ink)" }}>
              {candidate.name}
            </p>
            {(candidate.grade || candidate.major) && (
              <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
                {[candidate.grade, candidate.major].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>

        {/* 校园认证小标 */}
        <span
          className="shrink-0 self-start rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ background: "var(--color-mint)", color: "var(--color-olive)" }}
        >
          校园认证
        </span>
      </div>

      {/* 候选人留言（一句话） */}
      {note && (
        <div
          className="mb-3 rounded-[var(--radius-sm)] px-3 py-2.5"
          style={{ background: "var(--color-sky)" }}
        >
          <p
            className="mb-0.5 text-[10px] font-medium"
            style={{ color: "var(--color-ink-3)" }}
          >
            留言
          </p>
          <p className="text-sm leading-snug" style={{ color: "var(--color-ink-2)" }}>
            {note}
          </p>
        </div>
      )}

      {/* 相关经验/bio */}
      {candidate.bio && (
        <p
          className="mb-3 text-sm leading-relaxed"
          style={{ color: "var(--color-ink-2)" }}
        >
          {candidate.bio}
        </p>
      )}

      {/* AI 匹配理由（可读句子，不显示分数） */}
      {reasons.length > 0 && (
        <div
          className="mb-3 rounded-[var(--radius-sm)] px-3 py-2.5"
          style={{ background: "var(--color-agent)" }}
        >
          <p
            className="mb-1.5 text-[10px] font-semibold"
            style={{ color: "var(--color-ink-3)" }}
          >
            小叶的匹配理由
          </p>
          <div className="flex flex-col gap-1">
            {reasons.map((r, i) => (
              <p key={i} className="text-xs leading-snug" style={{ color: "var(--color-ink-2)" }}>
                {reasonIcon(r.type)} {r.text}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* 操作区 */}
      {status === "interested" && !choosing && (
        <div className="flex gap-2">
          {/* 查看资料（占位，样式到位） */}
          <button
            className="btn-secondary h-10 flex-1 text-sm"
            disabled
            style={{ opacity: 0.6 }}
          >
            查看资料
          </button>
          {/* 选择同行 → 弹确认层（硬保护串） */}
          <button
            onClick={() => onRequestChoose(matchId, candidate.name)}
            disabled={anyChoosing}
            className="btn-primary h-10 flex-[2] text-sm disabled:opacity-50"
          >
            选择 TA 一起出发 🌱
          </button>
        </div>
      )}

      {choosing && (
        <div
          className="flex h-10 items-center justify-center rounded-[var(--radius-lg)]"
          style={{ background: "var(--color-mint)" }}
        >
          <motion.span
            className="text-sm"
            style={{ color: "var(--color-olive)" }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          >
            正在为你们布置行动房间…
          </motion.span>
        </div>
      )}

      {status === "delivered" && !choosing && (
        <p className="text-center text-xs" style={{ color: "var(--color-ink-4)" }}>
          等待回应中
        </p>
      )}
      {status === "declined" && (
        <p className="text-center text-xs" style={{ color: "var(--color-ink-4)" }}>
          暂不感兴趣
        </p>
      )}
      {status === "chosen" && (
        <p
          className="text-center text-xs font-semibold"
          style={{ color: "var(--color-primary)" }}
        >
          已选择 ✓
        </p>
      )}
      {status === "closed" && (
        <p className="text-center text-xs" style={{ color: "var(--color-ink-4)" }}>
          已关闭
        </p>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SeedDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data } = useSWR<SeedDetailResponse>(`/api/seeds/${id}`, fetcher, {
    refreshInterval: 3000,
  });

  // 单选确认弹层状态
  const [pendingConfirm, setPendingConfirm] = useState<{
    matchId: string;
    candidateName: string;
  } | null>(null);

  const [choosingId, setChoosingId] = useState<string | null>(null);
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(
    new Set()
  );
  const [groupChoosing, setGroupChoosing] = useState(false);
  // 群体模式也需要确认弹层
  const [pendingGroupConfirm, setPendingGroupConfirm] = useState(false);

  const seed = data?.seed;
  const intents: Intent[] = data?.intents ?? [];
  const roomId = data?.roomId ?? null;
  const isOwner = data?.isOwner ?? false;

  // 群体模式：groupSize 上限 > 2 且 interested >= 2
  const groupSizeMax = seed ? parseGroupSizeMax(seed.groupSize) : 2;
  const interestedIntents = intents.filter((i) => i.status === "interested");
  const groupMode = groupSizeMax > 2 && interestedIntents.length >= 2;

  function toggleSelect(matchId: string) {
    setSelectedMatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(matchId)) {
        next.delete(matchId);
      } else {
        if (next.size < groupSizeMax - 1) {
          next.add(matchId);
        }
      }
      return next;
    });
  }

  /** 打开单选确认弹层 */
  function requestChoose(matchId: string, candidateName: string) {
    if (choosingId || groupChoosing) return;
    setPendingConfirm({ matchId, candidateName });
  }

  /** 单选：用户在弹层点"确认邀请" */
  async function confirmChoose() {
    if (!pendingConfirm) return;
    const { matchId } = pendingConfirm;
    setChoosingId(matchId);
    setPendingConfirm(null);
    try {
      const res = await fetch(`/api/seeds/${id}/choose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      });
      if (!res.ok) throw new Error("failed");
      const result = (await res.json()) as ChooseResult;
      router.push(`/room/${result.roomId}`);
    } catch {
      setChoosingId(null);
    }
  }

  /** 群体选择（保留增强功能） */
  async function chooseGroup() {
    if (choosingId || groupChoosing || selectedMatchIds.size < 2) return;
    setGroupChoosing(true);
    setPendingGroupConfirm(false);
    try {
      const res = await fetch(`/api/seeds/${id}/choose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchIds: Array.from(selectedMatchIds) }),
      });
      if (!res.ok) throw new Error("failed");
      const result = (await res.json()) as ChooseResult;
      router.push(`/room/${result.roomId}`);
    } catch {
      setGroupChoosing(false);
    }
  }

  if (!data) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-5">
        <p className="text-sm" style={{ color: "var(--color-ink-3)" }}>
          加载中…
        </p>
      </main>
    );
  }

  if (!seed) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-5">
        <p className="text-sm" style={{ color: "var(--color-ink-3)" }}>
          种子不见了
        </p>
      </main>
    );
  }

  const anyChoosing = !!choosingId || groupChoosing;

  return (
    <main className="min-h-dvh">
      {/* Header */}
      <header
        className="sticky top-0 z-10 flex items-center gap-3 border-b px-4 py-3"
        style={{
          background: "var(--color-paper)",
          borderColor: "var(--color-card-border)",
        }}
      >
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors"
          style={{ color: "var(--color-ink-2)" }}
          aria-label="返回"
        >
          <ChevronLeft size={22} />
        </button>
        <span
          className="flex-1 truncate font-semibold"
          style={{ color: "var(--color-ink)" }}
        >
          {seed.title}
        </span>
        <span
          className="shrink-0 rounded-full px-2.5 py-0.5 text-xs"
          style={{
            background: "var(--color-mint)",
            color: "var(--color-olive)",
          }}
        >
          {STATUS_LABELS[seed.status] ?? seed.status}
        </span>
      </header>

      <div className="px-5 pb-28 pt-4">
        {/* 已成局：进入房间 banner */}
        {roomId && (
          <Link
            href={`/room/${roomId}`}
            className="mb-4 flex items-center justify-between rounded-[var(--radius-md)] px-4 py-3"
            style={{ background: "var(--color-mint)" }}
          >
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--color-olive)" }}
            >
              已成局 🎉 进入行动房间
            </span>
            <ArrowRight size={18} style={{ color: "var(--color-olive)" }} />
          </Link>
        )}

        {/* 种子信息卡 */}
        <div className="card mb-4 p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-2xl">🌱</span>
            <h1
              className="text-lg font-bold"
              style={{ color: "var(--color-olive)" }}
            >
              {seed.title}
            </h1>
          </div>

          <p
            className="mb-4 text-sm leading-relaxed"
            style={{ color: "var(--color-ink)" }}
          >
            {seed.what}
          </p>

          <div className="mb-3 flex flex-col gap-2">
            <InfoRow icon="📅" text={seed.whenText} />
            <InfoRow icon="📍" text={seed.whereText} />
            <InfoRow icon="👥" text={seed.groupSize} />
          </div>

          {seed.requirements.must.length > 0 && (
            <div className="mb-2">
              <p
                className="mb-1 text-xs font-medium"
                style={{ color: "var(--color-ink-3)" }}
              >
                必要条件
              </p>
              {seed.requirements.must.map((r, i) => (
                <p
                  key={i}
                  className="text-xs"
                  style={{ color: "var(--color-ink-2)" }}
                >
                  · {r}
                </p>
              ))}
            </div>
          )}

          {seed.requirements.flexible.length > 0 && (
            <div className="mb-3">
              <p
                className="mb-1 text-xs font-medium"
                style={{ color: "var(--color-ink-3)" }}
              >
                可以商量
              </p>
              {seed.requirements.flexible.map((r, i) => (
                <p
                  key={i}
                  className="text-xs"
                  style={{ color: "var(--color-ink-2)" }}
                >
                  · {r}
                </p>
              ))}
            </div>
          )}

          {seed.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {seed.tags.map((t, i) => (
                <span
                  key={i}
                  className="rounded-full px-2.5 py-0.5 text-xs"
                  style={{
                    background: "var(--color-mint)",
                    color: "var(--color-olive)",
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 状态一：匹配中 */}
        {seed.status === "matching" && (
          <div
            className="mb-4 rounded-[var(--radius-md)] px-4 py-4 text-center"
            style={{ background: "var(--color-sky)" }}
          >
            <FlyDelivery size={56} duration={900} />
            <p
              className="mt-2 text-sm font-medium"
              style={{ color: "var(--color-ink-2)" }}
            >
              小叶正在帮你寻找合适的同行者…
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--color-ink-3)" }}>
              信使鸟正在送信
            </p>
          </div>
        )}

        {/* 状态一：已投递等待回应，尚无意向 */}
        {seed.status === "delivered" && intents.length === 0 && (
          <div
            className="mb-4 rounded-[var(--radius-md)] px-4 py-4"
            style={{ background: "var(--color-sky)" }}
          >
            <p className="text-sm" style={{ color: "var(--color-ink-2)" }}>
              🐦 种子已投递，等待同伴回应
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--color-ink-3)" }}>
              已收到 {interestedIntents.length} 份意向
            </p>
          </div>
        )}

        {/* 状态一：等待阶段的操作 */}
        {isOwner &&
          intents.length === 0 &&
          seed.status !== "matching" &&
          seed.status !== "formed" &&
          seed.status !== "closed" && (
            <div className="mb-4 flex gap-3">
              <Link
                href="/garden"
                className="btn-secondary flex h-11 flex-1 items-center justify-center text-sm"
              >
                返回花园
              </Link>
            </div>
          )}

        {/* 状态二：候选人列表（发起人视角） */}
        {isOwner && intents.length > 0 && (
          <div>
            {/* 小叶提示（Spec 4.6 顶部文案） */}
            <div
              className="mb-4 rounded-[var(--radius-md)] px-4 py-3"
              style={{ background: "var(--color-agent)" }}
            >
              <p
                className="font-kai text-sm leading-relaxed"
                style={{ color: "var(--color-ink-2)" }}
              >
                小叶已经帮你找到{" "}
                <span
                  className="font-bold"
                  style={{ color: "var(--color-olive)" }}
                >
                  {interestedIntents.length}
                </span>{" "}
                位有意向的同行者，由你来做最终选择。
              </p>
            </div>

            <div className="mb-3 flex items-start justify-between gap-2">
              <h2
                className="text-base font-semibold"
                style={{ color: "var(--color-ink)" }}
              >
                有意向的同伴
              </h2>
              <p
                className="text-right text-xs leading-snug"
                style={{ color: "var(--color-ink-3)" }}
              >
                由你亲自选择同行者
                <br />
                小叶只做参谋
              </p>
            </div>

            {/* 群体模式提示 */}
            {groupMode && (
              <div
                className="mb-3 rounded-[var(--radius-sm)] px-3 py-2 text-xs"
                style={{
                  background: "var(--color-mint)",
                  color: "var(--color-ink-2)",
                }}
              >
                💡 这次活动支持 {groupSizeMax}{" "}
                人一起出发！可以勾选多位同伴组队，也可以单独选择一位。
              </div>
            )}

            <div className="flex flex-col gap-3">
              {intents.map((intent) => (
                <IntentCard
                  key={intent.matchId}
                  intent={intent}
                  onRequestChoose={requestChoose}
                  choosing={choosingId === intent.matchId}
                  anyChoosing={anyChoosing}
                  groupMode={groupMode}
                  selected={selectedMatchIds.has(intent.matchId)}
                  onToggleSelect={toggleSelect}
                />
              ))}
            </div>
          </div>
        )}

        {isOwner &&
          intents.length === 0 &&
          seed.status !== "matching" && (
            <div
              className="mt-8 text-center text-sm"
              style={{ color: "var(--color-ink-3)" }}
            >
              还没有同伴表达意向
            </div>
          )}
      </div>

      {/* 群体组队悬浮按钮 */}
      {groupMode && selectedMatchIds.size >= 2 && !anyChoosing && (
        <div
          className="fixed bottom-6 left-1/2 z-20 -translate-x-1/2"
          style={{ width: "calc(100% - 40px)", maxWidth: 420 }}
        >
          <button
            onClick={() => setPendingGroupConfirm(true)}
            className="btn-primary w-full py-3.5 text-base font-semibold shadow-lg"
          >
            和选中的 {selectedMatchIds.size} 位一起出发 🌱
          </button>
        </div>
      )}

      {/* 群体组队中 */}
      {groupChoosing && (
        <div
          className="fixed bottom-6 left-1/2 z-20 -translate-x-1/2"
          style={{ width: "calc(100% - 40px)", maxWidth: 420 }}
        >
          <div
            className="flex h-14 items-center justify-center rounded-[var(--radius-lg)] shadow-lg"
            style={{ background: "var(--color-mint)" }}
          >
            <motion.span
              className="text-sm"
              style={{ color: "var(--color-olive)" }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            >
              正在为你们布置行动房间…
            </motion.span>
          </div>
        </div>
      )}

      {/* 单选确认弹层 */}
      {pendingConfirm && (
        <ConfirmModal
          candidateName={pendingConfirm.candidateName}
          onConfirm={confirmChoose}
          onCancel={() => setPendingConfirm(null)}
          confirming={!!choosingId}
        />
      )}

      {/* 群体确认弹层 */}
      {pendingGroupConfirm && (
        <ConfirmModal
          candidateName={`${selectedMatchIds.size} 位同伴`}
          onConfirm={chooseGroup}
          onCancel={() => setPendingGroupConfirm(false)}
          confirming={groupChoosing}
        />
      )}
    </main>
  );
}
