import { generateObject } from "ai";
import { fastModel, strongModel, NO_THINK } from "./provider";
import { kickoffSchema, nudgeSchema, pactDraftSchema, memorySummarySchema } from "./schemas";
import type { CandidateProfile } from "./match";
import type { SeedCard } from "./schemas";

type A2A = {
  turns: { agent: "owner" | "candidate"; text: string }[];
  commonalities: string[];
  icebreakHints: string[];
};

/** 成局开场：双向摘要卡 + 一次破冰（一次调用出齐，降低时延） */
export async function roomKickoff(
  seed: SeedCard,
  owner: CandidateProfile,
  partner: CandidateProfile,
  a2a: A2A | null
) {
  const { object } = await generateObject({
    model: strongModel,
    schema: kickoffSchema,
    providerOptions: NO_THINK,
    system: `两位用户刚为一次共同行动成局，你是属于这次事件的事件 AI。生成：
1. 给发起人看的对方摘要卡（forOwner：介绍同行者）和给同行者看的摘要卡（forPartner：介绍发起人）——只讲与本次事件相关的特点、共同点、待沟通事项。
2. 一次破冰消息（你只有这一次主动发言的机会）：必须基于双方共同点或本次事件，自然、不尬，一句话；再配 3 个与事件相关的快捷回复供双方一键使用。
不编造给定信息之外的内容。`,
    prompt: `## 行动种子
${JSON.stringify(seed, null, 2)}

## 发起人
${JSON.stringify(owner, null, 2)}

## 同行者
${JSON.stringify(partner, null, 2)}

## 双方 Agent 预热对话（破冰素材）
${JSON.stringify(a2a, null, 2)}`,
  });
  return object;
}

export type RoomMessage = { senderName: string; content: string; kind: string };

/** 推进：一次只处理一个卡点 */
export async function nudge(
  seed: SeedCard,
  messages: RoomMessage[],
  pact: { status: string; content: unknown } | null
) {
  const { object } = await generateObject({
    model: fastModel,
    schema: nudgeSchema,
    providerOptions: NO_THINK,
    system: `你是这次共同行动的事件 AI。用户主动点了「推进」按钮请你帮忙。你要根据当前对话，只处理眼前的一个卡点：
- 如果讨论刚开始/发散：kind=summary，简短总结聊到哪里、还差什么要素（时间/地点/集合方式）。
- 如果双方在某个具体决策上犹豫（如去哪条路线）：kind=options，把讨论中出现过的方案整理成 2-3 个选项。
- 如果双方其实已达成一致但没明说：kind=consensus，把共识说出来向双方确认。
- 如果时间地点集合方式都已谈妥：kind=pact_suggest，建议把共识整理成行动约定。
规则：不发起新话题、不替用户做决定、不给完整计划书、语气轻，一次只说一件事，不超过 60 字。选项只能来自对话中出现过的内容。`,
    prompt: `## 行动种子
${JSON.stringify(seed, null, 2)}

## 当前约定状态
${pact ? JSON.stringify(pact) : "尚未形成约定"}

## 房间对话（最近）
${messages.map((m) => `${m.senderName}: ${m.content}`).join("\n")}`,
  });
  return object;
}

/** 行动约定草稿：只整理双方谈过的内容 */
export async function draftPact(seed: SeedCard, messages: RoomMessage[]) {
  const { object } = await generateObject({
    model: strongModel,
    schema: pactDraftSchema,
    providerOptions: NO_THINK,
    system: `把两位用户聊天中「已经谈妥」的内容整理成行动约定。
硬规则：只整理双方明确谈过并同意的内容；没谈到的要素放进 missing 数组、对应字段写「待商量」；绝不替他们补充未讨论的决定（不发明集合时间、不发明地点）。`,
    prompt: `## 行动种子（原始需求，仅供参照）
${JSON.stringify(seed, null, 2)}

## 房间对话
${messages.map((m) => `${m.senderName}: ${m.content}`).join("\n")}`,
  });
  return object;
}

/** 共同回忆一句话总结 */
export async function summarizeMemory(
  seedTitle: string,
  messages: RoomMessage[],
  entryTexts: string[]
) {
  const { object } = await generateObject({
    model: fastModel,
    schema: memorySummarySchema,
    providerOptions: NO_THINK,
    system: "为两位刚完成共同行动的用户写一句温暖但不煽情的回忆总结，不超过 30 字，基于给定素材。",
    prompt: `事件：${seedTitle}\n双方留下的记录：${entryTexts.join(" / ") || "（无）"}\n部分对话：${messages
      .slice(-10)
      .map((m) => `${m.senderName}: ${m.content}`)
      .join("\n")}`,
  });
  return object.summary;
}
