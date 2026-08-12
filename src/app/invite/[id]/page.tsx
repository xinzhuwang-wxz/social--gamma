"use client";

import useSWR from "swr";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronDown, ChevronUp } from "lucide-react";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

// ── Types ──────────────────────────────────────────────────────────────────────

type Reason = { type: string; text: string };

type A2ATurn = { agent: "owner" | "candidate"; text: string };

type A2AData = {
  turns: A2ATurn[];
  commonalities: string[];
  icebreakHints: string[];
};

type MatchData = {
  id: string;
  status: string;
  reasons: Reason[];
  a2a: A2AData | null;
  note: string | null;
};

type SeedData = {
  id: string;
  title: string;
  what: string;
  whenText: string;
  whereText: string;
  groupSize: string;
  requirements: { must: string[]; flexible: string[] };
  tags: string[];
  status: string;
};

type OwnerData = {
  name: string;
  emoji: string;
  color: string;
  grade: string | null;
  major: string | null;
  bio: string | null;
};

type InviteResponse = {
  match: MatchData;
  seed: SeedData;
  owner: OwnerData;
};

type RespondResult = { ok: boolean };

// ── Helpers ────────────────────────────────────────────────────────────────────

function reasonIcon(type: string): string {
  const icons: Record<string, string> = {
    time: "📅",
    place: "📍",
    interest: "✨",
    experience: "🎯",
  };
  return icons[type] ?? "·";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InfoRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-px text-sm leading-none">{icon}</span>
      <span
        className="text-sm leading-snug"
        style={{ color: "var(--color-ink)" }}
      >
        {text}
      </span>
    </div>
  );
}

function A2ATurnBubble({ turn }: { turn: A2ATurn }) {
  const isOwner = turn.agent === "owner";
  return (
    <div className={`flex ${isOwner ? "justify-start" : "justify-end"}`}>
      <div
        className="max-w-[80%] rounded-xl px-3 py-2 text-[13px]"
        style={{
          borderRadius: isOwner
            ? "4px 14px 14px 14px"
            : "14px 4px 14px 14px",
          background: isOwner
            ? "var(--color-mint)"
            : "var(--color-btn-secondary)",
          color: isOwner ? "var(--color-olive)" : "var(--color-ink-2)",
        }}
      >
        <p
          className="mb-0.5 text-[10px] font-medium"
          style={{ opacity: 0.6 }}
        >
          {isOwner ? "发起人 Agent" : "你的 Agent"}
        </p>
        <p className="leading-relaxed">{turn.text}</p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InvitePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data, mutate } = useSWR<InviteResponse>(
    `/api/invites/${id}`,
    fetcher,
    { refreshInterval: 4000 }
  );

  const [a2aOpen, setA2aOpen] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [responding, setResponding] = useState(false);

  async function respond(interested: boolean, note?: string) {
    if (responding) return;
    setResponding(true);
    try {
      const res = await fetch(`/api/invites/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interested, note: note ?? null }),
      });
      if (!res.ok) throw new Error("failed");
      await res.json() as RespondResult;
      await mutate();
      setShowNote(false);
    } catch {
      // silent – SWR will refetch
    } finally {
      setResponding(false);
    }
  }

  if (!data) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-5">
        <p className="text-sm" style={{ color: "var(--color-ink-3)" }}>
          加载中…
        </p>
      </main>
    );
  }

  // API 返回错误对象时（种子已关闭/不存在等），优雅降级
  if (!data.seed || !data.match || !data.owner) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
        <span className="text-4xl">🌿</span>
        <p className="text-sm" style={{ color: "var(--color-ink-2)" }}>
          这颗种子暂时看不到了
        </p>
        <button
          onClick={() => router.back()}
          className="btn-secondary px-6 py-2.5 text-sm"
        >
          返回
        </button>
      </main>
    );
  }

  const { match, seed, owner } = data;
  const isPending = match.status === "delivered";

  return (
    <main className="min-h-dvh pb-32">
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
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors"
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
      </header>

      <div className="space-y-4 px-5 pt-4">
        {/* ── 行动信息卡 ── */}
        <div className="card p-5">
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

          {/* 时间/地点 — 不得用浅色（Spec 2.3 & 4.5） */}
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

        {/* ── 发起人有限资料（Spec 4.5 / 3.4 EventProfileCard） ── */}
        <div className="card p-4">
          <p
            className="mb-3 text-xs font-semibold tracking-wide"
            style={{ color: "var(--color-ink-3)" }}
          >
            发起人
          </p>
          <div className="flex items-start gap-3">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl"
              style={{ background: owner.color }}
            >
              {owner.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex items-center gap-2">
                <p
                  className="font-semibold"
                  style={{ color: "var(--color-ink)" }}
                >
                  {owner.name}
                </p>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{
                    background: "var(--color-mint)",
                    color: "var(--color-olive)",
                  }}
                >
                  校园认证
                </span>
              </div>
              {(owner.grade || owner.major) && (
                <p className="mb-1 text-xs" style={{ color: "var(--color-ink-3)" }}>
                  {[owner.grade, owner.major].filter(Boolean).join(" · ")}
                </p>
              )}
              {/* 与本次事件有关的相关经验 */}
              {owner.bio && (
                <p
                  className="text-sm leading-snug"
                  style={{ color: "var(--color-ink-2)" }}
                >
                  {owner.bio}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── AI 匹配理由（可读句子，Spec 4.5 & 2.6） ── */}
        {match.reasons.length > 0 && (
          <div
            className="rounded-[var(--radius-md)] px-4 py-3"
            style={{ background: "var(--color-agent)" }}
          >
            <p
              className="mb-2 text-xs font-semibold"
              style={{ color: "var(--color-ink-3)" }}
            >
              小叶觉得你们挺合适
            </p>
            <div className="flex flex-col gap-1.5">
              {match.reasons.map((r, i) => (
                <p
                  key={i}
                  className="text-sm leading-snug"
                  style={{ color: "var(--color-ink-2)" }}
                >
                  {reasonIcon(r.type)} {r.text}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* ── A2A 折叠区（Spec 4.8：标注"以下是两位 Agent 在匹配过程中的交流"） ── */}
        {match.a2a && (
          <div>
            <button
              onClick={() => setA2aOpen(!a2aOpen)}
              className="flex w-full items-center justify-between rounded-[var(--radius-md)] px-4 py-3"
              style={{ background: "var(--color-sky)" }}
            >
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--color-ink-2)" }}
              >
                🐦 信使鸟聊过了（Agent 对话）
              </span>
              {a2aOpen ? (
                <ChevronUp
                  size={16}
                  className="shrink-0"
                  style={{ color: "var(--color-ink-3)" }}
                />
              ) : (
                <ChevronDown
                  size={16}
                  className="shrink-0"
                  style={{ color: "var(--color-ink-3)" }}
                />
              )}
            </button>

            {a2aOpen && (
              <div
                className="mt-2 space-y-3 rounded-[var(--radius-md)] border px-4 py-4"
                style={{ borderColor: "var(--color-card-border)" }}
              >
                {/* Spec 4.8：明确标注 */}
                <p
                  className="text-center text-[11px]"
                  style={{ color: "var(--color-ink-3)" }}
                >
                  以下是两位 Agent 在匹配过程中的交流
                </p>

                {match.a2a.turns.map((turn, i) => (
                  <A2ATurnBubble key={i} turn={turn} />
                ))}

                {match.a2a.commonalities.length > 0 && (
                  <div
                    className="border-t pt-3"
                    style={{ borderColor: "var(--color-card-border)" }}
                  >
                    <p
                      className="mb-2 text-xs"
                      style={{ color: "var(--color-ink-3)" }}
                    >
                      双方共同点
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {match.a2a.commonalities.map((c, i) => (
                        <span
                          key={i}
                          className="rounded-full px-2.5 py-0.5 text-xs"
                          style={{
                            background: "var(--color-mint)",
                            color: "var(--color-olive)",
                          }}
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── 状态区域 ── */}

        {/* delivered：待回应 */}
        {isPending && (
          <div className="space-y-3">
            {showNote ? (
              /* 留言 + 确认参与 */
              <div className="card space-y-3 p-4">
                <p
                  className="text-sm"
                  style={{ color: "var(--color-ink-2)" }}
                >
                  给发起人留一句话（可选）
                </p>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  /* 硬保护串 */
                  placeholder="比如：我周末通常下午才有空～"
                  rows={3}
                  className="w-full resize-none rounded-[var(--radius-sm)] border px-3 py-2.5 text-sm outline-none"
                  style={{
                    background: "var(--color-sky)",
                    borderColor: "var(--color-card-border)",
                    color: "var(--color-ink)",
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowNote(false)}
                    className="h-11 flex-1 rounded-[var(--radius-sm)] text-sm font-semibold"
                    style={{ color: "var(--color-ink-2)" }}
                  >
                    取消
                  </button>
                  <button
                    onClick={() =>
                      void respond(true, noteText.trim() || undefined)
                    }
                    disabled={responding}
                    className="btn-primary h-11 flex-1 text-sm disabled:opacity-50"
                  >
                    {responding ? "提交中…" : "确认参与"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* 愿意参与 → 硬保护串 */}
                <button
                  onClick={() => setShowNote(true)}
                  className="btn-primary h-12 w-full text-[15px]"
                >
                  愿意参与 🌱
                </button>
                {/* 暂不感兴趣 → Ghost（Spec 2.5） */}
                <button
                  onClick={() => void respond(false)}
                  disabled={responding}
                  className="h-11 w-full rounded-[var(--radius-sm)] text-sm font-semibold disabled:opacity-50"
                  style={{ color: "var(--color-ink-2)" }}
                >
                  暂不感兴趣
                </button>
              </>
            )}
          </div>
        )}

        {/* interested：已表达意向，等待发起人 */}
        {match.status === "interested" && (
          <div
            className="rounded-[var(--radius-md)] px-4 py-4 text-center"
            style={{ background: "var(--color-sky)" }}
          >
            {/* 硬保护串 */}
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--color-olive)" }}
            >
              🐦 已表达意向
            </p>
            <p
              className="mt-1 text-xs"
              style={{ color: "var(--color-ink-3)" }}
            >
              等待发起人确认，小叶会通知你
            </p>
            {match.note && (
              <div
                className="mt-3 rounded-[var(--radius-sm)] px-3 py-2 text-left"
                style={{ background: "rgba(232,240,225,0.6)" }}
              >
                <p
                  className="mb-0.5 text-[11px]"
                  style={{ color: "var(--color-ink-3)" }}
                >
                  你的留言
                </p>
                <p className="text-xs" style={{ color: "var(--color-ink-2)" }}>
                  {match.note}
                </p>
              </div>
            )}
          </div>
        )}

        {/* chosen：已成局 */}
        {match.status === "chosen" && (
          <div
            className="space-y-3 rounded-[var(--radius-md)] px-4 py-5 text-center"
            style={{ background: "var(--color-mint)" }}
          >
            <p className="text-xl">🎉</p>
            <p
              className="font-semibold"
              style={{ color: "var(--color-olive)" }}
            >
              已成局！
            </p>
            <p className="text-sm" style={{ color: "var(--color-ink-2)" }}>
              发起人选择了你，去行动房间打个招呼吧
            </p>
            <Link
              href="/actions"
              className="btn-primary mt-2 inline-flex h-11 items-center justify-center px-8 text-sm"
            >
              进入行动中
            </Link>
          </div>
        )}

        {/* closed：种子已找到同行者（Spec 4.6 通知文案） */}
        {match.status === "closed" && (
          <div
            className="rounded-[var(--radius-md)] px-4 py-5 text-center"
            style={{ background: "var(--color-sky)" }}
          >
            <p
              className="mb-1 text-xs font-semibold"
              style={{ color: "var(--color-ink-3)" }}
            >
              种子已找到同行者
            </p>
            <p
              className="font-kai text-sm leading-relaxed"
              style={{ color: "var(--color-ink-2)" }}
            >
              这颗种子已经找到了同行者。感谢你的回应，小叶会继续帮你寻找相似的行动。
            </p>
          </div>
        )}

        {/* declined：已婉拒 */}
        {match.status === "declined" && (
          <div
            className="rounded-[var(--radius-md)] px-4 py-3 text-center"
            style={{ background: "var(--color-sky)" }}
          >
            <p className="text-sm" style={{ color: "var(--color-ink-3)" }}>
              你已婉拒了这颗种子
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
