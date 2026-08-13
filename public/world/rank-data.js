// 校园风物榜 · mock 数据层（演示分支，不接后端）
// 世界观约束：榜单只排「种子/行动/地点」，永不排名个人；开花 = 双方确认完成的真实行动。
// 坐标为手绘地图 viewBox（0–100）内的百分比位置，非真实经纬度。
(function () {
  "use strict";

  const spots = [
    {
      id: "qizhen-lake", name: "启真湖", kind: "水系", x: 46, y: 47,
      seeds: 186, blooms: 63, tone: "blue",
      vibe: "环湖慢跑与落日长椅",
      topAction: "环湖夜跑 3 公里",
    },
    {
      id: "lovers-slope", name: "大草坪", kind: "草坪", x: 63, y: 60,
      seeds: 142, blooms: 58, tone: "pink",
      vibe: "野餐垫、吉他和晚霞",
      topAction: "落日野餐会",
    },
    {
      id: "library", name: "基础图书馆", kind: "学习", x: 40, y: 33,
      seeds: 231, blooms: 74, tone: "gold",
      vibe: "自习搭子的大本营",
      topAction: "期末互相监督自习",
    },
    {
      id: "moon-building", name: "月牙楼", kind: "地标", x: 30, y: 52,
      seeds: 87, blooms: 29, tone: "sage",
      vibe: "建筑系的月亮与写生角",
      topAction: "月牙楼写生两小时",
    },
    {
      id: "east-teaching", name: "东教学楼群", kind: "教学", x: 72, y: 34,
      seeds: 118, blooms: 35, tone: "sage",
      vibe: "晚课后顺路的小组讨论",
      topAction: "课后拼一节讨论室",
    },
    {
      id: "gymnasium", name: "紫金港体育馆", kind: "运动", x: 22, y: 26,
      seeds: 164, blooms: 61, tone: "green",
      vibe: "羽毛球与新手友好篮球",
      topAction: "羽毛球双打找搭子",
    },
    {
      id: "track-field", name: "田径场", kind: "运动", x: 15, y: 66,
      seeds: 96, blooms: 41, tone: "green",
      vibe: "夜跑打卡与拉伸圈",
      topAction: "晚九点操场夜跑",
    },
    {
      id: "lantian", name: "蓝田学园", kind: "生活", x: 82, y: 55,
      seeds: 73, blooms: 22, tone: "gold",
      vibe: "楼下奶茶与桌游局",
      topAction: "宿舍桌游之夜",
    },
    {
      id: "north-street", name: "北门生活区", kind: "生活", x: 68, y: 18,
      seeds: 88, blooms: 27, tone: "pink",
      vibe: "宵夜拼桌的起点",
      topAction: "周五宵夜拼桌",
    },
  ];

  // 每周校园行动气象（数字用于 count-up 动效）
  const weather = {
    campus: "浙江大学 · 紫金港校区",
    week: "8 月 · 第 2 周",
    seeds: 1185,          // 本周种下
    sprouts: 428,         // 成局发芽
    blooms: 217,          // 确认完成开花
    reseeds: 66,          // 再约一次
  };

  // 榜单一：种下最多（按种子聚类，非个人）
  const planted = [
    { title: "期末互相监督自习", type: "学习", spot: "library", count: 231, delta: +2, note: "三楼靠窗位是热门集合点" },
    { title: "环湖夜跑 3 公里", type: "运动", spot: "qizhen-lake", count: 186, delta: 0, note: "晚 9 点起步，配速全靠商量" },
    { title: "羽毛球双打找搭子", type: "运动", spot: "gymnasium", count: 164, delta: +1, note: "新手场固定在周三晚" },
    { title: "落日野餐会", type: "户外", spot: "lovers-slope", count: 142, delta: -2, note: "野餐垫比想象中更容易借到" },
    { title: "课后拼一节讨论室", type: "学习", spot: "east-teaching", count: 118, delta: +3, note: "拼齐 4 人就能预约" },
    { title: "晚九点操场夜跑", type: "运动", spot: "track-field", count: 96, delta: -1, note: "跑完顺路买杯冰豆浆" },
    { title: "周五宵夜拼桌", type: "生活", spot: "north-street", count: 88, delta: +1, note: "四个人起拼，谁都别咕" },
    { title: "月牙楼写生两小时", type: "文艺", spot: "moon-building", count: 87, delta: +4, note: "画具可以互相借" },
    { title: "宿舍桌游之夜", type: "生活", spot: "lantian", count: 73, delta: -2, note: "三国杀与狼人杀之争仍未平息" },
    { title: "清晨鸟类观察漫步", type: "自然", spot: "qizhen-lake", count: 58, delta: +5, note: "据说看到过夜鹭抓鱼" },
  ];

  // 榜单二：开花最多（双方确认完成的行动）
  const bloomed = [
    { title: "期末互相监督自习", type: "学习", spot: "library", count: 74, rate: 32, note: "开花率最高的老牌种子" },
    { title: "环湖夜跑 3 公里", type: "运动", spot: "qizhen-lake", count: 63, rate: 34, note: "夜风把坚持变得容易" },
    { title: "羽毛球双打找搭子", type: "运动", spot: "gymnasium", count: 61, rate: 37, note: "打完常常直接约下一场" },
    { title: "落日野餐会", type: "户外", spot: "lovers-slope", count: 58, rate: 41, note: "开花后最常结出新种子" },
    { title: "晚九点操场夜跑", type: "运动", spot: "track-field", count: 41, rate: 43, note: "两人成行，风雨无阻" },
    { title: "课后拼一节讨论室", type: "学习", spot: "east-teaching", count: 35, rate: 30, note: "讨论完顺便把作业分了" },
    { title: "月牙楼写生两小时", type: "文艺", spot: "moon-building", count: 29, rate: 33, note: "交换画本的瞬间最动人" },
    { title: "周五宵夜拼桌", type: "生活", spot: "north-street", count: 27, rate: 31, note: "拼桌名单从不咕" },
    { title: "宿舍桌游之夜", type: "生活", spot: "lantian", count: 22, rate: 30, note: "输的人负责收拾桌子" },
    { title: "清晨鸟类观察漫步", type: "自然", spot: "qizhen-lake", count: 19, rate: 33, note: "早起的人先看到夏天" },
  ];

  // 榜单三：十大最浪漫种子（同学投票 + 花匠注解；AI 只写注解，不参与排序）
  const romantic = [
    { title: "骑车去看钱塘江日落", type: "户外", spot: "qizhen-lake", votes: 892, quote: "风把晚霞吹进后座的笑声里。" },
    { title: "情人坡挑一场流星雨", type: "自然", spot: "lovers-slope", votes: 764, quote: "毯子上的两杯热可可先亮了。" },
    { title: "在月牙楼画同一轮月亮", type: "文艺", spot: "moon-building", votes: 651, quote: "两支笔，一轮月，各画各的温柔。" },
    { title: "雨后环湖找七只白鹭", type: "自然", spot: "qizhen-lake", votes: 588, quote: "第七只一直没出现，于是约了下次。" },
    { title: "图书馆顶楼看晚自习灯海", type: "学习", spot: "library", votes: 512, quote: "原来认真也可以这么好看。" },
    { title: "给对方做一次生日早餐", type: "生活", spot: "lantian", votes: 470, quote: "煎蛋失败三次，笑声成功一整年。" },
    { title: "夜骑去吃校门外第一口烧烤", type: "生活", spot: "north-street", votes: 431, quote: "烤串上桌那刻，谁也没说话。" },
    { title: "操场星空夜聊到熄灯", type: "户外", spot: "track-field", votes: 396, quote: "把心事跑成了两个人的秘密。" },
    { title: "一起补看错过的日出", type: "自然", spot: "lovers-slope", votes: 350, quote: "闹钟响了四个，才凑齐两个人。" },
    { title: "帮彼此拍毕业前的一百张照片", type: "文艺", spot: "moon-building", votes: 322, quote: "第一百张，是互相拍下的对方。" },
  ];

  // 榜单四：十大最值得做（毕业前不做会后悔；社区提名）
  const worthy = [
    { title: "和搭子跑完第一个 5 公里", type: "运动", spot: "track-field", votes: 1024, quote: "一个人跑是坚持，两个人跑是热爱。" },
    { title: "在启真湖看一次完整日出", type: "自然", spot: "qizhen-lake", votes: 933, quote: "紫金港的清晨值得早起一次。" },
    { title: "组队做完一个课外小项目", type: "学习", spot: "east-teaching", votes: 861, quote: "简历上的一行字，回忆里的一整年。" },
    { title: "认真逛完一次校园博物馆", type: "文艺", spot: "moon-building", votes: 745, quote: "在自己校园里当一次游客。" },
    { title: "参加一场毫无经验的比赛", type: "挑战", spot: "gymnasium", votes: 689, quote: "输赢不重要，报名那刻已经赢了。" },
    { title: "给未来的自己写封信", type: "生活", spot: "library", votes: 617, quote: "四年后拆开，字里全是勇气。" },
    { title: "带外地朋友走遍紫金港", type: "生活", spot: "north-street", votes: 552, quote: "讲解校园的时候，才发现自己有多爱它。" },
    { title: "在草坪办一场露天电影", type: "文艺", spot: "lovers-slope", votes: 508, quote: "幕布会皱，月亮不会。" },
    { title: "学会一项完全陌生的运动", type: "运动", spot: "gymnasium", votes: 471, quote: "摔倒的次数，都是新世界的敲门声。" },
    { title: "和陌生同学完成一次行动", type: "挑战", spot: "qizhen-lake", votes: 435, quote: "这颗种子，就是社交森林的全部意义。" },
  ];

  window.RankData = { spots, weather, boards: { planted, bloomed, romantic, worthy } };
})();
