import { generateObject } from "ai";
import { fastModel, NO_THINK } from "./provider";
import { matchEvalSchema, a2aSchema } from "./schemas";
import type { SeedCard } from "./schemas";

export type CandidateProfile = {
  id: string;
  name: string;
  grade: string | null;
  major: string | null;
  bio: string | null;
  traits: {
    interests: string[];
    schedule: string;
    vibe: string;
    experiences: string[];
  } | null;
};

/**
 * 对候选池做适配评估与排序。
 * 真实 LLM 评估：时间/地点/兴趣/经验是否适配，产出面向候选人展示的分类理由。
 */
export async function matchCandidates(
  seed: SeedCard & { ownerName: string },
  candidates: CandidateProfile[]
) {
  const { object } = await generateObject({
    model: fastModel, // type 已放宽为 string，mini 可稳过 → 快；DB reasons 列本就是 string
    schema: matchEvalSchema,
    providerOptions: NO_THINK,
    system: `你是校园行动社交平台的匹配信使。发起人发布了一颗行动种子，你要评估每位候选人的适配度。
评估依据：时间是否兼容（对照候选人 schedule 与种子时间）、地点/活动类型兴趣是否匹配、相关经验、做事风格。
注意：
- 理由要具体、可信、面向候选人展示（「你周六全天有空，和这次爬山时间正好」），不要空话。
- 必要条件明显冲突的（如时间完全不可能），worthDelivering 给 false。
- 分数拉开差距，不要都打同样的分。`,
    prompt: `## 行动种子（发起人：${seed.ownerName}）
${JSON.stringify(seed, null, 2)}

## 候选人列表
${JSON.stringify(candidates, null, 2)}

对每位候选人输出评估。`,
  });
  return object.results;
}

/**
 * 为一对（发起人, 候选人）生成 A2A 预热对话。
 * 边界：不替用户承诺、不交换联系方式、只谈本次事件相关信息。
 */
export async function a2aDialogue(
  seed: SeedCard,
  owner: CandidateProfile,
  candidate: CandidateProfile
) {
  const { object } = await generateObject({
    model: fastModel,
    schema: a2aSchema,
    providerOptions: NO_THINK,
    system: `你要生成两位用户的个人 Agent（信使鸟）之间的一段预热对话。owner 方 Agent 代表发起人，candidate 方 Agent 代表候选人。
目的：判断双方基本条件是否适配、找出与本次事件相关的共同点、为后续真人破冰准备素材。
硬性边界（违反即失败）：
- Agent 不替用户承诺参与（只能说「他可能会感兴趣」，不能说「他答应了」）
- 不决定时间地点方案
- 不交换联系方式或敏感信息
- 只使用下面给出的信息，不编造用户没有的经历
- 语气像两只尽职的信使鸟在互相介绍自己的主人，轻松但克制`,
    prompt: `## 行动种子
${JSON.stringify(seed, null, 2)}

## 发起人（owner 的主人）
${JSON.stringify(owner, null, 2)}

## 候选人（candidate 的主人）
${JSON.stringify(candidate, null, 2)}

生成 2-3 轮对话、共同点与破冰素材。`,
  });
  return object;
}
