"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Persona = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  grade: string | null;
  major: string | null;
  bio: string | null;
};

export default function Welcome() {
  const router = useRouter();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => setPersonas(d.personas ?? []));
  }, []);

  async function enter(body: object) {
    setBusy(true);
    const r = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) router.push("/garden");
    else setBusy(false);
  }

  return (
    <main className="flex min-h-dvh flex-col px-6 py-10">
      <div className="mb-8 text-center">
        <div className="font-kai text-5xl font-bold text-olive">发芽</div>
        <p className="mt-3 font-kai text-ink-2">
          种下一个行动愿望，
          <br />
          让它长成一段真实的共同经历
        </p>
      </div>

      {!creating ? (
        <>
          <p className="mb-3 text-sm text-ink-3">选择一个身份进入花园</p>
          <div className="grid grid-cols-2 gap-3">
            {personas.map((p) => (
              <button
                key={p.id}
                disabled={busy}
                onClick={() => enter({ userId: p.id })}
                className="card flex flex-col items-start gap-1 p-4 text-left active:scale-[0.98] transition-transform"
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full text-xl"
                  style={{ background: p.color }}
                >
                  {p.emoji}
                </span>
                <span className="mt-1 font-semibold text-ink">{p.name}</span>
                <span className="text-xs text-ink-3">
                  {p.grade} · {p.major}
                </span>
                <span className="line-clamp-2 text-xs text-ink-2">{p.bio}</span>
              </button>
            ))}
          </div>
          <button
            className="btn-secondary mt-6 h-12 w-full"
            onClick={() => setCreating(true)}
          >
            创建我自己的身份
          </button>
        </>
      ) : (
        <div className="card flex flex-col gap-3 p-5">
          <label className="text-sm text-ink-2">怎么称呼你？</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="昵称"
            className="h-12 rounded-md border border-card-border bg-paper px-4 outline-none focus:border-primary"
          />
          <label className="text-sm text-ink-2">一句话介绍（可选）</label>
          <input
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="比如：想找人一起晨跑"
            className="h-12 rounded-md border border-card-border bg-paper px-4 outline-none focus:border-primary"
          />
          <button
            disabled={!name.trim() || busy}
            className="btn-primary mt-2 h-12"
            onClick={() => enter({ name, bio })}
          >
            进入我的花园
          </button>
          <button className="text-sm text-ink-3" onClick={() => setCreating(false)}>
            返回
          </button>
        </div>
      )}
    </main>
  );
}
