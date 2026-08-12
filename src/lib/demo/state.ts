/**
 * 新前端（cobloom world-first）的 API 契约后端。
 * 前端本体（public/world）原样复用，此处实现它调用的 8 个端点。
 * 阶段一：先按其 demo 行为跑通（内存单 gathering）；阶段二逐步接真实 LLM + 仿真同伴。
 */

export type DemoCandidate = {
  name: string;
  avatar: string;
  match: string;
  note: string;
  facts: string[];
  reason: string;
};

export type Snapshot = {
  published: boolean;
  selectedCandidate: string | null;
  messages: { id: string; author: string; text: string }[];
  slots: { people: boolean; time: boolean; place: boolean };
  checkedIn: boolean;
  archived: boolean;
  events: { id: string; type: string; payload: unknown; at: string }[];
  stage: string;
  // 真实数据增量：仿真候选人 + 当前草稿
  candidates: DemoCandidate[];
  draft: {
    idea: string;
    time: string;
    place: string;
    people: string;
    companion: string;
    habit: string;
    activityDetail: string;
  } | null;
};

type DemoState = Omit<Snapshot, "stage">;

const fresh = (): DemoState => ({
  published: false,
  selectedCandidate: null,
  messages: [],
  slots: { people: false, time: false, place: false },
  checkedIn: false,
  archived: false,
  events: [],
  candidates: [],
  draft: null,
});

// 进程内单例（demo/路演用）。HMR 兼容。
const g = globalThis as unknown as { __demoState?: DemoState };
export function getState(): DemoState {
  return (g.__demoState ??= fresh());
}
export function resetState(): DemoState {
  g.__demoState = fresh();
  return g.__demoState;
}

/** 阶段仅由已确认事实派生，任何模型都不能直接写 */
export function derivePlantStage(s: DemoState): string {
  if (s.archived) return "FOREST";
  if (s.checkedIn) return "BLOOM";
  if (s.slots.people && s.slots.time && s.slots.place) return "BUD";
  if (s.slots.time || s.slots.place) return "GROWING";
  if (s.messages.length) return "LEAF";
  if (s.selectedCandidate) return "SPROUT";
  return "SEED";
}

export function snapshot(): Snapshot {
  const s = getState();
  return { ...s, stage: derivePlantStage(s) };
}

export function appendEvent(type: string, payload: unknown = {}) {
  const s = getState();
  s.events.push({ id: `evt_${s.events.length + 1}`, type, payload, at: new Date().toISOString() });
}
