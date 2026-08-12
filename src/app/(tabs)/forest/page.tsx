"use client";

import useSWR from "swr";
import Link from "next/link";
import { Plant } from "@/components/world";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

function familyOf(id: string): 0 | 1 | 2 {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 997;
  return (h % 3) as 0 | 1 | 2;
}

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
          <Plant stage="seed" family={1} size={72} />
          <p className="font-kai text-ink-2">
            森林还在等待第一棵开花的植物，
            <br />
            完成一次共同行动，它就会在这里生根
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3 pb-6">
          {memories.map((m) => (
            <Link key={m.id} href={`/memory/${m.id}`} className="card flex items-center gap-4 p-4">
              <div className="shrink-0 rounded-md bg-grass/30 p-1">
                <Plant stage="bloom" family={familyOf(m.id)} size={64} />
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="font-kai text-lg font-semibold text-ink">{m.title}</span>
                {m.summary && (
                  <span className="line-clamp-2 text-sm text-ink-2">{m.summary}</span>
                )}
                <span className="text-xs text-ink-3">
                  和 {m.withEmoji} {m.withName} · {m.date}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
