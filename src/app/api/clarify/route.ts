import { NextRequest, NextResponse } from "next/server";
import {
  activityDetailQuestion,
  clarifyStep,
  type ActivityDetailContext,
  type ClarifyMessage,
} from "@/lib/ai/clarify";
import { currentUser } from "@/lib/session";
import { readJson, badRequest } from "@/lib/http";

/** POST /api/clarify — { history: [{role, content}] } → { ready, reply, card } */
export async function POST(req: NextRequest) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await readJson<{
    history?: ClarifyMessage[];
    mode?: "activity_detail";
    context?: ActivityDetailContext;
  }>(req);
  if (!body) return badRequest("invalid json");
  if (body.mode === "activity_detail") {
    const context = body.context;
    if (!context?.idea || !context.time || !context.place || !context.companion || !context.habit) {
      return badRequest("activity detail context required");
    }
    try {
      return NextResponse.json(await activityDetailQuestion(context));
    } catch (e) {
      console.error("activity detail clarify error", e);
      return NextResponse.json({ error: "ai_failed" }, { status: 502 });
    }
  }
  const { history } = body;
  if (!Array.isArray(history) || history.length === 0) {
    return NextResponse.json({ error: "history required" }, { status: 400 });
  }
  try {
    const step = await clarifyStep(history.slice(-16));
    return NextResponse.json(step);
  } catch (e) {
    console.error("clarify error", e);
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
}
