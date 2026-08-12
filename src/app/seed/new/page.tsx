"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, Mic } from "lucide-react";
import { CourierBird, SeedIllustration } from "@/components/world";
import { useSpeech } from "@/lib/use-speech";

type Msg = { role: "user" | "assistant"; content: string };

type SeedCard = {
  title: string;
  what: string;
  whenText: string;
  whereText: string;
  groupSize: string;
  requirements: { must: string[]; flexible: string[] };
  tags: string[];
};

type ClarifyResult = {
  ready: boolean;
  reply: string;
  card: SeedCard | null;
};

type PublishResult = { ok: boolean; seedId: string };

const OPENING = "想做点什么呢？告诉我你的想法吧～";

// ── Sub-components ────────────────────────────────────────────────────────────

/**
 * Animates `text` character-by-character.
 * Mount with a new `key` prop to restart the animation for each new reply.
 */
function TypewriterBubble({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 26);
    return () => clearInterval(id);
  }, [text]);

  return <BirdBubble text={displayed} />;
}

function BirdBubble({ text }: { text: string }) {
  return (
    <div className="mb-4 flex items-start gap-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-mint">
        <CourierBird state="idle" size={30} />
      </span>
      <div className="font-kai max-w-[75%] rounded-2xl rounded-tl-sm bg-mint px-4 py-2.5 text-sm leading-relaxed text-olive">
        {text || (
          <span className="inline-block h-4 w-1 animate-pulse rounded-sm bg-olive opacity-60" />
        )}
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="mb-4 flex justify-end">
      <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground">
        {text}
      </div>
    </div>
  );
}

function BirdThinking() {
  return (
    <div className="mb-4 flex items-start gap-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-mint">
        <CourierBird state="thinking" size={30} />
      </span>
      <div className="rounded-2xl rounded-tl-sm bg-mint px-4 py-3">
        <div className="flex items-center gap-1.5">
          {([0, 1, 2] as const).map((i) => (
            <motion.span
              key={i}
              className="block h-1.5 w-1.5 rounded-full bg-olive"
              animate={{ y: [0, -4, 0] }}
              transition={{
                duration: 0.7,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">{icon}</span>
      <span className="text-sm text-ink-2">{text}</span>
    </div>
  );
}

function SeedPreviewCard({ card }: { card: SeedCard }) {
  return (
    <div className="card overflow-hidden">
      {/* Illustration header */}
      <div
        className="flex flex-col items-center justify-end pb-3 pt-5"
        style={{
          background: "linear-gradient(180deg, #DCE3AE 0%, #F7F0DE 100%)",
          minHeight: 130,
        }}
      >
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: 88,
            height: 88,
            background: "radial-gradient(circle at 40% 38%, #EEF4C8 0%, #DCE3AE 100%)",
            boxShadow: "0 4px 16px rgba(137,151,75,0.18)",
          }}
        >
          <SeedIllustration size={56} />
        </div>
      </div>

      {/* Card body */}
      <div className="p-5">
        {/* Title */}
        <h2 className="font-kai mb-3 text-center text-xl leading-snug text-olive">
          {card.title}
        </h2>

        {/* What */}
        <p className="mb-4 text-sm leading-relaxed text-ink">{card.what}</p>

        {/* Meta row */}
        <div className="mb-4 flex flex-col gap-1.5">
          <InfoRow icon="📅" text={card.whenText} />
          <InfoRow icon="📍" text={card.whereText} />
          <InfoRow icon="👥" text={card.groupSize} />
        </div>

        {/* Requirements */}
        {card.requirements.must.length > 0 && (
          <div className="mb-3 rounded-[var(--radius-sm)] bg-sky px-3 py-2.5">
            <p className="mb-1.5 text-xs font-medium text-ink-3">必要条件</p>
            {card.requirements.must.map((r, i) => (
              <p key={i} className="text-xs text-ink-2">
                · {r}
              </p>
            ))}
          </div>
        )}

        {card.requirements.flexible.length > 0 && (
          <div className="mb-4 rounded-[var(--radius-sm)] bg-sky px-3 py-2.5">
            <p className="mb-1.5 text-xs font-medium text-ink-3">可以商量</p>
            {card.requirements.flexible.map((r, i) => (
              <p key={i} className="text-xs text-ink-2">
                · {r}
              </p>
            ))}
          </div>
        )}

        {/* Tags */}
        {card.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {card.tags.map((t, i) => (
              <span
                key={i}
                className="rounded-full bg-mint px-2.5 py-0.5 text-xs text-olive"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NewSeedPage() {
  const router = useRouter();
  const [apiHistory, setApiHistory] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [card, setCard] = useState<SeedCard | null>(null);
  // typingText: text of the latest AI reply (drives the TypewriterBubble)
  const [typingText, setTypingText] = useState("");
  const [publishing, setPublishing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { supported: speechSupported, listening, toggle: toggleSpeech } = useSpeech({
    onResult: setInput,
  });

  // Auto-scroll to bottom whenever key state changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [apiHistory.length, typingText, card, loading]);

  // The last assistant message in history is shown via TypewriterBubble, not inline
  const lastMsg = apiHistory.length > 0 ? apiHistory[apiHistory.length - 1] : null;
  const displayedMsgs: Msg[] =
    typingText && lastMsg && lastMsg.role === "assistant"
      ? apiHistory.slice(0, apiHistory.length - 1)
      : apiHistory;

  async function send() {
    const text = input.trim();
    if (!text || loading || publishing) return;

    const prevHistory = apiHistory.slice();
    const userMsg: Msg = { role: "user", content: text };
    const nextHistory = [...prevHistory, userMsg];

    setInput("");
    setError(null);
    setApiHistory(nextHistory);
    setTypingText("");
    setLoading(true);

    try {
      const res = await fetch("/api/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: nextHistory }),
      });
      if (!res.ok) throw new Error("api error");
      const data = (await res.json()) as ClarifyResult;
      const assistantMsg: Msg = { role: "assistant", content: data.reply };
      setApiHistory([...nextHistory, assistantMsg]);
      setTypingText(data.reply);
      setCard(data.ready && data.card ? data.card : null);
    } catch {
      setApiHistory(prevHistory);
      setInput(text);
      setError("小绿遇到了点问题，请重新发送");
    } finally {
      setLoading(false);
    }
  }

  async function publish() {
    if (!card || publishing) return;
    setPublishing(true);
    try {
      const res = await fetch("/api/seeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card }),
      });
      if (!res.ok) throw new Error("publish failed");
      const data = (await res.json()) as PublishResult;
      setTimeout(() => router.push(`/seed/${data.seedId}`), 1100);
    } catch {
      setPublishing(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col">
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
        <span className="font-semibold text-ink">种下一颗种子</span>
      </header>

      {/* Chat area */}
      <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-10 pt-5">
        {/* Fixed opening message (UI text, not from AI) */}
        <BirdBubble text={OPENING} />

        {/* Completed messages */}
        {displayedMsgs.map((m, i) =>
          m.role === "user" ? (
            <UserBubble key={i} text={m.content} />
          ) : (
            <BirdBubble key={i} text={m.content} />
          )
        )}

        {/* Typewriter: latest AI reply — key resets the component on each new reply */}
        {typingText && !loading && (
          <TypewriterBubble key={typingText} text={typingText} />
        )}

        {/* Thinking indicator */}
        {loading && <BirdThinking />}

        {/* Error */}
        {error && !loading && (
          <p className="ml-10 mt-1 text-xs text-alert">{error}</p>
        )}

        {/* Seed card preview + publish button */}
        {card && !loading && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, ease: "easeOut" }}
              className="mt-3"
            >
              <SeedPreviewCard card={card} />

              <div className="relative mt-4">
                {/* Bird flying-away animation */}
                {publishing && (
                  <motion.span
                    className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2"
                    style={{ top: -28 }}
                    initial={{ y: 0, x: 0, opacity: 1 }}
                    animate={{ y: -110, x: 60, opacity: 0 }}
                    transition={{ duration: 1.0, ease: "easeIn" }}
                  >
                    <CourierBird state="carrying" size={44} />
                  </motion.span>
                )}
                <button
                  onClick={() => void publish()}
                  disabled={publishing}
                  className="btn-primary h-12 w-full text-[15px]"
                >
                  {publishing ? "信使鸟带着种子飞走了…" : "发布这颗种子 🌱"}
                </button>
              </div>

              <p className="mt-2 text-center text-xs text-ink-3">
                还想修改？继续告诉小绿，它会重新生成种子卡
              </p>
            </motion.div>
          </AnimatePresence>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div
        className="sticky bottom-0 border-t bg-paper px-4 py-3"
        style={{ borderColor: "var(--color-card-border)" }}
      >
        <div className="flex gap-2">
          {speechSupported && (
            <motion.button
              onClick={toggleSpeech}
              animate={listening ? { scale: [1, 1.1, 1] } : { scale: 1 }}
              transition={
                listening
                  ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                  : {}
              }
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] border ${
                listening
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-sky text-ink-2"
              }`}
              style={listening ? {} : { borderColor: "var(--color-card-border)" }}
              aria-label={listening ? "停止录音" : "语音输入"}
              disabled={loading || publishing}
            >
              <Mic size={18} />
            </motion.button>
          )}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="告诉小绿你想做什么…"
            disabled={loading || publishing}
            className="h-11 flex-1 rounded-[var(--radius-md)] border bg-sky px-4 text-sm text-ink outline-none placeholder:text-ink-4 focus:border-primary disabled:opacity-60"
            style={{ borderColor: "var(--color-card-border)" }}
          />
          <button
            onClick={() => void send()}
            disabled={!input.trim() || loading || publishing}
            className="btn-primary h-11 px-5 text-sm"
          >
            发送
          </button>
        </div>
      </div>
    </main>
  );
}
