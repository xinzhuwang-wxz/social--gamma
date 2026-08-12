"use client";

import { useEffect, useRef } from "react";

/**
 * 订阅房间 SSE：有更新时回调（触发 SWR mutate）。
 * 连接失败/断开时静默退出——SWR 轮询兜底仍在。
 */
export function useRoomStream(roomId: string, onUpdate: () => void) {
  const cb = useRef(onUpdate);

  useEffect(() => {
    cb.current = onUpdate;
  });

  useEffect(() => {
    if (!roomId) return;
    let es: EventSource | null = null;
    let closed = false;
    let retry = 0;

    const connect = () => {
      if (closed) return;
      es = new EventSource(`/api/rooms/${roomId}/stream`);
      es.addEventListener("update", () => cb.current());
      es.onopen = () => (retry = 0);
      es.onerror = () => {
        es?.close();
        // 最多重连 3 次，之后交给轮询兜底
        if (!closed && retry < 3) {
          retry++;
          setTimeout(connect, 1000 * retry);
        }
      };
    };
    connect();

    return () => {
      closed = true;
      es?.close();
    };
  }, [roomId]);
}
