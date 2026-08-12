"use client";

import useSWR from "swr";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronDown, ChevronUp } from "lucide-react";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

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

function reasonIcon(type: string): string {
  const icons: Record<string, string> = {
    time: "📅",
    place: "📍",
    interest: "✨",
    experience: "🎯",
  };
  return icons[type] ?? "·";
}

export default function InvitePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data, mutate } = useSWR<InviteResponse>(`/api/invites/${id}`, fetcher, {
    refreshInterval: 4000,
  });

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
        <p className="text-sm text-ink-3">加载中…</p>
      </main>
    );
  }

  const { match, seed, owner } = data;

  return (
    <main className="min-h-dvh pb-32">
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
        <span className="font-semibold text-ink">种子邀请</span>
      </header>

      <div className="px-5 pt-4 space-y-4">
        {/* Seed card */}
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-2xl">🌱</span>
            <h1 className="text-lg font-semibold text-olive">{seed.title}</h1>
          </div>

          <p className="mb-3 text-sm leading-relaxed text-ink">{seed.what}</p>

          <div className="mb-3 flex flex-col gap-1.5">
            <InfoRow icon="📅" text={seed.whenText} />
            <InfoRow icon="📍" text={seed.whereText} />
            <InfoRow icon="👥" text={seed.groupSize} />
          </div>

          {seed.requirements.must.length > 0 && (
            <div className="mb-2">
              <p className="mb-1 text-xs text-ink-3">必要条件</p>
              {seed.requirements.must.map((r, i) => (
                <p key={i} className="text-xs text-ink-2">
                  · {r}
                </p>
              ))}
            </div>
          )}

          {seed.requirements.flexible.length > 0 && (
            <div className="mb-3">
              <p className="mb-1 text-xs text-ink-3">可以商量</p>
              {seed.requirements.flexible.map((r, i) => (
                <p key={i} className="text-xs text-ink-2">
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
                  className="rounded-full bg-mint px-2.5 py-0.5 text-xs text-olive"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Owner profile (limited) */}
        <div className="card flex items-center gap-3 p-4">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl"
            style={{ background: owner.color }}
          >
            {owner.emoji}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-ink">{owner.name}</p>
            <p className="text-xs text-ink-3">
              {owner.grade}
              {owner.grade && owner.major ? " · " : ""}
              {owner.major}
            </p>
            {owner.bio && (
              <p className="mt-1 text-sm text-ink-2 leading-snug">{owner.bio}</p>
            )}
          </div>
        </div>

        {/* Match reasons */}
        {match.reasons.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">小绿觉得你们挺合适</p>
            <div className="flex flex-wrap gap-2">
              {match.reasons.map((r, i) => (
                <span
                  key={i}
                  className="rounded-full bg-mint px-3 py-1 text-xs text-olive"
                >
                  {reasonIcon(r.type)} {r.text}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* A2A conversation collapsible */}
        {match.a2a && (
          <div>
            <button
              onClick={() => setA2aOpen(!a2aOpen)}
              className="flex w-full items-center justify-between rounded-[var(--radius-md)] bg-sky px-4 py-3"
            >
              <span className="text-sm font-semibold text-ink-2">
                🐦 你们的信使鸟聊过了（Agent 对话）
              </span>
              {a2aOpen ? (
                <ChevronUp size={16} className="shrink-0 text-ink-3" />
              ) : (
                <ChevronDown size={16} className="shrink-0 text-ink-3" />
              )}
            </button>

            {a2aOpen && (
              <div
                className="mt-2 rounded-[var(--radius-md)] border px-4 py-4 space-y-3"
                style={{ borderColor: "var(--color-card-border)" }}
              >
                <p className="text-[11px] text-ink-3 text-center">
                  以下内容由双方 AI Agent 生成，不代表本人承诺
                </p>

                {match.a2a.turns.map((turn, i) => (
                  <A2ATurnBubble key={i} turn={turn} />
                ))}

                {match.a2a.commonalities.length > 0 && (
                  <div
                    className="border-t pt-3"
                    style={{ borderColor: "var(--color-card-border)" }}
                  >
                    <p className="mb-2 text-xs text-ink-3">双方共同点</p>
                    <div className="flex flex-wrap gap-1.5">
                      {match.a2a.commonalities.map((c, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-mint px-2.5 py-0.5 text-xs text-olive"
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

        {/* Status-based bottom area */}
        {match.status === "delivered" && (
          <div className="space-y-3">
            {/* Candidate's existing note if responded */}
            {showNote ? (
              <div className="card p-4 space-y-3">
                <p className="text-sm text-ink-2">给发起人留一句话（可选）</p>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="比如：我周末通常下午才有空～"
                  rows={3}
                  className="w-full resize-none rounded-[var(--radius-sm)] border bg-sky px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-4 focus:border-primary"
                  style={{ borderColor: "var(--color-card-border)" }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowNote(false)}
                    className="btn-secondary h-11 flex-1 text-sm"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => void respond(true, noteText.trim() || undefined)}
                    disabled={responding}
                    className="btn-primary h-11 flex-1 text-sm disabled:opacity-50"
                  >
                    {responding ? "提交中…" : "确认参与"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setShowNote(true)}
                  className="btn-primary h-12 w-full text-[15px]"
                >
                  愿意参与 🌱
                </button>
                <button
                  onClick={() => void respond(false)}
                  disabled={responding}
                  className="btn-secondary h-11 w-full text-sm"
                >
                  暂不感兴趣
                </button>
              </>
            )}
          </div>
        )}

        {match.status === "interested" && (
          <div className="rounded-[var(--radius-md)] bg-sky px-4 py-4 text-center">
            <p className="text-sm font-semibold text-olive">🐦 已表达意向</p>
            <p className="mt-1 text-xs text-ink-3">等待发起人确认，小绿会通知你</p>
            {match.note && (
              <div className="mt-3 rounded-[var(--radius-sm)] bg-mint/60 px-3 py-2 text-left">
                <p className="text-[11px] text-ink-3 mb-0.5">你的留言</p>
                <p className="text-xs text-ink-2">{match.note}</p>
              </div>
            )}
          </div>
        )}

        {match.status === "chosen" && (
          <div className="rounded-[var(--radius-md)] bg-mint px-4 py-5 text-center space-y-3">
            <p className="text-xl">🎉</p>
            <p className="font-semibold text-olive">已成局！</p>
            <p className="text-sm text-ink-2">发起人选择了你，去行动房间打个招呼吧</p>
            <Link
              href="/actions"
              className="btn-primary mt-2 inline-flex h-11 items-center justify-center px-8 text-sm"
            >
              进入行动中
            </Link>
          </div>
        )}

        {match.status === "closed" && (
          <div className="rounded-[var(--radius-md)] bg-sky px-4 py-5 text-center">
            <p className="font-kai text-sm text-ink-2">
              这颗种子已经找到同行者，下次早点遇见 🌱
            </p>
          </div>
        )}

        {match.status === "declined" && (
          <div className="rounded-[var(--radius-md)] bg-sky px-4 py-3 text-center">
            <p className="text-sm text-ink-3">你已婉拒了这颗种子</p>
          </div>
        )}
      </div>
    </main>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function A2ATurnBubble({ turn }: { turn: A2ATurn }) {
  const isOwner = turn.agent === "owner";
  return (
    <div className={`flex ${isOwner ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${
          isOwner
            ? "rounded-tl-sm bg-mint text-olive"
            : "rounded-tr-sm bg-btn-secondary text-ink-2"
        }`}
      >
        <p className="mb-0.5 text-[10px] opacity-60">
          {isOwner ? "发起人 Agent" : "你的 Agent"}
        </p>
        <p className="leading-relaxed">{turn.text}</p>
      </div>
    </div>
  );
}

function InfoRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">{icon}</span>
      <span className="text-sm text-ink-2">{text}</span>
    </div>
  );
}
