"use client";

import useSWR from "swr";
import Link from "next/link";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

const stageLabel: Record<string, string> = {
  sprout: "🌱 发芽 · 破冰中",
  leafing: "🌿 长叶 · 讨论中",
  growing: "🪴 生长 · 敲定计划",
  bud: "🌷 花苞 · 已约好",
  bloom: "🌸 开花 · 已完成",
};

export default function ActionsPage() {
  const { data } = useSWR("/api/rooms", fetcher, { refreshInterval: 4000 });
  const rooms: {
    id: string;
    title: string;
    stage: string;
    otherName: string;
    otherEmoji: string;
    lastMessage: string | null;
  }[] = data?.rooms ?? [];

  return (
    <main className="min-h-dvh px-5 pt-5">
      <h1 className="text-2xl font-bold text-olive">行动中</h1>
      <p className="mt-1 text-sm text-ink-3">正在生长的共同行动</p>

      {rooms.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <span className="text-5xl">🌱</span>
          <p className="font-kai text-ink-2">
            还没有进行中的行动，
            <br />
            去种一颗种子，或看看信箱里的邀请吧
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {rooms.map((r) => (
            <Link key={r.id} href={`/room/${r.id}`} className="card flex flex-col gap-1 p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink">{r.title}</span>
                <span className="rounded-full bg-mint px-2 py-0.5 text-[11px] text-olive">
                  {stageLabel[r.stage] ?? r.stage}
                </span>
              </div>
              <span className="text-xs text-ink-3">
                和 {r.otherEmoji} {r.otherName} 一起
              </span>
              {r.lastMessage && (
                <span className="line-clamp-1 text-xs text-ink-2">{r.lastMessage}</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
