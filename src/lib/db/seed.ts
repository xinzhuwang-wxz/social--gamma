/**
 * 候选池种子数据：8 名校园人物 + 各自已发布的行动种子。
 * 这是真实入库数据（demo 内容），对它们的一切 AI 评估都真实调用 LLM。
 * 运行：pnpm db:seed（可重复执行，按 id upsert）
 */
import { db, schema } from "./client";

const now = () => new Date();

const personas: (typeof schema.users.$inferInsert)[] = [
  {
    id: "p_xiaolan",
    name: "小蓝",
    emoji: "🏔️",
    color: "#B8C88A",
    grade: "大三",
    major: "地理信息科学",
    bio: "周末不是在山上，就是在去山上的路上",
    traits: {
      interests: ["徒步", "露营", "野外摄影", "地图"],
      schedule: "周六全天有空，周日下午要开组会",
      vibe: "行动派，说走就走，喜欢提前把路线做成攻略",
      experiences: ["走过徽杭古道", "校登山社领队一年", "上学期组织过 3 次夜爬"],
    },
    isPersona: true,
    createdAt: now(),
  },
  {
    id: "p_xiaoyu",
    name: "小雨",
    emoji: "🎭",
    color: "#DCE3AE",
    grade: "大二",
    major: "汉语言文学",
    bio: "剧场常客，也想试试从观众席走到户外",
    traits: {
      interests: ["话剧", "音乐剧", "写作", "轻徒步"],
      schedule: "周中晚上和周日比较自由",
      vibe: "慢热但靠谱，答应的事一定到",
      experiences: ["看过 30+ 场话剧", "校刊编辑", "第一次露营是上个月"],
    },
    isPersona: true,
    createdAt: now(),
  },
  {
    id: "p_ajie",
    name: "阿杰",
    emoji: "📷",
    color: "#D7B67A",
    grade: "研一",
    major: "计算机科学",
    bio: "骑车带相机，代码写累了就出门拍晚霞",
    traits: {
      interests: ["公路骑行", "摄影", "咖啡", "开源项目"],
      schedule: "周末两天都行，平时晚上 9 点后有空",
      vibe: "话不多但细心，愿意帮大家拍照",
      experiences: ["环过千岛湖", "骑行社器材管理", "给社团拍过纳新宣传片"],
    },
    isPersona: true,
    createdAt: now(),
  },
  {
    id: "p_tongtong",
    name: "彤彤",
    emoji: "🍰",
    color: "#F4ECD7",
    grade: "大一",
    major: "食品科学",
    bio: "美食雷达，探店笔记写了半本",
    traits: {
      interests: ["探店", "烘焙", "桌游", "citywalk"],
      schedule: "除了周三满课，其他时间都好约",
      vibe: "自来熟，组局气氛担当",
      experiences: ["校门口 20 家店全打卡", "宿舍烤箱主理人", "组织过两次桌游夜"],
    },
    isPersona: true,
    createdAt: now(),
  },
  {
    id: "p_laoxu",
    name: "老徐",
    emoji: "🏸",
    color: "#CCD56F",
    grade: "大四",
    major: "机械工程",
    bio: "羽毛球十年，最近在找固定球搭子",
    traits: {
      interests: ["羽毛球", "健身", "钓鱼", "纪录片"],
      schedule: "工作日下午实习，晚上 7 点后和周末有空",
      vibe: "稳定输出型，风雨无阻",
      experiences: ["院队主力", "带过零基础同学入门", "校赛男双八强"],
    },
    isPersona: true,
    createdAt: now(),
  },
  {
    id: "p_nana",
    name: "娜娜",
    emoji: "🎨",
    color: "#DCE3AE",
    grade: "大二",
    major: "视觉传达",
    bio: "速写本不离身，想找人一起写生",
    traits: {
      interests: ["写生", "看展", "手帐", "爬山"],
      schedule: "周六上午有课，周日全天自由",
      vibe: "安静但好相处，喜欢边画边聊",
      experiences: ["美术馆志愿者", "画过校园手绘地图", "上周刚爬了北高峰"],
    },
    isPersona: true,
    createdAt: now(),
  },
  {
    id: "p_dawei",
    name: "大伟",
    emoji: "⚽",
    color: "#B8C88A",
    grade: "大三",
    major: "体育教育",
    bio: "球场常驻，也想试试山野",
    traits: {
      interests: ["足球", "跑步", "徒步", "剧本杀"],
      schedule: "周二周四晚训练，周末看比赛安排",
      vibe: "热情外向，体力担当",
      experiences: ["院队前锋", "半马 1:45", "没爬过大山但很想去"],
    },
    isPersona: true,
    createdAt: now(),
  },
  {
    id: "p_qiqi",
    name: "琪琪",
    emoji: "🌿",
    color: "#D8DE83",
    grade: "研二",
    major: "生态学",
    bio: "认识校园里每一棵树，想认识更多人",
    traits: {
      interests: ["自然观察", "观鸟", "植物", "徒步", "拍立得"],
      schedule: "实验室弹性打卡，周末基本自由",
      vibe: "温和耐心，冷知识很多",
      experiences: ["做过自然导览", "观鸟记录 87 种", "常一个人走植物园"],
    },
    isPersona: true,
    createdAt: now(),
  },
];

const personaSeeds: (typeof schema.seeds.$inferInsert)[] = [
  {
    id: "s_xiaolan_hike",
    ownerId: "p_xiaolan",
    title: "周六一起去爬山",
    what: "爬学校周边的山，走成熟路线，山顶野餐后原路返回",
    whenText: "周六 8:30 出发，下午返回",
    whereText: "学校周边，车程 1 小时内",
    groupSize: "3-4人",
    requirements: {
      must: ["当天全程参与", "接受早起"],
      flexible: ["路线可以商量", "新手也欢迎，我可以带"],
    },
    tags: ["户外", "徒步"],
    status: "matching",
    createdAt: now(),
  },
  {
    id: "s_xiaoyu_drama",
    ownerId: "p_xiaoyu",
    title: "一起去看话剧",
    what: "市中心大剧院的口碑剧目，看完找家店聊聊感受",
    whenText: "周日 19:00",
    whereText: "市中心大剧院",
    groupSize: "2-3人",
    requirements: {
      must: ["自己买票", "看完愿意聊聊"],
      flexible: ["场次可以一起挑", "吃不吃饭都行"],
    },
    tags: ["文艺", "话剧"],
    status: "matching",
    createdAt: now(),
  },
  {
    id: "s_ajie_ride",
    ownerId: "p_ajie",
    title: "周末骑行环湖",
    what: "环西湖骑行，中途停两三个机位拍照，节奏轻松",
    whenText: "周日 9:00 出发",
    whereText: "西湖环线",
    groupSize: "2-4人",
    requirements: {
      must: ["有自己的车或愿意租车", "能骑 30km"],
      flexible: ["拍照可多可少", "午饭地点随缘"],
    },
    tags: ["户外", "骑行", "摄影"],
    status: "matching",
    createdAt: now(),
  },
  {
    id: "s_laoxu_badminton",
    ownerId: "p_laoxu",
    title: "找固定羽毛球搭子",
    what: "每周打 1-2 次球，希望长期稳定，水平入门以上即可",
    whenText: "周三或周五晚 7-9 点",
    whereText: "校体育馆",
    groupSize: "2人",
    requirements: {
      must: ["能长期稳定参加", "自备球拍"],
      flexible: ["水平不限，可以互相喂球", "具体哪天可调"],
    },
    tags: ["运动", "羽毛球"],
    status: "matching",
    createdAt: now(),
  },
];

async function main() {
  for (const p of personas) {
    await db.insert(schema.users).values(p).onConflictDoUpdate({
      target: schema.users.id,
      set: { name: p.name, bio: p.bio, traits: p.traits, emoji: p.emoji },
    });
  }
  // SEED_PERSONAS_ONLY=1：只写登录身份，不写人工预设种子（仿真同伴引擎驱动一切）。
  // 无仿真回归（SIM_MODE=0）仍需 persona 作候选池，但种子由测试脚本自建，故预设种子非必需。
  const withSeeds = process.env.SEED_PERSONAS_ONLY !== "1";
  if (withSeeds) {
    for (const s of personaSeeds) {
      await db.insert(schema.seeds).values(s).onConflictDoNothing();
    }
  }
  console.log(
    `seeded ${personas.length} personas${withSeeds ? `, ${personaSeeds.length} seeds` : " (personas only)"}`
  );
}

main();
