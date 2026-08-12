"use client";

import useSWR from "swr";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ArrowRight } from "lucide-react";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

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

const STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  matching: "匹配中",
  delivered: "已投递",
  formed: "已成局",
  closed: "已关闭",
};

function reasonIcon(type: string): string {
  const icons: Record<string, string> = {
    time: "📅",
    place: "📍",
    interest: "✨",
    experience: "🎯",
  };
  return icons[type] ?? "·";
}

export default function SeedDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data } = useSWR<SeedDetailResponse>(`/api/seeds/${id}`, fetcher, {
    refreshInterval: 3000,
  });

  const [choosingId, setChoosingId] = useState<string | null>(null);

  const seed = data?.seed;
  const intents: Intent[] = data?.intents ?? [];
  const roomId = data?.roomId ?? null;
  const isOwner = data?.isOwner ?? false;

  async function choose(matchId: string) {
    if (choosingId) return;
    setChoosingId(matchId);
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

  if (!data) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-5">
        <p className="text-sm text-ink-3">加载中…</p>
      </main>
    );
  }

  if (!seed) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-5">
        <p className="text-sm text-ink-3">种子不见了</p>
      </main>
    );
  }

  return (
    <main className="min-h-dvh">
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
        <span className="flex-1 truncate font-semibold text-ink">{seed.title}</span>
        <span className="shrink-0 rounded-full bg-mint px-2.5 py-0.5 text-xs text-olive">
          {STATUS_LABELS[seed.status] ?? seed.status}
        </span>
      </header>

      <div className="px-5 pb-10 pt-4">
        {/* Room entry banner */}
        {roomId && (
          <Link
            href={`/room/${roomId}`}
            className="mb-4 flex items-center justify-between rounded-[var(--radius-md)] bg-mint px-4 py-3"
          >
            <span className="text-sm font-semibold text-olive">已成局 🎉 进入行动房间</span>
            <ArrowRight size={18} className="text-olive" />
          </Link>
        )}

        {/* Seed card */}
        <div className="card mb-4 p-5">
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

        {/* Matching pulse */}
        {seed.status === "matching" && (
          <motion.div
            className="mb-4 flex items-center gap-3 rounded-[var(--radius-md)] bg-sky px-4 py-3"
            animate={{ opacity: [0.65, 1, 0.65] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="text-xl">🐦</span>
            <span className="text-sm text-ink-2">信使鸟正在寻找合适的同伴…</span>
          </motion.div>
        )}

        {seed.status === "delivered" && intents.length === 0 && (
          <div className="mb-4 rounded-[var(--radius-md)] bg-sky px-4 py-3">
            <p className="text-sm text-ink-2">🐦 种子已投递，等待同伴回应</p>
          </div>
        )}

        {/* Intent list (owner only) */}
        {isOwner && intents.length > 0 && (
          <div>
            <div className="mb-3 flex items-start justify-between gap-2">
              <h2 className="text-base font-semibold text-ink">有意向的同伴</h2>
              <p className="text-right text-xs text-ink-3 leading-snug">
                由你亲自选择同行者
                <br />
                小绿只做参谋
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {intents.map((intent) => (
                <IntentCard
                  key={intent.matchId}
                  intent={intent}
                  onChoose={choose}
                  choosing={choosingId === intent.matchId}
                  anyChoosing={!!choosingId}
                  reasonIcon={reasonIcon}
                />
              ))}
            </div>
          </div>
        )}

        {isOwner && intents.length === 0 && seed.status !== "matching" && (
          <div className="mt-10 text-center text-sm text-ink-3">
            还没有同伴表达意向
          </div>
        )}
      </div>
    </main>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function IntentCard({
  intent,
  onChoose,
  choosing,
  anyChoosing,
  reasonIcon: getIcon,
}: {
  intent: Intent;
  onChoose: (id: string) => void;
  choosing: boolean;
  anyChoosing: boolean;
  reasonIcon: (type: string) => string;
}) {
  const { candidate, reasons, note, status, matchId } = intent;

  return (
    <div className="card p-4">
      {/* Candidate header */}
      <div className="mb-3 flex items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl"
          style={{ background: candidate.color }}
        >
          {candidate.emoji}
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-ink">{candidate.name}</p>
          <p className="text-xs text-ink-3">
            {candidate.grade}
            {candidate.grade && candidate.major ? " · " : ""}
            {candidate.major}
          </p>
        </div>
      </div>

      {/* Bio */}
      {candidate.bio && (
        <p className="mb-3 text-sm leading-relaxed text-ink-2">{candidate.bio}</p>
      )}

      {/* Match reasons as pills */}
      {reasons.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {reasons.map((r, i) => (
            <span
              key={i}
              className="rounded-full bg-mint px-2.5 py-1 text-xs text-olive"
            >
              {getIcon(r.type)} {r.text}
            </span>
          ))}
        </div>
      )}

      {/* Optional note from candidate */}
      {note && (
        <div className="mb-3 rounded-[var(--radius-sm)] bg-sky px-3 py-2">
          <p className="mb-0.5 text-[11px] text-ink-3">留言</p>
          <p className="text-sm text-ink-2">{note}</p>
        </div>
      )}

      {/* Action area */}
      {status === "interested" && !choosing && (
        <button
          onClick={() => onChoose(matchId)}
          disabled={anyChoosing}
          className="btn-primary h-10 w-full text-sm disabled:opacity-50"
        >
          选择 TA 一起出发 🌱
        </button>
      )}

      {choosing && (
        <div className="flex h-10 items-center justify-center rounded-[var(--radius-lg)] bg-mint">
          <motion.span
            className="text-sm text-olive"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          >
            正在为你们布置行动房间…
          </motion.span>
        </div>
      )}

      {status === "delivered" && !choosing && (
        <p className="text-center text-xs text-ink-4">等待回应中</p>
      )}

      {status === "declined" && (
        <p className="text-center text-xs text-ink-4">暂不感兴趣</p>
      )}

      {status === "chosen" && (
        <p className="text-center text-xs font-semibold text-primary">已选择 ✓</p>
      )}

      {status === "closed" && (
        <p className="text-center text-xs text-ink-4">已关闭</p>
      )}
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
