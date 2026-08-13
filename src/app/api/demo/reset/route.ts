import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { resetWorldGathering, worldSnapshot } from "@/lib/world-gathering";

export async function POST() {
  const me = await currentUser();
  if (!me) return NextResponse.json(await worldSnapshot("__anonymous__"));
  await resetWorldGathering(me.id);
  return NextResponse.json(await worldSnapshot(me.id));
}
