"use client";

import useSWR from "swr";
import Link from "next/link";
import { useState } from "react";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

/** 事件阶段 → 花朵资产（复用新前端 assets） */
function plantAsset(stage: string): string {
  switch (stage) {
    case "bloom":
      return "/world/flower-6.png";
    case "bud":
      return "/world/flower-2.png";
    case "growing":
      return "/world/flower-4.png";
    case "leafing":
    case "sprout":
      return "/world/tree.png";
    default:
      return "/world/tree.png";
  }
}
function memoryAsset(id: string): string {
  const n = ([...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 8, 0) + 1);
  return `/world/flower-${n}.png`;
}

const stageLabel: Record<string, string> = {
  matching: "寻找同行者",
  delivered: "等待回应",
  sprout: "刚成为搭子",
  leafing: "正在商量",
  growing: "敲定时间地点",
  bud: "已约好，等出发",
  bloom: "行动完成",
};

type Plant = { kind: string; id: string; title: string; stage: string; href: string };
type Memory = { id: string; title: string; withName: string };

export function WorldGarden() {
  const { data: garden } = useSWR("/api/garden", fetcher, { refreshInterval: 4000 });
  const { data: me } = useSWR("/api/me", fetcher, { refreshInterval: 5000 });
  const { data: forest } = useSWR("/api/forest", fetcher, { refreshInterval: 8000 });
  const [petHappy, setPetHappy] = useState(false);

  const plants: Plant[] = garden?.plants ?? [];
  const memories: Memory[] = forest?.memories ?? [];
  const unread: number = me?.counts?.mailboxUnread ?? 0;
  const activeRooms: number = me?.counts?.activeRooms ?? 0;
  const name: string = me?.me?.name ?? "同学";

  // 进行中的行动（非 bloom）作为花园里的植物，最多 4 个 slot
  const growing = plants.filter((p) => p.stage !== "bloom").slice(0, 4);
  const first = growing[0];

  return (
    <main className="world-screen garden-world-screen">
      <section className="game-hud">
        <div>
          <small>{name}的社交森林</small>
          <strong>{growing.length > 0 ? `${growing.length} 株植物正在生长` : "花园里还有空地"}</strong>
        </div>
        <Link href="/plaza" className="round-button" aria-label="公共花园" style={{ textDecoration: "none" }}>
          ?
        </Link>
      </section>

      <div className="world-scene">
        <img
          className="scene-image"
          src="/world/garden-background.png"
          alt="绘本风社交花园：小屋、信箱、长椅、草地与小溪"
        />

        {/* 花园里的行动植物（真实数据）*/}
        <div className="garden-growth-layer" aria-label="花园中的行动植物">
          {first ? (
            <Link className="real-plant-slot slot-one" href={first.href}>
              <img src={plantAsset(first.stage)} alt={first.title} />
              <span>{stageLabel[first.stage] ?? first.title}</span>
            </Link>
          ) : (
            <Link className="empty-real-plot" href="/seed/new">
              <span>＋</span>
              <b>种一颗行动种子</b>
            </Link>
          )}
          {growing[1] && (
            <Link className="real-plant-slot slot-two" href={growing[1].href}>
              <img src={plantAsset(growing[1].stage)} alt={growing[1].title} />
              <span>{growing[1].title}</span>
            </Link>
          )}
          {growing[2] && (
            <Link className="real-plant-slot slot-three" href={growing[2].href}>
              <img src={plantAsset(growing[2].stage)} alt={growing[2].title} />
              <span>{growing[2].title}</span>
            </Link>
          )}
          {growing[3] && (
            <Link className="real-plant-slot slot-four" href={growing[3].href}>
              <img src={plantAsset(growing[3].stage)} alt={growing[3].title} />
              <span>{growing[3].title}</span>
            </Link>
          )}
        </div>

        {/* 场景热点（复用新前端坐标）*/}
        <Link className="world-hotspot hotspot-house" href="/home">
          <span className="hotspot-ring" />
          <b>我的家</b>
          <small>回家看看小绿</small>
        </Link>
        <Link className="world-hotspot hotspot-mailbox" href="/mailbox">
          <span className="hotspot-ring" />
          <b>种子信箱</b>
          <small>{unread > 0 ? `${unread} 封新信` : "暂无新信"}</small>
          {unread > 0 && <i>{unread}</i>}
        </Link>
        <Link className="world-hotspot hotspot-forest" href="/forest">
          <span className="hotspot-ring" />
          <b>回忆林</b>
          <small>{memories.length} 段共同经历</small>
        </Link>
        <Link className="world-hotspot hotspot-bridge" href="/actions">
          <span className="hotspot-ring" />
          <b>行动溪</b>
          <small>{activeRooms > 0 ? `${activeRooms} 个进行中` : "暂无同行"}</small>
        </Link>

        <button
          className={`world-pet ${petHappy ? "is-happy" : ""}`}
          onClick={() => setPetHappy((v) => !v)}
          aria-label="和小绿说话"
        >
          <img className="pet-asset" src="/world/pet-agent.png" alt="小绿行动信使" style={{ width: 76 }} />
          <span>{petHappy ? "嘿嘿，今天的花园很热闹！" : "点点我"}</span>
        </button>
      </div>

      {/* 底部世界导航（手绘图标）*/}
      <div className="world-dock">
        <Link href="/home">
          <img src="/world/nav-profile-v2.png" alt="" />
          <small>家</small>
        </Link>
        <Link href="/mailbox">
          <img src="/world/nav-mailbox-v2.png" alt="" />
          <small>信箱</small>
        </Link>
        <Link className="dock-seed" href="/seed/new">
          ＋<small>种下</small>
        </Link>
        <Link href="/actions">
          <img src="/world/nav-chat-v2.png" alt="" />
          <small>行动</small>
        </Link>
        <Link href="/forest">
          <img src="/world/nav-garden-v2.png" alt="" />
          <small>森林</small>
        </Link>
      </div>
    </main>
  );
}
