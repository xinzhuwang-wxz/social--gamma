"use client";

import useSWR from "swr";
import Link from "next/link";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function MailboxPage() {
  const { data } = useSWR("/api/mailbox", fetcher, { refreshInterval: 4000 });
  const items: {
    id: string;
    seedTitle: string;
    whenText: string;
    whereText: string;
    groupSize: string;
    ownerName: string;
    ownerEmoji: string;
    status: string;
    unread: boolean;
  }[] = data?.items ?? [];

  return (
    <main className="min-h-dvh px-5 pt-5">
      <h1 className="text-2xl font-bold text-olive">信箱</h1>
      <p className="mt-1 text-sm text-ink-3">信使鸟带回来的种子</p>

      {items.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <span className="text-5xl">📮</span>
          <p className="font-kai text-ink-2">
            信箱空空的，
            <br />
            信使鸟正在为你留意合适的种子
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {items.map((m) => (
            <Link key={m.id} href={`/invite/${m.id}`} className="card relative flex flex-col gap-1 p-4">
              {m.unread && m.status === "delivered" && (
                <span className="absolute right-3 top-3 rounded-full bg-mint px-2 py-0.5 text-[11px] text-olive">
                  新的邀请
                </span>
              )}
              <span className="font-semibold text-ink">{m.seedTitle}</span>
              <span className="text-xs text-ink-2">
                📅 {m.whenText} · 👥 {m.groupSize}
              </span>
              <span className="text-xs text-ink-2">📍 {m.whereText}</span>
              <span className="mt-1 text-xs text-ink-3">
                {m.ownerEmoji} {m.ownerName} 发起
                {m.status === "interested" && " · 已表达意向"}
                {m.status === "declined" && " · 已婉拒"}
                {m.status === "chosen" && " · 已成局 🎉"}
                {m.status === "closed" && " · 种子已找到同行者"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
