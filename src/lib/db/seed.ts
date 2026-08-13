/**
 * Demo 候选池：8 名校园人物 + 4 个已发布行动。
 * 保留历史内部 ID，避免影响已有测试与接口引用；展示信息统一为新版校园关系网。
 * 运行：pnpm db:seed（可重复执行，按 id upsert）。
 */
import { db, schema } from "./client";

const now = () => new Date();

const personas: (typeof schema.users.$inferInsert)[] = [
  {
    id: "p_xiaolan",
    name: "一寸欢喜",
    emoji: "🐑",
    color: "#B8C88A",
    grade: "大一",
    major: "浙江大学 · 传播学",
    bio: "热情开朗，想把旅行、舞蹈和镜头里的故事都认真体验一次。",
    traits: {
      interests: ["西藏旅行", "摄影扫街", "人像摄影", "街舞", "王者荣耀"],
      schedule: "暑假时间较灵活，开学后以周末和傍晚为主",
      vibe: "主动热情，喜欢有青春感、能留下共同记忆的行动",
      experiences: ["StyleCapture 码上搭黑客松", "西湖夜骑", "一卷胶片拍校园"],
    },
    isPersona: true,
    createdAt: now(),
  },
  {
    id: "p_xiaoyu",
    name: "饭团",
    emoji: "🐹",
    color: "#DCE3AE",
    grade: "大二",
    major: "浙江大学 · 经济学",
    bio: "靠谱、热情，喜欢说话，也喜欢把大家聚到一起。",
    traits: {
      interests: ["演唱会", "巴萨足球", "听歌", "板绘"],
      schedule: "暑假傍晚和周末比较自由",
      vibe: "热情组织型，会照顾到局里每个人",
      experiences: ["StyleCapture 码上搭黑客松", "草坪夏夜歌会", "Gelato 小旅行"],
    },
    isPersona: true,
    createdAt: now(),
  },
  {
    id: "p_ajie",
    name: "Lion",
    emoji: "🦦",
    color: "#D7B67A",
    grade: "大四",
    major: "浙江大学 · 英语",
    bio: "阳光温和，喜欢美剧、Switch 和小狗。",
    traits: {
      interests: ["美剧", "老友记", "Switch", "边牧"],
      schedule: "暑假大部分周末可约，晚上也比较方便",
      vibe: "阳光开朗，愿意让同行的人都舒服自在",
      experiences: ["StyleCapture 码上搭黑客松", "第一班车去江边", "通宵看世界杯决赛"],
    },
    isPersona: true,
    createdAt: now(),
  },
  {
    id: "p_tongtong",
    name: "Bamboo",
    emoji: "🦔",
    color: "#F4ECD7",
    grade: "研二",
    major: "上海交通大学 · 物理学",
    bio: "沉稳寡言，偶尔会抛出一句很准的冷幽默。",
    traits: {
      interests: ["宋雨琦", "K-pop", "小猫", "物理"],
      schedule: "跨校活动优先周末，线上协作时间灵活",
      vibe: "安静稳重，熟悉后会出现冷幽默",
      experiences: ["StyleCapture 码上搭黑客松", "操场等月食", "在花落前拍人像"],
    },
    isPersona: true,
    createdAt: now(),
  },
  {
    id: "p_laoxu",
    name: "橘子汽水",
    emoji: "🦝",
    color: "#CCD56F",
    grade: "大三",
    major: "浙江大学 · 建筑学",
    bio: "喜欢慢慢走过城市，也喜欢把建筑和光线画下来。",
    traits: {
      interests: ["Citywalk", "老建筑", "展览", "速写"],
      schedule: "暑假傍晚与周末可约，偏好杭州范围",
      vibe: "慢热细致，适合边走边观察的同行",
      experiences: ["一卷胶片拍校园", "Gelato 小旅行", "太子湾追春天"],
    },
    isPersona: true,
    createdAt: now(),
  },
  {
    id: "p_nana",
    name: "迟野",
    emoji: "🦡",
    color: "#DCE3AE",
    grade: "大三",
    major: "浙江大学 · 计算机科学与技术",
    bio: "话不多，但会把路线、时间和细节认真落实。",
    traits: {
      interests: ["独立游戏", "咖啡", "夜跑", "骑行"],
      schedule: "工作日晚上与周末可约",
      vibe: "可靠执行型，习惯提前确认路线和集合点",
      experiences: ["西湖夜骑", "第一班车去江边", "校园电影放映"],
    },
    isPersona: true,
    createdAt: now(),
  },
  {
    id: "p_dawei",
    name: "小满",
    emoji: "🐿️",
    color: "#B8C88A",
    grade: "大二",
    major: "浙江大学 · 生物科学",
    bio: "喜欢留意季节很小的变化，也愿意陪朋友慢慢坚持。",
    traits: {
      interests: ["植物", "观鸟", "骑行", "小动物"],
      schedule: "暑假白天和傍晚均可，开学后周末优先",
      vibe: "季节收藏型，不催促别人，也能长期坚持",
      experiences: ["校园跑打卡", "操场等月食", "太子湾追春天"],
    },
    isPersona: true,
    createdAt: now(),
  },
  {
    id: "p_qiqi",
    name: "白羽",
    emoji: "🦉",
    color: "#D8DE83",
    grade: "大三",
    major: "浙江大学 · 汉语言文学",
    bio: "喜欢电影、幻想文学和夜晚发生的故事。",
    traits: {
      interests: ["幻想文学", "电影", "观星", "校园放映"],
      schedule: "周末和夜间活动优先",
      vibe: "夜行送信型，擅长把普通活动变成有仪式感的故事",
      experiences: ["校园电影放映", "操场等月食", "草坪夏夜歌会"],
    },
    isPersona: true,
    createdAt: now(),
  },
];

const personaSeeds: (typeof schema.seeds.$inferInsert)[] = [
  {
    id: "s_xiaolan_hike",
    ownerId: "p_xiaolan",
    title: "沿着西湖骑一整圈夜风",
    what: "从龙翔桥集合，沿西湖慢慢骑完一圈，中途停下拍夜景和喝汽水",
    whenText: "本周六 18:30",
    whereText: "杭州 · 西湖环线",
    groupSize: "3-4人",
    requirements: { must: ["会骑自行车", "接受夜间返程"], flexible: ["可以租车", "路线和停留点共同商量"] },
    tags: ["杭州范围", "骑行", "夜风"],
    status: "matching",
    createdAt: now(),
  },
  {
    id: "s_xiaoyu_drama",
    ownerId: "p_xiaoyu",
    title: "在草坪上办一场夏末点歌会",
    what: "每个人带一首最近喜欢的歌，在落日前坐到草坪上认真听完",
    whenText: "本周五 18:00",
    whereText: "浙江大学校内草坪",
    groupSize: "4-6人",
    requirements: { must: ["带来一首想分享的歌"], flexible: ["不用准备节目", "可以只听不唱"] },
    tags: ["仅本校", "音乐", "草坪"],
    status: "matching",
    createdAt: now(),
  },
  {
    id: "s_ajie_ride",
    ownerId: "p_ajie",
    title: "坐第一班车去江边等城市醒来",
    what: "带早餐去钱塘江边，不执着完美日出，一起看城市慢慢亮起来",
    whenText: "周日清晨",
    whereText: "杭州 · 钱塘江边",
    groupSize: "2-4人",
    requirements: { must: ["能够早起", "接受天气变化"], flexible: ["机位不固定", "可以临时调整日期"] },
    tags: ["杭州范围", "清晨", "摄影"],
    status: "matching",
    createdAt: now(),
  },
  {
    id: "s_laoxu_badminton",
    ownerId: "p_laoxu",
    title: "去老城区拍一次蓝调时刻",
    what: "沿老街慢慢走到路灯亮起，不赶机位，也不要求专业设备",
    whenText: "本周六 18:20",
    whereText: "杭州老城区",
    groupSize: "2-3人",
    requirements: { must: ["愿意步行一段路"], flexible: ["手机或相机都可以", "摄影经验不限"] },
    tags: ["杭州范围", "扫街", "蓝调时刻"],
    status: "matching",
    createdAt: now(),
  },
];

async function main() {
  for (const persona of personas) {
    await db.insert(schema.users).values(persona).onConflictDoUpdate({
      target: schema.users.id,
      set: {
        name: persona.name,
        emoji: persona.emoji,
        color: persona.color,
        grade: persona.grade,
        major: persona.major,
        bio: persona.bio,
        traits: persona.traits,
      },
    });
  }

  const withSeeds = process.env.SEED_PERSONAS_ONLY !== "1";
  if (withSeeds) {
    for (const seed of personaSeeds) {
      await db.insert(schema.seeds).values(seed).onConflictDoUpdate({
        target: schema.seeds.id,
        set: {
          ownerId: seed.ownerId,
          title: seed.title,
          what: seed.what,
          whenText: seed.whenText,
          whereText: seed.whereText,
          groupSize: seed.groupSize,
          requirements: seed.requirements,
          tags: seed.tags,
          status: seed.status,
        },
      });
    }
  }

  console.log(
    `seeded ${personas.length} personas${withSeeds ? `, ${personaSeeds.length} seeds` : " (personas only)"}`
  );
}

main();
