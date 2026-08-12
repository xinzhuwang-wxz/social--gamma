"use client";

import { useState } from "react";
import {
  CourierBird,
  Plant,
  GardenScene,
  MailboxIcon,
  SeedIllustration,
  SproutAnimation,
  BloomAnimation,
  FlyDelivery,
} from "@/components/world";
import type { BirdState, PlantStage, PlantFamily } from "@/components/world";

const BIRD_STATES: BirdState[] = ["idle", "thinking", "flying", "carrying", "happy"];
const PLANT_STAGES: PlantStage[] = ["seed", "sprout", "leafing", "growing", "bud", "bloom"];
const PLANT_FAMILIES: PlantFamily[] = [0, 1, 2];
const FAMILY_LABELS = ["野花", "郁金香", "向日葵"];
const STAGE_LABELS: Record<PlantStage, string> = {
  seed: "种子",
  sprout: "发芽",
  leafing: "展叶",
  growing: "生长",
  bud: "花苞",
  bloom: "开花",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-semibold mb-4" style={{ color: "#4D572E" }}>
      {children}
    </h2>
  );
}

function Card({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <div
      className="flex flex-col items-center gap-2 p-3 rounded-2xl"
      style={{
        background: "#FFF9EB",
        border: "1px solid rgba(86,84,59,0.12)",
        boxShadow: "0 4px 12px rgba(74,62,32,0.06)",
      }}
    >
      <div className="flex items-end justify-center" style={{ minHeight: 96 }}>
        {children}
      </div>
      {label && (
        <span className="text-xs font-medium" style={{ color: "#66664E" }}>
          {label}
        </span>
      )}
    </div>
  );
}

function StateButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
      style={{
        background: active ? "#89974B" : "#F4ECD7",
        color: active ? "#FFF9EA" : "#4D572E",
        border: active ? "none" : "1px solid #CAC0A3",
      }}
    >
      {children}
    </button>
  );
}

/* ════════════════════════════════════════
   Section: CourierBird
════════════════════════════════════════ */
function BirdSection() {
  const [activeState, setActiveState] = useState<BirdState>("idle");

  return (
    <section className="mb-10">
      <SectionTitle>信使鸟「小叶」— CourierBird</SectionTitle>
      {/* State switcher */}
      <div className="flex gap-2 flex-wrap mb-4">
        {BIRD_STATES.map((s) => (
          <StateButton key={s} active={activeState === s} onClick={() => setActiveState(s)}>
            {s}
          </StateButton>
        ))}
      </div>
      {/* All states preview */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {BIRD_STATES.map((s) => (
          <Card key={s} label={s}>
            <CourierBird state={s} size={72} />
          </Card>
        ))}
      </div>
      {/* Large active state */}
      <div className="mt-4 flex justify-center">
        <Card label={`当前状态: ${activeState}`}>
          <CourierBird state={activeState} size={120} />
        </Card>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════
   Section: Plant
════════════════════════════════════════ */
function PlantSection() {
  const [activeFamily, setActiveFamily] = useState<PlantFamily>(0);

  return (
    <section className="mb-10">
      <SectionTitle>植物 — Plant (6 阶段 × 3 科)</SectionTitle>
      <div className="flex gap-2 mb-4">
        {PLANT_FAMILIES.map((f) => (
          <StateButton key={f} active={activeFamily === f} onClick={() => setActiveFamily(f)}>
            {FAMILY_LABELS[f]}
          </StateButton>
        ))}
      </div>

      {/* Full matrix */}
      {PLANT_FAMILIES.map((family) => (
        <div key={family} className="mb-6">
          <p className="text-sm font-medium mb-2" style={{ color: "#89974B" }}>
            {FAMILY_LABELS[family]}（科 {family}）
          </p>
          <div className="grid grid-cols-6 gap-2">
            {PLANT_STAGES.map((stage) => (
              <Card key={stage} label={STAGE_LABELS[stage]}>
                <Plant stage={stage} family={family} size={52} />
              </Card>
            ))}
          </div>
        </div>
      ))}

      {/* Active family, large */}
      <p className="text-sm font-medium mb-2" style={{ color: "#89974B" }}>
        大尺寸预览 — {FAMILY_LABELS[activeFamily]}
      </p>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {PLANT_STAGES.map((stage) => (
          <Card key={stage} label={STAGE_LABELS[stage]}>
            <Plant stage={stage} family={activeFamily} size={72} />
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════
   Section: GardenScene
════════════════════════════════════════ */
function GardenSceneSection() {
  return (
    <section className="mb-10">
      <SectionTitle>花园场景 — GardenScene</SectionTitle>
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(86,84,59,0.12)" }}
      >
        <GardenScene height={300}>
          {/* Sample plant grid inside grass area */}
          <div className="flex gap-3 p-4 flex-wrap">
            {(["seed", "sprout", "leafing", "growing", "bud", "bloom"] as PlantStage[]).map(
              (s, i) => (
                <div
                  key={s}
                  className="rounded-2xl p-2 flex flex-col items-center gap-1"
                  style={{ border: "1.5px solid rgba(80,95,45,0.30)" }}
                >
                  <Plant stage={s} family={(i % 3) as PlantFamily} size={44} />
                  <span className="text-[10px]" style={{ color: "#4D572E" }}>
                    {STAGE_LABELS[s]}
                  </span>
                </div>
              ),
            )}
          </div>
        </GardenScene>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════
   Section: MailboxIcon + SeedIllustration
════════════════════════════════════════ */
function IconsSection() {
  const [mailHasNew, setMailHasNew] = useState(false);

  return (
    <section className="mb-10">
      <SectionTitle>图标组件</SectionTitle>
      <div className="flex gap-4 flex-wrap">
        {/* MailboxIcon */}
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs font-medium" style={{ color: "#66664E" }}>
            MailboxIcon
          </p>
          <div className="flex gap-4">
            <Card label="无新种子">
              <MailboxIcon hasNew={false} size={52} />
            </Card>
            <Card label="有新种子">
              <MailboxIcon hasNew={true} size={52} />
            </Card>
          </div>
          <button
            onClick={() => setMailHasNew((v) => !v)}
            className="px-4 py-1.5 rounded-full text-sm font-medium"
            style={{ background: "#89974B", color: "#FFF9EA" }}
          >
            切换 hasNew = {String(!mailHasNew)}
          </button>
          <div className="flex justify-center">
            <Card label={`hasNew=${mailHasNew}`}>
              <MailboxIcon hasNew={mailHasNew} size={64} />
            </Card>
          </div>
        </div>

        {/* SeedIllustration */}
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs font-medium" style={{ color: "#66664E" }}>
            SeedIllustration
          </p>
          <div className="flex gap-3 items-end">
            {[24, 32, 48, 64].map((s) => (
              <Card key={s} label={`${s}px`}>
                <SeedIllustration size={s} />
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════
   Section: Animation Components
════════════════════════════════════════ */
function AnimationsSection() {
  const [sproutKey, setSproutKey] = useState(0);
  const [bloomKey, setBloomKey] = useState(0);
  const [flyPlaying, setFlyPlaying] = useState(true);

  return (
    <section className="mb-10">
      <SectionTitle>动画组件</SectionTitle>

      {/* SproutAnimation */}
      <div className="mb-6">
        <p className="text-sm font-medium mb-3" style={{ color: "#89974B" }}>
          SproutAnimation（种子破土 800–1600ms）
        </p>
        <div className="flex gap-4 flex-wrap">
          {PLANT_FAMILIES.map((f) => (
            <div key={f} className="flex flex-col items-center gap-2">
              <Card label={FAMILY_LABELS[f]}>
                <SproutAnimation key={`sprout-${sproutKey}-${f}`} family={f} size={72} />
              </Card>
            </div>
          ))}
        </div>
        <button
          onClick={() => setSproutKey((k) => k + 1)}
          className="mt-3 px-4 py-1.5 rounded-full text-sm font-medium"
          style={{ background: "#F4ECD7", color: "#4D572E", border: "1px solid #CAC0A3" }}
        >
          重播 SproutAnimation
        </button>
      </div>

      {/* BloomAnimation */}
      <div className="mb-6">
        <p className="text-sm font-medium mb-3" style={{ color: "#89974B" }}>
          BloomAnimation（花苞绽放 800–1600ms）
        </p>
        <div className="flex gap-4 flex-wrap">
          {PLANT_FAMILIES.map((f) => (
            <div key={f} className="flex flex-col items-center gap-2">
              <Card label={FAMILY_LABELS[f]}>
                <BloomAnimation key={`bloom-${bloomKey}-${f}`} family={f} size={72} />
              </Card>
            </div>
          ))}
        </div>
        <button
          onClick={() => setBloomKey((k) => k + 1)}
          className="mt-3 px-4 py-1.5 rounded-full text-sm font-medium"
          style={{ background: "#F4ECD7", color: "#4D572E", border: "1px solid #CAC0A3" }}
        >
          重播 BloomAnimation
        </button>
      </div>

      {/* FlyDelivery */}
      <div className="mb-4">
        <p className="text-sm font-medium mb-3" style={{ color: "#89974B" }}>
          FlyDelivery（信使鸟送信 400–1000ms 循环）
        </p>
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "#FBF4E3",
            border: "1px solid rgba(86,84,59,0.12)",
          }}
        >
          <FlyDelivery playing={flyPlaying} size={72} duration={900} />
        </div>
        <button
          onClick={() => setFlyPlaying((v) => !v)}
          className="mt-3 px-4 py-1.5 rounded-full text-sm font-medium"
          style={{ background: "#89974B", color: "#FFF9EA" }}
        >
          {flyPlaying ? "暂停" : "播放"} FlyDelivery
        </button>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════
   Page Root
════════════════════════════════════════ */
export default function AssetsPreviewPage() {
  return (
    <main
      className="min-h-dvh px-4 py-8"
      style={{ background: "#F7F0DE", fontFamily: "var(--font-sans)" }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Page header */}
        <div className="mb-10">
          <h1
            className="text-2xl font-bold mb-1"
            style={{ color: "#4D572E" }}
          >
            S2 视觉资产库预览
          </h1>
          <p className="text-sm" style={{ color: "#66664E" }}>
            Issue #3 · 信使鸟 / 植物六阶段 / 花园场景 SVG 走查页
          </p>
          <div
            className="mt-3 h-px w-full"
            style={{ background: "rgba(86,84,59,0.12)" }}
          />
        </div>

        <BirdSection />
        <PlantSection />
        <GardenSceneSection />
        <IconsSection />
        <AnimationsSection />
      </div>
    </main>
  );
}
