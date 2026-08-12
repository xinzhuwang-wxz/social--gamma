import { NextRequest, NextResponse } from "next/server";
import { getState, appendEvent, snapshot } from "@/lib/demo/state";
import { readJson } from "@/lib/http";
import { simChatReply } from "@/lib/demo/sim";

export async function POST(req: NextRequest) {
  const body = (await readJson<{ text?: string; author?: string }>(req)) ?? {};
  const text = String(body.text || "").trim().slice(0, 240);
  if (!text) return NextResponse.json({ error: "消息不能为空" }, { status: 400 });
  const s = getState();
  const author = body.author || "me";
  s.messages.push({ id: `msg_${s.messages.length + 1}`, author, text });
  appendEvent("MESSAGE_SENT", { text });

  // 真人发言 → 仿真同伴同步真人感回复（契合非轮询前端）
  const partner = s.selectedCandidate;
  if (author === "me" && partner) {
    try {
      const reply = await simChatReply(partner, s.draft?.idea || "一起做点事", s.messages);
      s.messages.push({ id: `msg_${s.messages.length + 1}`, author: partner, text: reply });
    } catch (err) {
      console.error("[demo] simChatReply failed", err);
    }
  }
  return NextResponse.json(snapshot(), { status: 201 });
}
