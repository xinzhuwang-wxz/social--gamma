import { generateObject } from "ai";
import { fastModel, NO_THINK } from "./provider";
import { eventInterventionSchema, kickoffSchema, pactDraftSchema, memorySummarySchema } from "./schemas";
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
    model: fastModel,
    schema: kickoffSchema,
    providerOptions: NO_THINK,
    system: `两位用户刚为一次共同行动成局，你是属于这次事件的小苗。生成：
1. 给发起人看的对方摘要卡（forOwner：介绍同行者）和给同行者看的摘要卡（forPartner：介绍发起人）——只讲与本次事件相关的特点、共同点、待沟通事项。
2. 一次破冰消息（你只有这一次主动发言的机会）：像群聊里的行动小助手一样自然说话，直接问一个有助于确定时间、地点、路线或集合方式的具体问题；一句话；再配 3 个可直接回答这个问题的快捷回复。
房间成员已经确定，不得提议再邀请其他人；不解释自己的 AI 身份，不使用「推进、协作、事件 AI」等产品术语。
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

/** 群体成局开场：多同行者版摘要卡 + 一次破冰（forOwner 介绍所有同行者，forPartner 介绍发起人与其他成员） */
export async function roomKickoffGroup(
  seed: SeedCard,
  owner: CandidateProfile,
  partners: CandidateProfile[],
  a2aList: (A2A | null)[]
) {
  const { object } = await generateObject({
    model: fastModel,
    schema: kickoffSchema,
    providerOptions: NO_THINK,
    system: `多位用户刚为一次共同行动成局（${partners.length + 1} 人），你是属于这次事件的小苗。生成：
1. forOwner（给发起人看）：介绍所有同行者的特点、与事件的共同点、还需讨论的事项。
2. forPartner（给所有同行者看）：介绍发起人及其他成员，与事件的共同点，还需大家一起讨论的事项。
3. 一次破冰消息（唯一一次主动发言）：像群聊里的行动小助手一样自然说话，直接问一个有助于确定时间、地点、路线或集合方式的具体问题；一句话；配 3 个可直接回答这个问题的快捷回复。
房间成员已经确定，不得提议再邀请其他人；不解释自己的 AI 身份，不使用「推进、协作、事件 AI」等产品术语。
不编造给定信息之外的内容。`,
    prompt: `## 行动种子
${JSON.stringify(seed, null, 2)}

## 发起人
${JSON.stringify(owner, null, 2)}

## 同行者列表（共 ${partners.length} 位）
${partners.map((p, i) => `### 同行者 ${i + 1}（${p.name}）\n${JSON.stringify(p, null, 2)}`).join("\n\n")}

## Agent 预热对话（按同行者顺序）
${a2aList.map((a, i) => `### 与 ${partners[i]?.name ?? `同行者${i + 1}`} 的 A2A\n${JSON.stringify(a, null, 2)}`).join("\n\n")}`,
  });
  return object;
}

export type RoomMessage = { senderName: string; content: string; kind: string };

/** 事件 AI 决策：只在能推动行动跨过一个卡点时介入。 */
export async function planEventIntervention(
  seed: SeedCard,
  messages: RoomMessage[],
  pact: { status: string; content: unknown } | null
) {
  const { object } = await generateObject({
    model: fastModel,
    schema: eventInterventionSchema,
    providerOptions: NO_THINK,
    system: `你是属于这次事件的中立行动推进者。每次收到新真人消息后，判断现在是否存在一个明确、低成本、能让行动更接近发生的下一步。

只有下列情况才介入：
- ask_missing：行动落地还缺一个关键要素，只问最接近落地的那一项。
- offer_choices：对话里已经出现 2-3 个具体方案，需要收敛选择。
- request_decision：卡点已经明确，需要点名某一方给出决定。
- confirm_decision：双方已出现潜在共识，需要用一句话请求确认。
- create_pact：做什么、时间、地点/集合方式已经谈得足够具体，可以生成行动约定。

否则 shouldIntervene=false、action=none、text=""、options=[]，让真人继续聊。

硬规则：
- 推进而不是总结；复述只能作为提出下一步的半句话，不能独立成为消息。
- 你是双方共同的中立主持人，所有公开发言都面向房间里的全体成员；使用「你们、大家、哪一位」等中立称呼，不把当前发消息的人当作唯一听众，也不偏袒任何一方。
- 需要某个人回答时，根据对话明确点名；需要共识时同时请求双方确认。
- 一次只处理一个卡点，不替用户承诺，不编造未出现的决定。
- options 只能来自对话或行动种子已有信息，并且可以直接作为真人回复发送。
- 如果上一条事件 AI 的问题还没人回应，保持沉默。
- 介入文案不超过 70 字。`,
    prompt: `## 行动种子
${JSON.stringify(seed, null, 2)}

## 当前约定状态
${pact ? JSON.stringify(pact) : "尚未形成约定"}

## 房间对话（最近）
${messages.map((m) => `${m.senderName}: ${m.content}`).join("\n")}`,
  });
  return object;
}

/** 兼容旧调用名：手动推进接口与自动协调器共享同一套决策。 */
export const nudge = planEventIntervention;

/** 行动约定草稿：只整理双方谈过的内容 */
export async function draftPact(seed: SeedCard, messages: RoomMessage[]) {
  const { object } = await generateObject({
    model: fastModel,
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
