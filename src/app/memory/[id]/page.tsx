"use client";

import { use, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MemoryData {
  memory: {
    id: string;
    title: string;
    summary: string | null;
    date: string;
    imageUrl: string | null;
  };
  seed: {
    whenText: string;
    whereText: string;
    tags: string[];
  };
  other: {
    name: string | null;
    emoji: string | null;
    color: string | null;
  };
  myText: string | null;
  roomId: string;
}

const fetcher = (u: string) => fetch(u).then((r) => r.json());

// ── Component ─────────────────────────────────────────────────────────────────

export default function MemoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data } = useSWR<MemoryData>(`/api/memories/${id}`, fetcher, {
    // 当插画还未生成时轮询（每 5 秒），有图后停止
    refreshInterval: (latest) =>
      latest && !latest.memory.imageUrl ? 5000 : 0,
  });

  // Reseed form state
  const [reseedOpen, setReseedOpen] = useState(false);
  const [whenText, setWhenText] = useState("");
  const [whereText, setWhereText] = useState("");
  const [reseeding, setReseeding] = useState(false);
  const [reseedDone, setReseedDone] = useState(false);

  const handleReseed = async () => {
    if (!whenText.trim() || reseeding) return;
    setReseeding(true);
    try {
      const res = await fetch(`/api/memories/${id}/reseed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whenText: whenText.trim(),
          ...(whereText.trim() ? { whereText: whereText.trim() } : {}),
        }),
      });
      const json = await res.json() as { ok?: boolean; seedId?: string };
      if (json.ok && json.seedId) {
        setReseedDone(true);
        setTimeout(() => {
          router.push(`/seed/${json.seedId}`);
        }, 1800);
      }
    } finally {
      setReseeding(false);
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

  const { memory, seed, other, myText } = data;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-dvh px-5 pt-6 pb-16"
      style={{ background: "var(--color-paper)" }}
    >
      {/* Back link */}
      <Link
        href="/actions"
        className="inline-flex items-center gap-1.5 text-sm mb-6"
        style={{ color: "var(--color-ink-3)" }}
      >
        <svg
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
        行动记录
      </Link>

      {/* Illustration or flower emoji */}
      {memory.imageUrl ? (
        <div className="mb-4 overflow-hidden rounded-lg" style={{ animation: "fadeIn 0.6s ease" }}>
          <img
            src={memory.imageUrl}
            alt={memory.title}
            className="w-full object-cover rounded-lg"
            style={{ maxHeight: "320px", objectFit: "cover" }}
          />
        </div>
      ) : (
        <div className="text-center mb-4">
          <span className="text-6xl">🌸</span>
          <p className="text-xs mt-2" style={{ color: "var(--color-ink-3)" }}>
            插画正在生成…
          </p>
        </div>
      )}

      {/* Title */}
      <h1
        className="font-kai text-2xl text-center mb-2"
        style={{ color: "var(--color-olive)" }}
      >
        {memory.title}
      </h1>

      {/* With who + date */}
      <p className="text-center text-sm mb-6" style={{ color: "var(--color-ink-3)" }}>
        和{" "}
        <span className="font-medium" style={{ color: "var(--color-ink-2)" }}>
          {other.emoji ?? ""} {other.name ?? "对方"}
        </span>
        {" "}·{" "}{memory.date}
      </p>

      {/* AI summary */}
      {memory.summary && (
        <div className="card px-4 py-3 mb-4">
          <p
            className="font-kai text-sm leading-relaxed"
            style={{ color: "var(--color-ink-2)" }}
          >
            {memory.summary}
          </p>
        </div>
      )}

      {/* My text record */}
      {myText && (
        <div className="card px-4 py-3 mb-4">
          <p className="text-xs mb-1.5" style={{ color: "var(--color-ink-3)" }}>
            我的记录
          </p>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--color-ink-2)" }}
          >
            {myText}
          </p>
        </div>
      )}

      {/* Seed tags */}
      {(seed.whenText || seed.whereText || seed.tags?.length > 0) && (
        <div className="flex flex-wrap gap-2 mb-8">
          {seed.whenText && (
            <span
              className="rounded-full px-3 py-1 text-xs"
              style={{
                background: "var(--color-mint)",
                color: "var(--color-olive)",
              }}
            >
              {seed.whenText}
            </span>
          )}
          {seed.whereText && (
            <span
              className="rounded-full px-3 py-1 text-xs"
              style={{
                background: "var(--color-mint)",
                color: "var(--color-olive)",
              }}
            >
              {seed.whereText}
            </span>
          )}
          {seed.tags?.map((t, i) => (
            <span
              key={i}
              className="rounded-full px-3 py-1 text-xs"
              style={{
                background: "var(--color-btn-secondary)",
                color: "var(--color-olive)",
                border: "1px solid var(--color-btn-secondary-border)",
              }}
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Reseed button */}
      {!reseedOpen && !reseedDone && (
        <button
          onClick={() => setReseedOpen(true)}
          className="btn-secondary w-full py-3 text-base"
        >
          🌱 让它结出一颗新种子
        </button>
      )}

      {/* Reseed done */}
      {reseedDone && (
        <div className="text-center py-6">
          <span className="text-4xl block mb-3">🌱</span>
          <p className="font-kai text-base" style={{ color: "var(--color-ink-2)" }}>
            种子已寄给对方，等待 TA 的回应
          </p>
        </div>
      )}

      {/* Reseed modal (bottom sheet) */}
      {reseedOpen && !reseedDone && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ maxWidth: "480px", margin: "0 auto" }}>
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ background: "rgba(51, 53, 36, 0.3)" }}
            onClick={() => setReseedOpen(false)}
          />
          {/* Sheet */}
          <div
            className="relative px-5 pt-5 pb-8"
            style={{
              background: "var(--color-paper)",
              borderRadius: "var(--radius-sheet) var(--radius-sheet) 0 0",
              boxShadow: "var(--shadow-sheet)",
            }}
          >
            {/* Handle */}
            <div
              className="w-10 h-1 rounded-full mx-auto mb-4"
              style={{ background: "var(--color-ink-4)" }}
            />
            <h3
              className="font-kai text-lg mb-4"
              style={{ color: "var(--color-olive)" }}
            >
              再约一次
            </h3>
            <div className="mb-3">
              <label
                className="block text-xs mb-1.5"
                style={{ color: "var(--color-ink-3)" }}
              >
                新的时间 *
              </label>
              <input
                type="text"
                value={whenText}
                onChange={(e) => setWhenText(e.target.value)}
                placeholder="例：下周六下午"
                autoFocus
                className="w-full rounded-[var(--radius-sm)] px-3 py-2.5 text-sm focus:outline-none"
                style={{
                  border: "1px solid var(--color-card-border)",
                  background: "var(--color-card)",
                  color: "var(--color-ink)",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = "var(--color-primary)")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "var(--color-card-border)")
                }
              />
            </div>
            <div className="mb-5">
              <label
                className="block text-xs mb-1.5"
                style={{ color: "var(--color-ink-3)" }}
              >
                地点（可选，不填则继承上次）
              </label>
              <input
                type="text"
                value={whereText}
                onChange={(e) => setWhereText(e.target.value)}
                placeholder="新地点或留空"
                className="w-full rounded-[var(--radius-sm)] px-3 py-2.5 text-sm focus:outline-none"
                style={{
                  border: "1px solid var(--color-card-border)",
                  background: "var(--color-card)",
                  color: "var(--color-ink)",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = "var(--color-primary)")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "var(--color-card-border)")
                }
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setReseedOpen(false)}
                className="btn-secondary flex-1 py-3 text-sm"
              >
                取消
              </button>
              <button
                onClick={handleReseed}
                disabled={!whenText.trim() || reseeding}
                className="btn-primary flex-1 py-3 text-sm"
              >
                {reseeding ? "种下中…" : "种下新种子"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
