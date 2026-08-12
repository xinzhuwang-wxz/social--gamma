"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const EMOJI_CHOICES = ["🌱", "🏔️", "🎨", "📷", "🏸", "🎭", "🍰", "🚲", "🎧", "📚", "⚽", "🌿"];

export default function Welcome() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [emoji, setEmoji] = useState("🌱");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function enter() {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(false);
    try {
      const r = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, bio: bio.trim(), emoji }),
      });
      if (!r.ok) throw new Error();
      router.push("/garden");
      router.refresh();
    } catch {
      setBusy(false);
      setError(true);
    }
  }

  return (
    <main className="screen welcome-screen">
      <div className="welcome-hero">
        <img className="welcome-pet" src="/world/pet-agent.png" alt="信使小绿" />
        <h1 className="welcome-title">发芽</h1>
        <p className="welcome-sub">在校园，遇见一起成长的你</p>
      </div>

      <section className="card welcome-card">
        <p className="welcome-card-title">先给自己起个名字</p>
        <p className="welcome-card-hint">进来种一颗种子，小绿就会帮你找到正好合适的同伴。</p>

        <div className="welcome-emoji-row">
          {EMOJI_CHOICES.map((e) => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              className={`welcome-emoji ${emoji === e ? "selected" : ""}`}
              aria-label={`头像 ${e}`}
            >
              {e}
            </button>
          ))}
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 24))}
          onKeyDown={(e) => e.key === "Enter" && enter()}
          placeholder="你的昵称"
          className="welcome-input"
        />
        <input
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 40))}
          onKeyDown={(e) => e.key === "Enter" && enter()}
          placeholder="一句话介绍（可选，比如：想找人一起晨跑）"
          className="welcome-input"
        />

        <button onClick={enter} disabled={!name.trim() || busy} className="primary full welcome-enter">
          {busy ? "进入中…" : "进入我的花园 🌱"}
        </button>
        {error && <p className="welcome-error">进入失败，请再试一次</p>}
      </section>
    </main>
  );
}
