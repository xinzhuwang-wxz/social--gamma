"use client";

import useSWR from "swr";
import Link from "next/link";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function ForestPage() {
  const { data } = useSWR("/api/forest", fetcher, { refreshInterval: 8000 });
  const memories: {
    id: string;
    title: string;
    summary: string | null;
    withName: string;
    withEmoji: string;
    date: string;
  }[] = data?.memories ?? [];

  return (
    <main className="min-h-dvh px-5 pt-5">
      <h1 className="text-2xl font-bold text-olive">回忆森林</h1>
      <p className="mt-1 text-sm text-ink-3">真实发生过的共同经历</p>

      {memories.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <span className="text-5xl">🌳</span>
          <p className="font-kai text-ink-2">
            森林还在等待第一棵开花的植物，
            <br />
            完成一次共同行动，它就会在这里生根
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {memories.map((m) => (
            <Link key={m.id} href={`/memory/${m.id}`} className="card flex flex-col gap-1 p-4">
              <span className="text-3xl">🌸</span>
              <span className="font-kai text-lg font-semibold text-ink">{m.title}</span>
              {m.summary && <span className="text-sm text-ink-2">{m.summary}</span>}
              <span className="text-xs text-ink-3">
                和 {m.withEmoji} {m.withName} · {m.date}
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
