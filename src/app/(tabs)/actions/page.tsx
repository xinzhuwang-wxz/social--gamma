"use client";

import useSWR from "swr";
import Link from "next/link";
import { Plant } from "@/components/world";
import type { PlantStage } from "@/components/world";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

// ── Types ──────────────────────────────────────────────────────────────────────

type Room = {
  id: string;
  title: string;
  stage: string;
  otherName: string;
  otherEmoji: string;
  lastMessage: string | null;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const STAGE_LABEL: Record<string, string> = {
  sprout: "🌱 发芽 · 破冰中",
  leafing: "🌿 长叶 · 讨论中",
  growing: "🪴 生长 · 敲定计划",
  bud: "🌷 花苞 · 已约好",
  bloom: "🌸 开花 · 已完成",
};

const VALID_STAGES: PlantStage[] = ["seed", "sprout", "leafing", "growing", "bud", "bloom"];

function toPlantStage(s: string): PlantStage {
  return VALID_STAGES.includes(s as PlantStage) ? (s as PlantStage) : "sprout";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RoomCard({ room }: { room: Room }) {
  const plantStage = toPlantStage(room.stage);
  const stageLabel = STAGE_LABEL[room.stage] ?? room.stage;

  return (
    <Link href={`/room/${room.id}`} className="card flex items-center gap-3 p-4">
      {/* Plant illustration */}
      <div
        className="flex shrink-0 items-end justify-center rounded-full"
        style={{
          width: 56,
          height: 56,
          background: "linear-gradient(135deg, #DCE3AE 60%, #CCD56F40 100%)",
          paddingBottom: 2,
        }}
      >
        <Plant stage={plantStage} family={0} size={46} />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="truncate font-semibold text-ink">{room.title}</span>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[11px]"
            style={{ background: "var(--color-mint)", color: "var(--color-olive)" }}
          >
            {stageLabel}
          </span>
        </div>
        <span className="text-xs text-ink-3">
          和 {room.otherEmoji} {room.otherName} 一起
        </span>
        {room.lastMessage && (
          <p className="mt-0.5 line-clamp-1 text-xs text-ink-2">{room.lastMessage}</p>
        )}
      </div>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ActionsPage() {
  const { data } = useSWR("/api/rooms", fetcher, { refreshInterval: 4000 });
  const rooms: Room[] = data?.rooms ?? [];

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
            <RoomCard key={r.id} room={r} />
          ))}
        </div>
      )}
    </main>
  );
}
