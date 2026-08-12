"use client";

import useSWR from "swr";
import Link from "next/link";
import { Bell } from "lucide-react";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

const stageText: Record<string, string> = {
  matching: "信使鸟正在送信",
  delivered: "已送达候选同伴",
  sprout: "刚刚发芽 · 去打个招呼",
  leafing: "正在长叶 · 聊得不错",
  growing: "快速生长 · 正在敲定计划",
  bud: "花苞待放 · 行动已约好",
  bloom: "已经开花 · 行动完成",
};

const stageEmoji: Record<string, string> = {
  matching: "🌰",
  delivered: "🌰",
  sprout: "🌱",
  leafing: "🌿",
  growing: "🪴",
  bud: "🌷",
  bloom: "🌸",
};

export function GardenView() {
  const { data } = useSWR("/api/garden", fetcher, { refreshInterval: 4000 });
  const plants: {
    kind: "seed" | "room";
    id: string;
    title: string;
    stage: string;
    href: string;
  }[] = data?.plants ?? [];

  return (
    <main className="min-h-dvh">
      {/* 顶栏 */}
      <header className="flex items-center justify-between px-5 pt-5">
        <h1 className="text-2xl font-bold text-olive">我的花园</h1>
        <Link href="/mailbox" aria-label="通知">
          <Bell size={22} className="text-ink-2" />
        </Link>
      </header>

      {/* 花园场景 */}
      <section className="mx-4 mt-4 overflow-hidden rounded-lg" style={{ background: "linear-gradient(#FBF4E3 0%, #D8DE83 30%, #CCD56F 100%)", minHeight: 300 }}>
        {plants.length === 0 ? (
          <div className="flex h-72 flex-col items-center justify-center gap-3 px-8 text-center">
            <span className="text-5xl">🐦</span>
            <p className="font-kai text-ink-2">
              你好呀，我是你的信使小绿。
              <br />
              花园还空着，点下方 + 种下第一颗种子吧！
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-4">
            {plants.map((p) => (
              <Link
                key={p.id}
                href={p.href}
                className="flex flex-col items-center gap-1 rounded-md p-3"
                style={{ border: "1.5px solid rgba(80,95,45,0.30)" }}
              >
                <span className="text-4xl">{stageEmoji[p.stage] ?? "🌱"}</span>
                <span className="text-sm font-semibold text-ink">{p.title}</span>
                <span className="text-[11px] text-ink-2">{stageText[p.stage] ?? p.stage}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
