"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** 室内 Home（直接复用新前端 home-interior 资产与 markup）。宠物/装扮为轻互动 mock。*/
export function HomeInterior() {
  const router = useRouter();
  const [decorated, setDecorated] = useState(false);
  const [petMood, setPetMood] = useState<"idle" | "sleep" | "happy">("idle");
  const [tip, setTip] = useState<string | null>(null);

  const toast = (m: string) => {
    setTip(m);
    setTimeout(() => setTip(null), 2400);
  };

  return (
    <main className="world-screen home-world-screen">
      <section className="game-hud indoor">
        <Link className="hud-back" href="/garden">
          ‹ 花园
        </Link>
        <div>
          <small>我的家</small>
          <strong>小绿的生活空间</strong>
        </div>
        <button onClick={() => { setDecorated((v) => !v); toast(decorated ? "已收起本次装扮" : "摆上了新地毯和花灯"); }}>
          ✦
        </button>
      </section>

      <div className="world-scene room-scene">
        <img
          className="scene-image"
          src="/world/home-interior.png"
          alt="绘本风小屋室内：床、书架、旅行背包和行动桌"
        />
        {decorated && (
          <div className="home-decoration">
            <img src="/world/flower-7.png" alt="新摆放的装饰" />
            <i />
          </div>
        )}

        <button
          className="world-hotspot home-bed"
          onClick={() => { setPetMood("sleep"); toast("小绿睡着了，等会儿还会自己醒来"); }}
        >
          <span className="hotspot-ring" />
          <b>小绿的床</b>
          <small>睡一会儿</small>
        </button>
        <Link className="world-hotspot home-table" href="/actions">
          <span className="hotspot-ring" />
          <b>行动桌</b>
          <small>整理约定</small>
        </Link>
        <Link className="world-hotspot home-books" href="/me">
          <span className="hotspot-ring" />
          <b>记忆书架</b>
          <small>它有多了解你</small>
        </Link>
        <Link className="world-hotspot home-bag" href="/mailbox">
          <span className="hotspot-ring" />
          <b>旅行背包</b>
          <small>准备去送信</small>
        </Link>

        <button
          className={`world-pet indoor-pet ${petMood === "sleep" ? "is-sleeping" : ""} ${petMood === "happy" ? "is-happy" : ""}`}
          onClick={() => setPetMood((m) => (m === "happy" ? "idle" : "happy"))}
          aria-label="和小绿互动"
        >
          <img className="pet-asset" src="/world/pet-agent.png" alt="小绿行动信使" />
          <span>{petMood === "sleep" ? "Z z z…" : petMood === "happy" ? "今天要一起把什么事做成？" : "今天要一起把什么事做成？"}</span>
        </button>

        <div className={`decorate-tip ${decorated ? "show" : ""}`}>新地毯和花灯已经摆好啦！</div>
      </div>

      <div className="room-toolbar">
        <button onClick={() => { setDecorated((v) => !v); toast(decorated ? "已收起本次装扮" : "摆上了新地毯和花灯"); }}>
          <span>✦</span>
          <b>{decorated ? "已装扮" : "装扮"}</b>
        </button>
        <button onClick={() => setPetMood((m) => (m === "happy" ? "idle" : "happy"))}>
          <span>☻</span>
          <b>互动</b>
        </button>
        <button onClick={() => router.push("/seed/new")}>
          <span>＋</span>
          <b>聊愿望</b>
        </button>
      </div>

      {tip && <div className="toast">{tip}</div>}
    </main>
  );
}
