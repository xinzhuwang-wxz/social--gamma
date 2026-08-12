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

/** 植物阶段 → 当前状态文案（Spec 4.7 / 3.1 映射） */
const STAGE_LABEL: Record<string, string> = {
  sprout: "刚刚成为搭子",
  leafing: "正在商量行动",
  growing: "敲定计划中",
  bud: "已经约好",
  bloom: "这次行动完成了",
};

const STAGE_EMOJI: Record<string, string> = {
  sprout: "🌱",
  leafing: "🌿",
  growing: "🪴",
  bud: "🌷",
  bloom: "🌸",
};

const VALID_STAGES: PlantStage[] = [
  "seed",
  "sprout",
  "leafing",
  "growing",
  "bud",
  "bloom",
];

function toPlantStage(s: string): PlantStage {
  return VALID_STAGES.includes(s as PlantStage) ? (s as PlantStage) : "sprout";
}

/** 进行中阶段集合 */
const ACTIVE_STAGES = new Set(["sprout", "leafing", "growing", "bud"]);

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <h2
      className="mb-2.5 text-sm font-semibold tracking-wide"
      style={{ color: "var(--color-ink-3)" }}
    >
      {title}
    </h2>
  );
}

function RoomCard({ room }: { room: Room }) {
  const plantStage = toPlantStage(room.stage);
  const stageLabel = STAGE_LABEL[room.stage] ?? room.stage;
  const stageEmoji = STAGE_EMOJI[room.stage] ?? "";
  const isCompleted = !ACTIVE_STAGES.has(room.stage);

  return (
    <Link href={`/room/${room.id}`} className="card flex items-center gap-3 p-4">
      {/* Plant illustration */}
      <div
        className="flex shrink-0 items-end justify-center rounded-full"
        style={{
          width: 56,
          height: 56,
          background: isCompleted
            ? "linear-gradient(135deg, #E8F0E1 60%, #DCE3AE40 100%)"
            : "linear-gradient(135deg, #DCE3AE 60%, #CCD56F40 100%)",
          paddingBottom: 2,
          opacity: isCompleted ? 0.8 : 1,
        }}
      >
        <Plant stage={plantStage} family={0} size={46} />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        {/* Event title */}
        <p
          className="mb-0.5 truncate font-semibold leading-snug"
          style={{ color: "var(--color-ink)" }}
        >
          {room.title}
        </p>

        {/* Partner */}
        <p className="mb-1.5 text-xs" style={{ color: "var(--color-ink-2)" }}>
          和 {room.otherEmoji} {room.otherName} 同行
        </p>

        {/* Stage pill */}
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{
            background: isCompleted
              ? "var(--color-sky)"
              : "var(--color-mint)",
            color: isCompleted
              ? "var(--color-ink-3)"
              : "var(--color-olive)",
          }}
        >
          {stageEmoji} {stageLabel}
        </span>

        {/* Last message */}
        {room.lastMessage && (
          <p
            className="mt-1.5 line-clamp-1 text-xs"
            style={{ color: "var(--color-ink-3)" }}
          >
            {room.lastMessage}
          </p>
        )}
      </div>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ActionsPage() {
  const { data } = useSWR("/api/rooms", fetcher, { refreshInterval: 4000 });
  const rooms: Room[] = data?.rooms ?? [];

  const activeRooms = rooms.filter((r) => ACTIVE_STAGES.has(r.stage));
  const completedRooms = rooms.filter((r) => !ACTIVE_STAGES.has(r.stage));

  return (
    <main className="min-h-dvh px-5 pt-5">
      <h1
        className="text-2xl font-bold"
        style={{ color: "var(--color-olive)" }}
      >
        行动中
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--color-ink-3)" }}>
        正在生长的共同行动
      </p>

      {rooms.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <span className="text-4xl">🌱</span>
          <p
            className="font-kai text-sm leading-relaxed"
            style={{ color: "var(--color-ink-2)" }}
          >
            还没有进行中的行动，
            <br />
            去种一颗种子，或看看信箱里的邀请吧
          </p>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-6 pb-24">
          {/* 进行中 */}
          {activeRooms.length > 0 && (
            <section>
              <SectionHeader title="进行中" />
              <div className="flex flex-col gap-3">
                {activeRooms.map((r) => (
                  <RoomCard key={r.id} room={r} />
                ))}
              </div>
            </section>
          )}

          {/* 已结束 */}
          {completedRooms.length > 0 && (
            <section>
              <SectionHeader title="已结束" />
              <div className="flex flex-col gap-3">
                {completedRooms.map((r) => (
                  <RoomCard key={r.id} room={r} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
