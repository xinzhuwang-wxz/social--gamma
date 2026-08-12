import { NextRequest } from "next/server";
import { currentUser } from "@/lib/session";
import { roomForUser } from "@/lib/room-access";
import { subscribeRoom } from "@/lib/room-events";

export const dynamic = "force-dynamic";

/** GET /api/rooms/:id/stream — SSE：房间有任何更新时推一条 update 事件，客户端据此刷新 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await currentUser();
  if (!me) return new Response("unauthorized", { status: 401 });
  const { id } = await params;
  const room = await roomForUser(id, me.id);
  if (!room) return new Response("not found", { status: 404 });

  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data = "{}") =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));

      send("hello");
      const unsub = subscribeRoom(id, () => send("update"));
      // 25s 心跳防中间层断连
      const hb = setInterval(() => send("ping"), 25000);

      cleanup = () => {
        clearInterval(hb);
        unsub();
        try {
          controller.close();
        } catch {}
      };
      req.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
