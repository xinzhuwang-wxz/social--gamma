"use client";

import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

type Seed = {
  id: string;
  title: string;
  what: string;
  whenText: string;
  whereText: string;
  groupSize: string;
  tags: string[];
  status: string;
  createdAt: string | number;
};

type SeedsResponse = { seeds: Seed[] };

const STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  matching: "匹配中",
  delivered: "已投递",
  formed: "已成局",
  closed: "已关闭",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-sky text-ink-3",
  matching: "bg-mint text-olive",
  delivered: "bg-mint text-olive",
  formed: "bg-primary text-primary-foreground",
  closed: "bg-sky text-ink-4",
};

function formatDate(createdAt: string | number): string {
  try {
    return new Date(createdAt).toLocaleDateString("zh-CN", {
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export default function MySeedsPage() {
  const router = useRouter();
  const { data } = useSWR<SeedsResponse>("/api/seeds", fetcher, {
    refreshInterval: 5000,
  });

  const seeds: Seed[] = data?.seeds ?? [];

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
        <span className="font-semibold text-ink">我发布的种子</span>
      </header>

      <div className="px-5 pb-8 pt-4">
        {!data && (
          <div className="mt-16 flex justify-center">
            <p className="text-sm text-ink-3">加载中…</p>
          </div>
        )}

        {data && seeds.length === 0 && (
          <div className="mt-20 flex flex-col items-center gap-3 text-center">
            <span className="text-5xl">🌱</span>
            <p className="font-kai text-ink-2">
              还没有种下过种子，
              <br />
              去种一颗吧
            </p>
            <button
              onClick={() => router.push("/seed/new")}
              className="btn-primary mt-2 h-11 px-8 text-sm"
            >
              种下第一颗种子
            </button>
          </div>
        )}

        {seeds.length > 0 && (
          <div className="flex flex-col gap-3">
            {seeds.map((seed) => {
              const statusLabel = STATUS_LABELS[seed.status] ?? seed.status;
              const statusColor =
                STATUS_COLORS[seed.status] ?? "bg-sky text-ink-3";

              return (
                <Link
                  key={seed.id}
                  href={`/seed/${seed.id}`}
                  className="card flex flex-col gap-2 p-4 active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex items-center gap-1.5 font-semibold text-ink">
                      <span className="text-base">🌱</span>
                      {seed.title}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusColor}`}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  <p className="line-clamp-2 text-xs text-ink-2 leading-relaxed">
                    {seed.what}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-ink-3">
                    <span>📅 {seed.whenText}</span>
                    <span>📍 {seed.whereText}</span>
                  </div>

                  {seed.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {seed.tags.map((t, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-mint px-2 py-0.5 text-[11px] text-olive"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-[11px] text-ink-4">
                    {formatDate(seed.createdAt)} 发布
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
