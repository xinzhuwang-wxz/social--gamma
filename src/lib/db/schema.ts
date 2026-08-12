import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

/** 用户（persona 会话，无密码） */
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  emoji: text("emoji").notNull().default("🌱"), // 头像 emoji
  color: text("color").notNull().default("#DCE3AE"), // 头像底色
  grade: text("grade"), // 年级，如 大二
  major: text("major"), // 专业
  bio: text("bio"), // 一句话介绍
  /** JSON: { interests: string[], schedule: string, vibe: string, experiences: string[] } */
  traits: text("traits", { mode: "json" }).$type<{
    interests: string[];
    schedule: string;
    vibe: string;
    experiences: string[];
  }>(),
  isPersona: integer("is_persona", { mode: "boolean" }).notNull().default(false),
  /** 仿真同伴（按用户种子即时生成的模拟人格，自动参与全流程；SIM_MODE=0 关闭） */
  isSim: integer("is_sim", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const sessions = sqliteTable("sessions", {
  token: text("token").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

/** 行动种子。状态：draft 澄清中 / matching 匹配投递中 / formed 已成局 / closed 已关闭 */
export const seeds = sqliteTable("seeds", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull().references(() => users.id),
  title: text("title").notNull(), // 如「周六去爬山」
  what: text("what").notNull(), // 做什么（细化）
  whenText: text("when_text").notNull(), // 大致时间
  whereText: text("where_text").notNull(), // 大致地点/范围
  groupSize: text("group_size").notNull().default("2人"), // 人数
  /** JSON: { must: string[], flexible: string[] } 必要条件 / 可商量 */
  requirements: text("requirements", { mode: "json" })
    .$type<{ must: string[]; flexible: string[] }>()
    .notNull(),
  tags: text("tags", { mode: "json" }).$type<string[]>().notNull(),
  status: text("status", {
    enum: ["draft", "matching", "delivered", "formed", "closed"],
  })
    .notNull()
    .default("draft"),
  /** 再约一次来源房间 */
  reseedFromRoomId: text("reseed_from_room_id"),
  /** 定向邀请对象（再约一次时） */
  directToUserId: text("direct_to_user_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

/** 投递记录（种子 → 候选人）。status: delivered 已投递 / interested 愿意 / declined 不感兴趣 / chosen 被选中 / closed 礼貌关闭 */
export const matches = sqliteTable("matches", {
  id: text("id").primaryKey(),
  seedId: text("seed_id").notNull().references(() => seeds.id),
  candidateId: text("candidate_id").notNull().references(() => users.id),
  score: real("score").notNull(), // LLM 适配度 0-100
  /** JSON: [{ type: "time"|"place"|"interest"|"experience", text: string }] */
  reasons: text("reasons", { mode: "json" })
    .$type<{ type: string; text: string }[]>()
    .notNull(),
  /** JSON: A2A 预热对话 { turns: [{agent: "owner"|"candidate", text}], commonalities: string[], icebreakHints: string[] } */
  a2a: text("a2a", { mode: "json" }).$type<{
    turns: { agent: "owner" | "candidate"; text: string }[];
    commonalities: string[];
    icebreakHints: string[];
  }>(),
  status: text("status", {
    enum: ["delivered", "interested", "declined", "chosen", "closed"],
  })
    .notNull()
    .default("delivered"),
  note: text("note"), // 候选人可选留言
  unread: integer("unread", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

/** 行动房间（成局后创建）。stage = 植物阶段：sprout 发芽 / leafing 长叶 / growing 生长 / bud 花苞(已约好) / bloom 开花(完成) */
export const rooms = sqliteTable("rooms", {
  id: text("id").primaryKey(),
  seedId: text("seed_id").notNull().references(() => seeds.id),
  ownerId: text("owner_id").notNull().references(() => users.id),
  partnerId: text("partner_id").notNull().references(() => users.id),
  stage: text("stage", {
    enum: ["sprout", "leafing", "growing", "bud", "bloom"],
  })
    .notNull()
    .default("sprout"),
  /** JSON: { message: string, quickReplies: string[] } 小苗 破冰（仅一次） */
  icebreak: text("icebreak", { mode: "json" }).$type<{
    message: string;
    quickReplies: string[];
  }>(),
  /** JSON: 对方摘要卡 { forOwner: {highlights, commonalities, toDiscuss}, forPartner: {...} } */
  summaryCard: text("summary_card", { mode: "json" }).$type<{
    forOwner: { highlights: string[]; commonalities: string[]; toDiscuss: string[] };
    forPartner: { highlights: string[]; commonalities: string[]; toDiscuss: string[] };
  }>(),
  ownerCompleted: integer("owner_completed", { mode: "boolean" }).notNull().default(false),
  partnerCompleted: integer("partner_completed", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

/** 房间消息。senderId 为 null 表示小苗 / 系统 */
export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => rooms.id),
  senderId: text("sender_id").references(() => users.id),
  kind: text("kind", { enum: ["text", "ai", "system"] }).notNull().default("text"),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

/** 行动约定。双确认后 status=confirmed，植物进入花苞 */
export const pacts = sqliteTable("pacts", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => rooms.id),
  /** JSON: { what, when, where, meet, notes[] } */
  content: text("content", { mode: "json" })
    .$type<{ what: string; when: string; where: string; meet: string; notes: string[] }>()
    .notNull(),
  status: text("status", { enum: ["draft", "confirmed"] }).notNull().default("draft"),
  ownerConfirmed: integer("owner_confirmed", { mode: "boolean" }).notNull().default(false),
  partnerConfirmed: integer("partner_confirmed", { mode: "boolean" }).notNull().default(false),
  version: integer("version").notNull().default(1),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

/** 每人一份的完成后记录：是否愿意再组队（必选）+ 可选文字。双 rejoin=true 才生成共同回忆 */
export const memoryEntries = sqliteTable("memory_entries", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => rooms.id),
  userId: text("user_id").notNull().references(() => users.id),
  willRejoin: integer("will_rejoin", { mode: "boolean" }).notNull(),
  text: text("text"),
  tags: text("tags", { mode: "json" }).$type<string[]>(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

/** 共同回忆（双愿意才物化，进入双方森林） */
export const memories = sqliteTable("memories", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => rooms.id),
  title: text("title").notNull(),
  summary: text("summary"), // AI 一句话总结（可选）
  imageFile: text("image_file"), // seedream 生成的插画文件名（可空）
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

/** 群体行动成员（含发起人，1对1 和群体均写入，方便统一访问控制） */
export const roomMembers = sqliteTable("room_members", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => rooms.id),
  userId: text("user_id").notNull().references(() => users.id),
  role: text("role", { enum: ["owner", "partner"] }).notNull(),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

/** 约定确认记录（按 pactId + userId 唯一，群体时统计全体确认数） */
export const pactConfirmations = sqliteTable("pact_confirmations", {
  id: text("id").primaryKey(),
  pactId: text("pact_id").notNull().references(() => pacts.id),
  userId: text("user_id").notNull().references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});
