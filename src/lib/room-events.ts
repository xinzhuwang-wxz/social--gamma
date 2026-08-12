import { EventEmitter } from "node:events";

/**
 * 进程内房间事件总线（SSE 推送源）。
 * globalThis 单例，兼容 dev HMR；多实例部署时自动退化为「本实例内推送 + 客户端轮询兜底」。
 */
const g = globalThis as unknown as { __roomBus?: EventEmitter };
const bus = (g.__roomBus ??= (() => {
  const e = new EventEmitter();
  e.setMaxListeners(0);
  return e;
})());

export function emitRoom(roomId: string) {
  bus.emit(`room:${roomId}`);
}

export function subscribeRoom(roomId: string, fn: () => void) {
  const key = `room:${roomId}`;
  bus.on(key, fn);
  return () => bus.off(key, fn);
}
