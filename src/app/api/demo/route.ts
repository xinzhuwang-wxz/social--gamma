import { NextResponse } from "next/server";
import { snapshot } from "@/lib/demo/state";

export const dynamic = "force-dynamic";

/** GET /api/demo — 当前演示快照 */
export async function GET() {
  return NextResponse.json(snapshot());
}
