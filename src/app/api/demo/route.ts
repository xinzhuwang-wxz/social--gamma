import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { worldSnapshot } from "@/lib/world-gathering";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await currentUser();
  if (!me) return NextResponse.json(await worldSnapshot("__anonymous__"));
  return NextResponse.json(await worldSnapshot(me.id));
}
