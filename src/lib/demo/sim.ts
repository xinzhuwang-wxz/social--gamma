/**
 * 新前端契约下的真实仿真同伴（复用 ARK / 豆包 mini）。
 * 同步生成：发布→即时捏候选人；选人→伴随开场；发消息→伴随真人感回复。
 * 契合他们「非轮询」前端：每次动作的响应里就带上仿真同伴的产出。
 */
import { generateObject } from "ai";
import { z } from "zod";
import { fastModel, NO_THINK } from "@/lib/ai/provider";

export type DemoCandidate = {
  name: string;
  avatar: string;
  match: string;
  note: string;
  facts: string[];
  reason: string;
};

const presetCandidates: Record<string, DemoCandidate[]> = {
  "西湖夜骑": [
    { name: "迟野", avatar: "迟", match: "经验匹配", note: "熟悉杭州夜骑路线", facts: ["完成过一次西湖夜骑", "会提前确认集合点", "接受轻松骑行节奏"], reason: "他熟悉路线，也能把集合与返程安排落实清楚。" },
    { name: "饭团", avatar: "饭", match: "兴趣匹配", note: "擅长让同行不冷场", facts: ["和你共同完成过西湖夜骑", "喜欢边走边听歌", "愿意照顾同行节奏"], reason: "你们已有共同骑行经历，再出发不会太陌生。" },
    { name: "小满", avatar: "满", match: "节奏匹配", note: "喜欢慢慢观察季节", facts: ["平时有骑行习惯", "不追求速度和里程", "愿意在杭州范围行动"], reason: "她重视沿途感受，适合不赶时间的夜骑。" },
  ],
  "草坪夏夜歌会": [
    { name: "饭团", avatar: "饭", match: "兴趣匹配", note: "有歌单，也会照顾气氛", facts: ["喜欢演唱会与听歌", "组织过草坪点歌会", "和你共同熬过黑客松"], reason: "她能自然地把人聚起来，又不会让歌会变得太正式。" },
    { name: "白羽", avatar: "羽", match: "经历匹配", note: "喜欢夜晚发生的故事", facts: ["参加过草坪夏夜歌会", "愿意完整听完别人选的歌", "有校园活动策划经验"], reason: "她擅长给普通夜晚留下一点仪式感。" },
    { name: "Lion", avatar: "L", match: "氛围匹配", note: "温和开朗，不抢话", facts: ["参加过草坪夏夜歌会", "喜欢美剧与轻松聊天", "能让新朋友自在加入"], reason: "他适合轻松、不需要表演压力的小型歌会。" },
  ],
  "gelato": [
    { name: "橘子汽水", avatar: "橘", match: "经历匹配", note: "会把远路变成Citywalk", facts: ["完成过一次 Gelato 小旅行", "熟悉杭州老街路线", "喜欢边走边观察建筑"], reason: "她知道目的地，也会让去那里的路本身值得。" },
    { name: "饭团", avatar: "饭", match: "行动匹配", note: "临时起意也会认真赴约", facts: ["完成过一次 Gelato 小旅行", "喜欢寻找演出和城市小店", "愿意坐很远的车出发"], reason: "她已经证明，会把一句想吃冰淇淋变成真正的同行。" },
    { name: "迟野", avatar: "迟", match: "路线匹配", note: "擅长确认交通与返程", facts: ["熟悉杭州公共交通", "会提前核对营业时间", "接受边走边聊的节奏"], reason: "他能降低远距离小旅行的不确定性。" },
  ],
};

export function getPresetCandidates(idea?: string): DemoCandidate[] | null {
  const normalized = String(idea || "").trim().toLowerCase();
  if (normalized.includes("西湖") && normalized.includes("骑")) return presetCandidates["西湖夜骑"];
  if (normalized.includes("草坪") && (normalized.includes("歌") || normalized.includes("音乐"))) return presetCandidates["草坪夏夜歌会"];
  if (normalized.includes("gelato") || normalized.includes("冰淇淋")) return presetCandidates.gelato;
  return null;
}

const candidatesSchema = z.object({
  candidates: z
    .array(
      z.object({
        name: z.string().describe("常见校园昵称 2-3 字，彼此不同"),
        avatar: z.string().describe("昵称里的一个字，做头像"),
        match: z.enum(["时间匹配", "地点匹配", "兴趣匹配", "经验匹配"]),
        note: z.string().describe("一句话亮点，≤14 字"),
        facts: z.array(z.string()).describe("3 条与这次行动相关的事实短语"),
        reason: z.string().describe("为什么适合，一句可信的话，≤40 字"),
      })
    )
    .describe("正好合拍、彼此不同的 3 位候选人"),
});

/** 按发布草稿即时捏出 3 位正好合拍的仿真候选人 */
export async function fabricateCandidates(draft: {
  idea?: string;
  time?: string;
  place?: string;
  people?: string;
  companion?: string;
  habit?: string;
  activityDetail?: string;
}): Promise<DemoCandidate[]> {
  const { object } = await generateObject({
    model: fastModel,
    schema: candidatesSchema,
    providerOptions: NO_THINK,
    system: `为一个校园搭子行动即时生成 3 位真实可信、彼此不同的候选同行者。
要求：每位都真心想参加、时间兼容；契合角度各不相同（经验型/热情新手型/顺路同好型）；
细节具体可信，可带一个无伤大雅的小限制。不要冒充已有的预置身份：一寸欢喜、饭团、Lion、Bamboo、橘子汽水、迟野、小满、白羽。`,
    prompt: `行动：${draft.idea ?? "一起做点事"}\n时间：${draft.time ?? "待定"}\n地点：${draft.place ?? "校园周边"}\n人数：${draft.people ?? "2-4 人"}\n同行者期待：${draft.companion ?? "可以商量"}\n相处习惯：${draft.habit ?? "未特别说明"}\n活动专项信息：${draft.activityDetail ?? "未特别说明"}\n生成 3 位候选人。`,
  });
  return object.candidates.slice(0, 3);
}

const replySchema = z.object({
  reply: z.string().describe("下一条聊天消息，口语化短句 ≤40 字，像真人打字，可带一个表情"),
});

/** 仿真同伴对真人消息的真人感回复 */
export async function simChatReply(
  partnerName: string,
  idea: string,
  history: { author: string; text: string }[]
): Promise<string> {
  const { object } = await generateObject({
    model: fastModel,
    schema: replySchema,
    providerOptions: NO_THINK,
    system: `你是大学生${partnerName}，已答应和对方一起完成「${idea}」，正在群聊里敲定安排。
像真人一样接着聊：口语化、简短自然、把安排往前推（回应问题、给具体建议如时间点/集合地/路线）；对方确认就轻快答应。绝不说自己是 AI。`,
    prompt: `最近对话：\n${history
      .slice(-8)
      .map((m) => `${m.author === "me" ? "对方" : partnerName}: ${m.text}`)
      .join("\n")}\n\n以${partnerName}身份回一条。`,
  });
  return object.reply;
}

/** 选人成局时，仿真同伴的一句开场（点名共同点，友好自然）*/
export async function simOpeningLine(partnerName: string, idea: string): Promise<string> {
  const { object } = await generateObject({
    model: fastModel,
    schema: replySchema,
    providerOptions: NO_THINK,
    system: `你是大学生${partnerName}，刚和对方成为「${idea}」的搭子，发第一句话打招呼并顺势推进一点安排。口语化、热情、≤40 字，可带表情。`,
    prompt: `行动：${idea}。以${partnerName}身份发第一句。`,
  });
  return object.reply;
}
