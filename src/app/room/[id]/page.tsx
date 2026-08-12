"use client";

import { use, useState, useRef, useEffect, useCallback } from "react";
import useSWR from "swr";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Plant, CourierBird, BloomAnimation } from "@/components/world";
import type { PlantStage } from "@/components/world";
import { useRoomStream } from "@/lib/use-room-stream";

// ── Types ─────────────────────────────────────────────────────────────────────

type Stage = "sprout" | "leafing" | "growing" | "bud" | "bloom";

interface PactContent {
  what: string;
  when: string;
  where: string;
  meet: string;
  notes: string[];
}

interface Pact {
  id: string;
  content: PactContent;
  status: "draft" | "confirmed";
  ownerConfirmed: boolean;
  partnerConfirmed: boolean;
  version: number;
  // 新字段（群体房间额外携带）
  myConfirmed?: boolean;
  confirmedCount?: number;
  memberCount?: number;
}

interface Msg {
  id: string;
  senderId: string | null;
  kind: "text" | "ai" | "system";
  content: string;
  mine: boolean;
  createdAt: string;
}

interface RoomMember {
  id: string;
  name: string | null;
  emoji: string;
  color: string;
  role: "owner" | "partner";
  completed: boolean;
}

interface RoomData {
  room: {
    id: string;
    stage: Stage;
    icebreak: { message: string; quickReplies: string[] } | null;
    summary?: { highlights: string[]; commonalities: string[]; toDiscuss: string[] };
    myCompleted: boolean;
    otherCompleted: boolean;
    isOwner: boolean;
    memberCount?: number;
  };
  seed: {
    id: string;
    title: string;
    what: string;
    whenText: string;
    whereText: string;
    groupSize: string;
  };
  other: {
    id: string;
    name: string | null;
    emoji: string;
    color: string;
    grade: string | null;
    major: string | null;
  };
  members: RoomMember[] | null;
  a2a: {
    turns: { agent: "owner" | "candidate"; text: string }[];
    commonalities: string[];
    icebreakHints: string[];
  } | null;
  messages: Msg[];
  pact: Pact | null;
  myMemoryDone: boolean;
  memoryId: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_PLANT_STAGES: PlantStage[] = [
  "seed",
  "sprout",
  "leafing",
  "growing",
  "bud",
  "bloom",
];

const STAGE_TEXT: Record<Stage, string> = {
  sprout: "发芽 · 破冰相识中",
  leafing: "长叶 · 讨论进行中",
  growing: "生长 · 敲定时间地点",
  bud: "花苞 · 约定已确认",
  bloom: "开花 · 行动已完成",
};

const fetcher = (u: string) => fetch(u).then((r) => r.json());

// ── Sub-components ────────────────────────────────────────────────────────────

function StageProgress({ currentStage }: { currentStage: Stage }) {
  const currentIdx = ALL_PLANT_STAGES.indexOf(currentStage as PlantStage);
  return (
    <div className="mt-1.5 flex items-end gap-0.5">
      {ALL_PLANT_STAGES.map((stage, idx) => (
        <div
          key={stage}
          style={{ opacity: idx <= currentIdx ? 1 : 0.28, transition: "opacity 0.4s" }}
        >
          <Plant stage={stage} family={0} size={22} />
        </div>
      ))}
    </div>
  );
}

function BloomCelebration({ onDismiss }: { onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 1600);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: "rgba(247, 240, 222, 0.94)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      aria-live="polite"
    >
      <BloomAnimation family={0} size={120} />
      <p
        className="font-kai mt-4 text-3xl"
        style={{ color: "var(--color-olive)" }}
      >
        开花啦
      </p>
    </motion.div>
  );
}

/** 成员头像行（群体房间顶部展示） */
function MembersRow({ members, myId }: { members: RoomMember[]; myId?: string }) {
  return (
    <div className="mt-2.5 flex items-center gap-3 overflow-x-auto pb-0.5">
      {members.map((m) => (
        <div key={m.id} className="flex shrink-0 flex-col items-center gap-0.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
            style={{
              background: m.color,
              boxShadow: m.id === myId ? "0 0 0 2px var(--color-primary)" : undefined,
            }}
          >
            {m.emoji}
          </div>
          <span
            className="max-w-[36px] truncate text-[9px]"
            style={{ color: "var(--color-ink-3)" }}
          >
            {m.id === myId ? "我" : (m.name ?? "?")}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  // SSE 实时推送为主，8s 轮询兜底
  const { data, mutate } = useSWR<RoomData>(`/api/rooms/${id}`, fetcher, {
    refreshInterval: 8000,
  });
  useRoomStream(id, mutate);

  // UI state
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [a2aOpen, setA2aOpen] = useState(false);
  const summaryAutoCollapsed = useRef(false);

  // Bloom celebration state
  const celebratedRef = useRef(false);
  const prevStageRef = useRef<Stage | undefined>(undefined);
  const [showBloomCelebration, setShowBloomCelebration] = useState(false);

  // Input state
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Loading states
  const [sending, setSending] = useState(false);
  const [nudging, setNudging] = useState(false);
  const [draftingPact, setDraftingPact] = useState(false);
  const [confirmingPact, setConfirmingPact] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Memory form state
  const [willRejoin, setWillRejoin] = useState<boolean | null>(null);
  const [memText, setMemText] = useState("");
  const [submittingMemory, setSubmittingMemory] = useState(false);
  const [memorySubmitted, setMemorySubmitted] = useState(false);

  // Scroll anchor
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages.length]);

  // 有约定卡后自动收起对方摘要卡（只收一次，用户仍可手动展开）
  useEffect(() => {
    if (data?.pact && !summaryAutoCollapsed.current) {
      summaryAutoCollapsed.current = true;
      setSummaryOpen(false);
    }
  }, [data?.pact]);

  // Bloom celebration: only trigger once when transitioning from non-bloom to bloom
  useEffect(() => {
    if (!data) return;
    const currentStage = data.room.stage;
    const prevStage = prevStageRef.current;

    if (
      currentStage === "bloom" &&
      prevStage !== undefined &&
      prevStage !== "bloom" &&
      !celebratedRef.current
    ) {
      celebratedRef.current = true;
      setShowBloomCelebration(true);
    }

    prevStageRef.current = currentStage;
  }, [data]);

  const dismissBloom = useCallback(() => setShowBloomCelebration(false), []);

  // Textarea auto-resize
  const adjustTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  };

  // ── Handlers ───────────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (content: string) => {
      const text = content.trim();
      if (!text || sending) return;
      setSending(true);
      try {
        await fetch(`/api/rooms/${id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text }),
        });
        setInput("");
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
        await mutate();
      } finally {
        setSending(false);
      }
    },
    [id, sending, mutate]
  );

  const handleNudge = async () => {
    if (nudging) return;
    setNudging(true);
    try {
      await fetch(`/api/rooms/${id}/nudge`, { method: "POST" });
      await mutate();
    } finally {
      setNudging(false);
    }
  };

  const handleDraftPact = async () => {
    if (draftingPact) return;
    setDraftingPact(true);
    try {
      await fetch(`/api/rooms/${id}/pact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "draft" }),
      });
      await mutate();
    } finally {
      setDraftingPact(false);
    }
  };

  const handleConfirmPact = async () => {
    if (confirmingPact) return;
    setConfirmingPact(true);
    try {
      await fetch(`/api/rooms/${id}/pact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm" }),
      });
      await mutate();
    } finally {
      setConfirmingPact(false);
    }
  };

  const handleComplete = async () => {
    if (completing) return;
    setCompleting(true);
    try {
      await fetch(`/api/rooms/${id}/complete`, { method: "POST" });
      await mutate();
    } finally {
      setCompleting(false);
    }
  };

  const handleSubmitMemory = async () => {
    if (willRejoin === null || submittingMemory) return;
    setSubmittingMemory(true);
    try {
      await fetch(`/api/rooms/${id}/memory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          willRejoin,
          ...(memText.trim() ? { text: memText.trim() } : {}),
        }),
      });
      setMemorySubmitted(true);
      await mutate();
    } finally {
      setSubmittingMemory(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────

  if (!data) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <span className="text-sm text-ink-3">加载中…</span>
      </div>
    );
  }

  const { room, seed, other, a2a, messages, pact, myMemoryDone, memoryId, members } = data;

  const isGroup = members && members.length > 2;
  // 我的 userId：如果 isOwner，找 role=owner 的成员；否则找不在 other 中的 partner
  const myUserId = room.isOwner
    ? members?.find((m) => m.role === "owner")?.id
    : members?.find((m) => m.role === "partner" && m.id !== other.id)?.id;

  const humanCount = messages.filter((m) => m.kind === "text").length;

  // pact 确认状态
  const myPactConfirmed = pact
    ? (pact.myConfirmed ?? (room.isOwner ? pact.ownerConfirmed : pact.partnerConfirmed))
    : false;
  const otherPactConfirmed = pact
    ? room.isOwner
      ? pact.partnerConfirmed
      : pact.ownerConfirmed
    : false;

  const memoryDone = myMemoryDone || memorySubmitted;
  const showMemoryForm = room.stage === "bloom" && !memoryDone;

  // 完成人数（群体）
  const completedCount = members ? members.filter((m) => m.completed).length : null;
  const memberCount = members?.length ?? room.memberCount ?? 2;

  // 为消息找对方信息（群体时根据 senderId 从 members 中查）
  function getMsgSender(senderId: string | null) {
    if (!senderId || !members) return other;
    const found = members.find((m) => m.id === senderId);
    if (!found) return other;
    return { id: found.id, name: found.name, emoji: found.emoji, color: found.color, grade: null, major: null };
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-dvh flex-col" style={{ background: "var(--color-paper)" }}>
      {/* ── Bloom celebration overlay ── */}
      <AnimatePresence>
        {showBloomCelebration && (
          <BloomCelebration onDismiss={dismissBloom} />
        )}
      </AnimatePresence>

      {/* ── Plant Status Card (top) ── */}
      <div
        className="flex-none border-b px-4 py-3"
        style={{
          background: "var(--color-sky)",
          borderColor: "var(--color-card-border)",
        }}
      >
        <div
          className="card flex items-center gap-3 px-3 py-2.5"
          style={{ background: "var(--color-card)" }}
        >
          {/* Back button */}
          <Link
            href="/actions"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{ color: "var(--color-ink-2)" }}
            aria-label="返回"
          >
            <svg
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>

          {/* Plant illustration */}
          <div
            className="flex shrink-0 items-end justify-center rounded-full"
            style={{
              width: 56,
              height: 56,
              background: "linear-gradient(135deg, #DCE3AE 55%, #CCD56F40 100%)",
              paddingBottom: 2,
            }}
          >
            <Plant stage={room.stage as PlantStage} family={0} size={46} />
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-sm font-semibold"
              style={{ color: "var(--color-ink)" }}
            >
              {seed.title}
            </p>
            <p className="text-xs" style={{ color: "var(--color-ink-2)" }}>
              {STAGE_TEXT[room.stage]}
            </p>
            <StageProgress currentStage={room.stage} />
          </div>
        </div>

        {/* 群体成员头像行 */}
        {isGroup && members && (
          <MembersRow members={members} myId={myUserId} />
        )}
      </div>

      {/* ── Scrollable middle ── */}
      <div ref={scrollAreaRef} className="no-scrollbar flex-1 overflow-y-auto">
        {/* Summary card */}
        {room.summary && (
          <div className="px-4 pt-3">
            <button
              onClick={() => setSummaryOpen((v) => !v)}
              className="card w-full px-4 py-3 text-left"
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-sm font-semibold"
                  style={{ color: "var(--color-olive)" }}
                >
                  {isGroup ? "✨ 队伍信息" : `${other.emoji} ${other.name ?? "对方"} 的信息`}
                </span>
                <span className="text-xs" style={{ color: "var(--color-ink-3)" }}>
                  {summaryOpen ? "收起" : "展开"}
                </span>
              </div>
              {summaryOpen && (
                <div
                  className="mt-2 space-y-2 text-sm"
                  style={{ color: "var(--color-ink-2)" }}
                >
                  {room.summary.highlights.length > 0 && (
                    <div>
                      <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
                        特点
                      </p>
                      <ul className="mt-0.5 space-y-0.5">
                        {room.summary.highlights.map((h, i) => (
                          <li key={i}>· {h}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {room.summary.commonalities.length > 0 && (
                    <div>
                      <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
                        共同点
                      </p>
                      <ul className="mt-0.5 space-y-0.5">
                        {room.summary.commonalities.map((c, i) => (
                          <li key={i}>· {c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {room.summary.toDiscuss.length > 0 && (
                    <div>
                      <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
                        还需讨论
                      </p>
                      <ul className="mt-0.5 space-y-0.5">
                        {room.summary.toDiscuss.map((t, i) => (
                          <li key={i}>· {t}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </button>
          </div>
        )}

        {/* A2A section */}
        {a2a && (
          <div className="px-4 pt-2">
            <button
              onClick={() => setA2aOpen((v) => !v)}
              className="card w-full px-4 py-3 text-left"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: "var(--color-ink-2)" }}>
                  🐦 信使鸟们的预热对话（Agent 对话）
                </span>
                <span className="text-xs" style={{ color: "var(--color-ink-3)" }}>
                  {a2aOpen ? "收起" : "展开"}
                </span>
              </div>
              {a2aOpen && (
                <div className="mt-2 space-y-2">
                  {a2a.turns.map((turn, i) => (
                    <div
                      key={i}
                      className="rounded-xl p-2.5 text-xs"
                      style={{
                        background:
                          turn.agent === "owner"
                            ? "var(--color-mint)"
                            : "var(--color-sky)",
                        color: "var(--color-ink-2)",
                        border: "1px solid var(--color-card-border)",
                      }}
                    >
                      <span
                        className="font-medium"
                        style={{ color: "var(--color-olive)" }}
                      >
                        {turn.agent === "owner" ? "发起方信使鸟" : "候选方信使鸟"}
                      </span>
                      <p className="mt-0.5">{turn.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </button>
          </div>
        )}

        {/* Pact card — pinned above messages */}
        {pact && (
          <div className="px-4 pt-2">
            <div
              className="rounded-[var(--radius-md)] px-4 py-3"
              style={{
                background: "#FFFAF0",
                border: "2px solid var(--color-wood-light)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="text-base">🌷</span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: "var(--color-olive)" }}
                >
                  行动约定
                </span>
                {pact.status === "confirmed" && (
                  <span
                    className="ml-auto text-xs font-medium"
                    style={{ color: "var(--color-primary)" }}
                  >
                    ✅ 双方已确认
                  </span>
                )}
              </div>
              <div
                className="space-y-1.5 text-sm"
                style={{ color: "var(--color-ink-2)" }}
              >
                <div>
                  <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
                    做什么
                  </p>
                  <p>{pact.content.what}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
                    时间
                  </p>
                  <p>{pact.content.when}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
                    地点
                  </p>
                  <p>{pact.content.where}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
                    集合方式
                  </p>
                  <p>{pact.content.meet}</p>
                </div>
                {pact.content.notes.length > 0 && (
                  <div>
                    <p className="text-xs" style={{ color: "var(--color-ink-3)" }}>
                      备注
                    </p>
                    {pact.content.notes.map((n, i) => (
                      <p key={i}>· {n}</p>
                    ))}
                  </div>
                )}
              </div>
              {pact.status === "draft" && (
                <div className="mt-3 space-y-2">
                  <div
                    className="flex gap-3 text-xs"
                    style={{ color: "var(--color-ink-3)" }}
                  >
                    {isGroup && pact.confirmedCount !== undefined && pact.memberCount !== undefined ? (
                      <span>已确认 {pact.confirmedCount}/{pact.memberCount}</span>
                    ) : (
                      <>
                        <span>{myPactConfirmed ? "✅ 我已确认" : "⬜ 我尚未确认"}</span>
                        <span>·</span>
                        <span>{otherPactConfirmed ? "✅ 对方已确认" : "⬜ 等对方确认"}</span>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!myPactConfirmed && (
                      <button
                        onClick={handleConfirmPact}
                        disabled={confirmingPact}
                        className="btn-primary flex-1 py-2 text-sm"
                      >
                        {confirmingPact ? "确认中…" : "确认约定"}
                      </button>
                    )}
                    <button
                      onClick={handleDraftPact}
                      disabled={draftingPact}
                      className="btn-secondary flex-1 py-2 text-sm"
                    >
                      {draftingPact ? "整理中…" : "重新整理"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Message list */}
        <div className="space-y-2 px-4 py-3">
          {messages.map((msg) => {
            if (msg.kind === "system") {
              return (
                <div
                  key={msg.id}
                  className="py-1 text-center text-xs"
                  style={{ color: "var(--color-ink-3)" }}
                >
                  {msg.content}
                </div>
              );
            }

            if (msg.kind === "ai") {
              return (
                <div key={msg.id} className="flex items-start gap-2">
                  {/* CourierBird avatar */}
                  <div className="flex shrink-0 flex-col items-center gap-0.5">
                    <div
                      className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full"
                      style={{ background: "var(--color-mint)" }}
                    >
                      <CourierBird state="idle" size={24} />
                    </div>
                    <span
                      className="text-[9px]"
                      style={{ color: "var(--color-ink-4)" }}
                    >
                      小苗
                    </span>
                  </div>

                  <div className="flex max-w-[78%] flex-col gap-1">
                    <div
                      className="rounded-2xl rounded-tl-sm px-3 py-2 text-sm whitespace-pre-wrap agent-surface"
                      style={{ color: "var(--color-ink)" }}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            }

            // kind === "text"
            if (msg.mine) {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div
                    className="max-w-[78%] rounded-2xl rounded-tr-sm px-3 py-2 text-sm whitespace-pre-wrap"
                    style={{
                      background: "var(--color-primary)",
                      color: "var(--color-primary-foreground)",
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            }

            // Other person's message
            const sender = getMsgSender(msg.senderId);
            return (
              <div key={msg.id} className="flex items-start gap-2">
                <div className="flex shrink-0 flex-col items-center gap-0.5">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-base"
                    style={{ background: sender.color }}
                  >
                    {sender.emoji}
                  </div>
                  <span
                    className="max-w-[32px] truncate text-[9px]"
                    style={{ color: "var(--color-ink-4)" }}
                  >
                    {sender.name ?? "对方"}
                  </span>
                </div>
                <div
                  className="card max-w-[78%] rounded-2xl rounded-tl-sm px-3 py-2 text-sm whitespace-pre-wrap"
                  style={{ color: "var(--color-ink)" }}
                >
                  {msg.content}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Memory section */}
        {showMemoryForm && (
          <div className="px-4 pb-3">
            <div className="card px-4 py-4">
              <p
                className="font-kai mb-3 text-base"
                style={{ color: "var(--color-olive)" }}
              >
                🌸 这次行动真实发生了！
              </p>
              <div className="mb-3">
                <p
                  className="mb-2 text-sm font-medium"
                  style={{ color: "var(--color-ink)" }}
                >
                  愿意再和 TA 组队吗？
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setWillRejoin(true)}
                    className="flex-1 rounded-[var(--radius-md)] py-2 text-sm font-semibold transition-colors"
                    style={
                      willRejoin === true
                        ? {
                            background: "var(--color-primary)",
                            color: "var(--color-primary-foreground)",
                            border: "1px solid var(--color-primary)",
                          }
                        : {
                            background: "var(--color-btn-secondary)",
                            color: "var(--color-olive)",
                            border: "1px solid var(--color-btn-secondary-border)",
                          }
                    }
                  >
                    是，还要一起
                  </button>
                  <button
                    onClick={() => setWillRejoin(false)}
                    className="flex-1 rounded-[var(--radius-md)] py-2 text-sm font-semibold transition-colors"
                    style={
                      willRejoin === false
                        ? {
                            background: "var(--color-alert)",
                            color: "#fff",
                            border: "1px solid var(--color-alert)",
                          }
                        : {
                            background: "var(--color-btn-secondary)",
                            color: "var(--color-olive)",
                            border: "1px solid var(--color-btn-secondary-border)",
                          }
                    }
                  >
                    暂时不
                  </button>
                </div>
              </div>
              <div className="mb-3">
                <p className="mb-1 text-xs" style={{ color: "var(--color-ink-3)" }}>
                  留一段文字记录（可选）
                </p>
                <textarea
                  value={memText}
                  onChange={(e) => setMemText(e.target.value)}
                  placeholder="这次行动怎么样？"
                  rows={3}
                  className="w-full resize-none rounded-[var(--radius-sm)] px-3 py-2 text-sm focus:outline-none"
                  style={{
                    border: "1px solid var(--color-card-border)",
                    background: "var(--color-paper)",
                    color: "var(--color-ink)",
                  }}
                />
              </div>
              <button
                onClick={handleSubmitMemory}
                disabled={willRejoin === null || submittingMemory}
                className="btn-primary w-full py-2.5 text-sm"
              >
                {submittingMemory ? "提交中…" : "记录这段回忆"}
              </button>
            </div>
          </div>
        )}

        {room.stage === "bloom" && memoryDone && (
          <div className="px-4 pb-3">
            <div className="card px-4 py-3 text-center">
              <p className="text-sm" style={{ color: "var(--color-ink-2)" }}>
                ✅ 已记录，感谢你留下这段回忆
              </p>
              {memoryId && (
                <Link
                  href={`/memory/${memoryId}`}
                  className="mt-2 block text-sm font-medium"
                  style={{ color: "var(--color-primary)" }}
                >
                  🌸 查看共同回忆
                </Link>
              )}
            </div>
          </div>
        )}

        <div className="h-2" />
      </div>

      {/* ── Bottom area ── */}
      <div
        className="flex-none border-t"
        style={{
          background: "var(--color-sky)",
          borderColor: "var(--color-card-border)",
        }}
      >
        {/* Complete button for bud stage */}
        {room.stage === "bud" && (
          <div className="px-4 pb-1 pt-3">
            {!room.myCompleted ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm" style={{ color: "var(--color-ink-2)" }}>
                  行动结束后：
                </span>
                <button
                  onClick={handleComplete}
                  disabled={completing}
                  className="btn-primary flex-none px-5 py-2 text-sm"
                >
                  {completing ? "确认中…" : "我已完成 ✓"}
                </button>
              </div>
            ) : (
              <p
                className="text-center text-sm"
                style={{ color: "var(--color-ink-3)" }}
              >
                {isGroup && completedCount !== null
                  ? `已完成 ${completedCount}/${memberCount}`
                  : room.otherCompleted
                  ? "双方都已确认完成！🌸"
                  : "已记录，等待对方也确认…"}
              </p>
            )}
          </div>
        )}

        {/* Input area */}
        <div className="flex flex-col gap-2 px-3 py-3">
          {/* 开场灵感：真人还没开口时可选（点选只填入输入框，不自动发送）*/}
          {humanCount === 0 &&
            (room.icebreak?.quickReplies?.length ?? 0) > 0 &&
            room.stage === "sprout" && (
              <div className="flex flex-col gap-1.5 pb-1">
                <span className="text-[11px]" style={{ color: "var(--color-ink-3)" }}>
                  需要开个头？点一句填进输入框，改改再发～
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {room.icebreak!.quickReplies.map((qr, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInput(qr);
                        textareaRef.current?.focus();
                      }}
                      className="rounded-full px-3 py-1 text-xs font-medium"
                      style={{
                        border: "1.5px solid var(--color-primary)",
                        color: "var(--color-primary)",
                        background: "transparent",
                      }}
                    >
                      {qr}
                    </button>
                  ))}
                </div>
              </div>
            )}
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                adjustTextarea();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder="说点什么…"
              rows={1}
              className="flex-1 resize-none rounded-[var(--radius-md)] px-3 py-2.5 text-sm focus:outline-none"
              style={{
                border: "1px solid var(--color-card-border)",
                background: "var(--color-paper)",
                color: "var(--color-ink)",
                lineHeight: "1.4",
                minHeight: "42px",
                maxHeight: "96px",
                overflowY: "auto",
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || sending}
              className="btn-primary flex-none px-4 py-2.5 text-sm"
            >
              {sending ? "…" : "发送"}
            </button>
          </div>

          {/* Action pills — border pill style */}
          <div className="flex gap-2">
            <button
              onClick={handleNudge}
              disabled={nudging}
              className="flex-1 rounded-full py-2 text-sm font-medium transition-colors disabled:opacity-50"
              style={{
                border: "1.5px solid var(--color-primary)",
                color: "var(--color-primary)",
                background: "transparent",
              }}
            >
              {nudging ? "小苗思考中…" : "✨ 推进"}
            </button>
            <button
              onClick={handleDraftPact}
              disabled={draftingPact}
              className="flex-1 rounded-full py-2 text-sm font-medium transition-colors disabled:opacity-50"
              style={{
                border: "1.5px solid var(--color-primary)",
                color: "var(--color-primary)",
                background: "transparent",
              }}
            >
              {draftingPact ? "整理中…" : "📋 整理约定"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
