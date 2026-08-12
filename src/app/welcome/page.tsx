"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CourierBird } from "@/components/world";

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
    <main className="flex min-h-dvh flex-col justify-center px-7 py-10">
      {/* 品牌 */}
      <div className="mb-8 text-center">
        <div className="mb-2 flex justify-center">
          <CourierBird state="idle" size={72} />
        </div>
        <div className="font-kai text-5xl font-extrabold" style={{ color: "var(--color-olive)" }}>
          发芽
        </div>
        <p className="mt-3 font-kai text-sm leading-relaxed" style={{ color: "var(--color-ink-2)" }}>
          种下一个行动愿望，
          <br />
          让它长成一段真实的共同经历
        </p>
      </div>

      {/* 创建身份 */}
      <div className="card p-6">
        <p className="mb-1 text-base font-bold" style={{ color: "var(--color-ink)" }}>
          先给自己起个名字
        </p>
        <p className="mb-4 text-xs" style={{ color: "var(--color-ink-3)" }}>
          进来发一颗种子，小叶就会帮你找到正好合适的同伴。
        </p>

        {/* emoji 选择 */}
        <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
          {EMOJI_CHOICES.map((e) => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl transition-transform active:scale-95"
              style={{
                background: emoji === e ? "var(--color-primary)" : "var(--color-mint)",
                boxShadow: emoji === e ? "0 0 0 2px var(--color-primary)" : undefined,
              }}
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
          className="mb-3 h-12 w-full rounded-[var(--radius-sm)] px-4 text-sm outline-none"
          style={{ border: "1px solid var(--color-card-border)", background: "var(--color-paper)", color: "var(--color-ink)" }}
        />
        <input
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 40))}
          onKeyDown={(e) => e.key === "Enter" && enter()}
          placeholder="一句话介绍（可选，比如：想找人一起晨跑）"
          className="mb-4 h-12 w-full rounded-[var(--radius-sm)] px-4 text-sm outline-none"
          style={{ border: "1px solid var(--color-card-border)", background: "var(--color-paper)", color: "var(--color-ink)" }}
        />

        <button
          onClick={enter}
          disabled={!name.trim() || busy}
          className="btn-primary flex h-12 w-full items-center justify-center text-[15px]"
        >
          {busy ? "进入中…" : "进入我的花园 🌱"}
        </button>

        {error && (
          <p className="mt-2 text-center text-xs" style={{ color: "var(--color-danger)" }}>
            进入失败，请再试一次
          </p>
        )}
      </div>
    </main>
  );
}
