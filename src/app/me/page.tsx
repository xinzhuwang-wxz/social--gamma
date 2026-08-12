"use client";

import useSWR from "swr";
import { useRouter } from "next/navigation";
import Link from "next/link";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function MePage() {
  const router = useRouter();
  const { data, mutate } = useSWR("/api/auth", fetcher);
  const me = data?.me;
  const personas: { id: string; name: string; emoji: string; color: string }[] =
    data?.personas ?? [];

  async function switchTo(userId: string) {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    await mutate();
    router.push("/garden");
    router.refresh();
  }

  return (
    <main className="min-h-dvh px-5 pt-5">
      <h1 className="text-2xl font-bold text-olive">我的</h1>

      {me && (
        <div className="card mt-4 flex items-center gap-3 p-4">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
            style={{ background: me.color }}
          >
            {me.emoji}
          </span>
          <div className="flex flex-col">
            <span className="font-semibold text-ink">{me.name}</span>
            <span className="text-xs text-ink-3">
              {me.grade} {me.major}
            </span>
            <span className="text-xs text-ink-2">{me.bio}</span>
          </div>
        </div>
      )}

      <Link href="/seed/mine" className="card mt-3 block p-4 text-sm text-ink">
        🌰 我发布的种子
      </Link>

      <div className="mt-6">
        <p className="mb-2 text-sm text-ink-3">游园会演示 · 快速切换身份</p>
        <div className="flex flex-wrap gap-2">
          {personas.map((p) => (
            <button
              key={p.id}
              onClick={() => switchTo(p.id)}
              disabled={me?.id === p.id}
              className="flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm disabled:opacity-40"
              style={{ borderColor: "var(--color-btn-secondary-border)", background: "var(--color-card)" }}
            >
              <span>{p.emoji}</span>
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
