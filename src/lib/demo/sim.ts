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
细节具体可信，可带一个无伤大雅的小限制。不要用「小蓝/小雨/阿杰」这些名字。`,
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
