const MAIL_READ_KEY = "cobloom.mailbox.read.v1";
const DISPLAY_GARDEN_KEY = "cobloom.display-garden.v2";
const DISPLAY_GARDEN_CAPACITY = 6;

function unreadMailCount() {
  try { return localStorage.getItem(MAIL_READ_KEY) === "1" ? 0 : 3; }
  catch { return 3; }
}

function markMailboxRead() {
  ui.unreadMail = 0;
  try { localStorage.setItem(MAIL_READ_KEY, "1"); } catch {}
}

function receiveCaughtSeed(seed) {
  if (!seed || seeds.some(item => item.id === seed.id)) return;
  seeds.unshift(seed);
  ui.unreadMail += 1;
  try { localStorage.removeItem(MAIL_READ_KEY); } catch {}
  const mailbox = document.querySelector(".garden-world-screen .mailbox-object");
  if (!mailbox) return;
  let notice = mailbox.querySelector(".mail-notice");
  if (!notice) {
    mailbox.insertAdjacentHTML("beforeend", `<span class="mail-notice"><img src="assets/nav-mailbox-v2.png" alt=""><b>${ui.unreadMail}</b></span>`);
    notice = mailbox.querySelector(".mail-notice");
  } else {
    notice.querySelector("b").textContent = ui.unreadMail;
  }
  mailbox.classList.remove("seed-arrived");
  mailbox.getBoundingClientRect();
  mailbox.classList.add("seed-arrived");
  setTimeout(() => mailbox.classList.remove("seed-arrived"), 900);
}

const initialUi = () => {
  const unreadMail = unreadMailCount();
  return ({
  tab: "garden",
  route: null,
  toast: "",
  loading: false,
  publishStep: 0,
  selectedDate: "",
  selectedPeriod: "",
  draft: {
    idea: "",
    time: "",
    place: "",
    people: "2–4 人",
    companion: "",
    habit: "",
    activityDetail: "",
  },
  activityQuestion: "",
  activityOptions: [],
  activityQuestionLoading: false,
  activityQuestionError: false,
  proposalsOpen: false,
  completionOpen: false,
  memoryText: "",
  mailboxMode: "received",
  mailboxOverlay: false,
  welcomeLetter: unreadMail > 0,
  unreadMail,
  openingObject: "",
  decorated: false,
  petMood: "idle",
  profileReturn: null,
  memoryReturn: null,
  forestLevel: "all",
  forestPerson: "all",
  activeGardenMode: "mine",
  activeGardenPartnerId: null,
  gardenSwitcherOpen: false,
  gardenSwitcherTab: "shared",
  });
};

let ui = initialUi();
let server = { stage: "SEED", published: false, selectedCandidate: null, messages: [], slots: { people: false, time: false, place: false }, checkedIn: false, archived: false };
let bloomFusion = { progression: [], candidates: [], fusions: [] };
let displayGarden = readDisplayGarden();
let toastTimer;

const seeds = [
  { id: "hike", title: "周六一起去爬山", type: "户外", time: "周六 08:30", place: "学校周边", peer: "小蓝", color: "sage", asset: "flower-1.png", petAsset: "pet-mail.png", preview: "看到你也想去爬山，要不要一起走一条轻松的路线？", letter: "嗨，小周：\n\n看到你也想在周六出去走走。我去过磨山两次，有一条不陡、沿途也很好拍照的路线。我们可以慢慢走，累了就停下来看看风景，新手也完全没问题。\n\n如果你愿意，我们周六早上从学校北门出发，当天回来。", tags: ["新手友好", "当天往返"], reason: "你们周六上午都有空，都接受新手路线，也都希望当天往返。" },
  { id: "show", title: "一起去看话剧", type: "文艺", time: "周日 19:00", place: "市中心大剧院", peer: "小雨", color: "pink", asset: "flower-2.png", petAsset: "pet-talk.png", preview: "我刚好也收藏了这部剧，散场后还可以一起聊聊。", letter: "小周，你好：\n\n我发现我们都收藏了周日晚上的那场话剧。我已经买好票了，旁边的位置还空着。如果你也想去，我们可以提前半小时在剧院门口碰面。\n\n散场后要是不太晚，还可以找个安静的地方聊聊最喜欢的片段。", tags: ["已有票", "周日晚"], reason: "你们收藏了同一部剧，也都偏好周日晚上出发。" },
  { id: "ride", title: "周末骑行环湖", type: "运动", time: "周日 09:00", place: "西湖环线", peer: "阿杰", color: "gold", asset: "flower-3.png", petAsset: "pet-idle.png", preview: "想约一次不赶速度的环湖骑行，二十公里左右。", letter: "嗨：\n\n这周日天气看起来不错，想找一位搭子轻松环湖。不追配速，大约二十公里，中间会停下来喝水和拍照。\n\n如果你的车需要简单检查，我也可以提前帮忙看看胎压和刹车。", tags: ["轻松骑行", "20 km"], reason: "你们都接受 20 公里轻量路线，空闲时段有 3 小时重合。" },
];

const gardenPlants = {
  current: { title: "周六一起爬磨山", status: "active", asset: "tree.png", peer: "小蓝", date: "本周六", copy: "时间和地点还在确认中。回到行动群聊继续推进。" },
  hackathon: { title: "酒店大堂里亮到清晨的黑客松", status: "memory", peer: "饭团、Lion、Bamboo", date: "2026 年 8 月 13 日", copy: "四台电脑挨在一起，一个刚有轮廓的念头就在这里慢慢变成了作品。" },
  ride: { title: "沿着西湖骑完一整圈夜风", status: "memory", peer: "饭团、迟野", date: "2026 年 8 月 7 日", copy: "照片里没有风，但看到树影和车灯，还是会想起那晚。" },
  music: { title: "草坪上那场没有围墙的音乐会", status: "memory", peer: "饭团、Lion、白羽", date: "2026 年 5 月 22 日", copy: "灯串亮起来以后，坐在草地上的人谁都没有急着走。" },
  worldcup: { title: "在天亮以前看完世界杯决赛", status: "memory", peer: "饭团、Lion、迟野、Bamboo", date: "2026 年 7 月 20 日", copy: "有人记得比分，也有人只记得终场前那阵一起响起来的欢呼。" },
  gelato: { title: "坐很远的车去吃一支 Gelato", status: "memory", peer: "饭团、橘子汽水", date: "2026 年 6 月 27 日", copy: "冰淇淋吃得很快，往返的路却把一个下午装得刚刚好。" },
  tulip: { title: "去太子湾追上花期末尾的郁金香", status: "memory", peer: "饭团、橘子汽水、小满", date: "2026 年 3 月 29 日", copy: "花期快结束，不等于春天已经结束。" },
  photo: { title: "在花落完以前替朋友拍人像", status: "memory", asset: "flower-4.png", peer: "Bamboo、橘子汽水", date: "2026 年 4 月 5 日", copy: "花瓣落在肩上时，我们刚好在笑一个很普通的笑话。" },
  study: { title: "用一卷胶片拍完校园的夏天", status: "memory", asset: "flower-3.png", peer: "橘子汽水、小满", date: "2026 年 6 月 19 日", copy: "不能重拍以后，我反而更敢按快门了。" },
};

function readDisplayGarden() {
  try {
    const value = JSON.parse(localStorage.getItem(DISPLAY_GARDEN_KEY) || "null");
    return Array.isArray(value) ? value.slice(0, DISPLAY_GARDEN_CAPACITY) : ["hackathon", "ride", "music", "worldcup", "gelato", "tulip"];
  } catch { return ["hackathon", "ride", "music", "worldcup", "gelato", "tulip"]; }
}

function saveDisplayGarden() {
  try { localStorage.setItem(DISPLAY_GARDEN_KEY, JSON.stringify(displayGarden)); } catch {}
}

function flowerInventory() {
  const base = [
    { id: "hackathon", memoryId: "hackathon", title: gardenPlants.hackathon.title, partnerId: "partner_bamboo", partnerName: "饭团、Lion、Bamboo", level: 1, tierName: "经历花", image: "/world/generated/flower_hackathon-l1.png", copy: gardenPlants.hackathon.copy, generated: true },
    { id: "ride", memoryId: "ride", title: gardenPlants.ride.title, partnerId: "partner_riceball", partnerName: "饭团、迟野", level: 1, tierName: "经历花", image: "/world/generated/flower_ride-l1.png", copy: gardenPlants.ride.copy, generated: true },
    { id: "music", memoryId: "music", title: gardenPlants.music.title, partnerId: "partner_lion", partnerName: "饭团、Lion、白羽", level: 1, tierName: "经历花", image: "/world/generated/flower_music-l1.png", copy: gardenPlants.music.copy, generated: true },
    { id: "worldcup", memoryId: "worldcup", title: gardenPlants.worldcup.title, partnerId: "partner_riceball", partnerName: "饭团、Lion、迟野、Bamboo", level: 1, tierName: "经历花", image: "/world/generated/flower_worldcup-l1.png", copy: gardenPlants.worldcup.copy, generated: true },
    { id: "gelato", memoryId: "gelato", title: gardenPlants.gelato.title, partnerId: "partner_orange", partnerName: "饭团、橘子汽水", level: 1, tierName: "经历花", image: "/world/generated/flower_gelato-l1.png", copy: gardenPlants.gelato.copy, generated: true },
    { id: "tulip", memoryId: "tulip", title: gardenPlants.tulip.title, partnerId: "partner_orange", partnerName: "饭团、橘子汽水、小满", level: 1, tierName: "经历花", image: "/world/generated/flower_tulip-l1.png", copy: gardenPlants.tulip.copy, generated: true },
    { id: "photo", memoryId: "photo", title: gardenPlants.photo.title, partnerId: "partner_orange", partnerName: "橘子汽水", level: 1, tierName: "经历花", image: "/world/generated/flower_photo-l1.png", copy: gardenPlants.photo.copy, generated: true },
    { id: "study", memoryId: "study", title: gardenPlants.study.title, partnerId: "partner_orange", partnerName: "橘子汽水", level: 1, tierName: "经历花", image: "/world/generated/flower_film-l1.png", copy: gardenPlants.study.copy, generated: true },
  ];
  const relationships = bloomFusion.fusions.map(fusion => ({
    id: fusion.id,
    memoryId: null,
    fusionPartnerId: fusion.partnerId,
    title: fusion.title,
    partnerId: fusion.partnerId,
    partnerName: fusion.partnerName,
    level: fusion.tier.level,
    tierName: fusion.tier.name,
    image: fusion.artwork.url || fusion.artwork.request.referenceImages[0],
    copy: fusion.storyBridge,
    generated: true,
  }));
  return [...relationships, ...base];
}

function gardenPeople() {
  const order = [
    { id: "partner_orange", name: "橘子汽水", note: "Gelato 与太子湾的春天" },
    { id: "partner_riceball", name: "饭团", note: "西湖夜骑与世界杯终场" },
    { id: "partner_lion", name: "Lion", note: "草坪音乐与现场灯光" },
    { id: "partner_bamboo", name: "Bamboo", note: "通宵黑客松与晋级合照" },
  ];
  const inventory = flowerInventory();
  return order.map(person => ({ ...person, flowers: inventory.filter(flower => flower.partnerId === person.id) }));
}

function friendGardenInventory(partnerId) {
  const gardens = {
    partner_orange: [
      { id: "orange-own-photo", title: "花落以前的那次拍摄", level: 1, tierName: "经历花", image: "/world/generated/flower_photo-l1.png", generated: true, visitorOnly: true },
      { id: "orange-own-market", title: "清晨花市的柑橘香", level: 1, tierName: "经历花", image: "/world/assets/flower-5.png", visitorOnly: true },
      { id: "orange-own-rooftop", title: "天台晾晒的一卷夏天", level: 2, tierName: "双生花", image: "/world/assets/flower-7.png", visitorOnly: true },
    ],
    partner_riceball: [
      { id: "riceball-own-ride", title: "沿湖骑行的晚风", level: 1, tierName: "经历花", image: "/world/assets/flower-1.png", visitorOnly: true },
      { id: "riceball-own-gelato", title: "坐很远的车去吃 Gelato", level: 1, tierName: "经历花", image: "/world/assets/flower-6.png", visitorOnly: true },
      { id: "riceball-own-camp", title: "帐篷外亮到很晚的灯", level: 1, tierName: "经历花", image: "/world/assets/flower-3.png", visitorOnly: true },
    ],
    partner_rain: [
      { id: "rain-own-music", title: "夏夜草地音乐会", level: 1, tierName: "经历花", image: "/world/assets/flower-8.png", visitorOnly: true },
      { id: "rain-own-theatre", title: "谢幕后没有立刻离场", level: 1, tierName: "经历花", image: "/world/assets/flower-2.png", visitorOnly: true },
      { id: "rain-own-song", title: "交换一首循环很久的歌", level: 2, tierName: "双生花", image: "/world/assets/flower-4.png", visitorOnly: true },
    ],
  };
  return gardens[partnerId] || [];
}

function toggleFlowerInDisplayGarden(flowerId) {
  if (displayGarden.includes(flowerId)) {
    displayGarden = displayGarden.filter(id => id !== flowerId);
    saveDisplayGarden();
    return { planted: false };
  }
  if (displayGarden.length >= DISPLAY_GARDEN_CAPACITY) return { full: true };
  displayGarden = [...displayGarden, flowerId];
  saveDisplayGarden();
  return { planted: true };
}

const memoryJournals = {
  hackathon: {
    number: "0813",
    kicker: "凌晨四点仍然亮着的花",
    date: "2026 年 8 月 12—13 日",
    place: "比赛酒店大堂",
    participants: ["一寸欢喜", "饭团", "Lion", "Bamboo"],
    note: "最先留下来的是一张很安静的照片：四台电脑在酒店大堂的圆桌边挨着亮。后来桌面换成了吃完的烧烤，再后来，四个人站到展位前，把手机里已经跑起来的 StyleCapture 一起递向镜头。通宵当然很累，可一个原本只在聊天里打转的想法，真的在这个晚上有了形状，也有了下一程。",
    quote: "四台电脑亮过通宵，一个想法也终于有了名字。",
    quoteLabel: "小花根据已确认材料整理",
    chat: ["可引用聊天暂未提交。", "等参与者确认后再补进这页。"],
    chatLabel: "这次没有补写聊天记录",
    photos: ["/world/event-media/hackathon/cover.jpg", "/world/event-media/hackathon/detail-1.jpg", "/world/event-media/hackathon/detail-2.jpg"],
    captions: ["深夜的大堂 · 四台电脑还亮着", "展示现场 · 四个人和做出来的作品", "补给时间 · 通宵里的那顿烧烤"],
    flower: "/world/generated/flower_hackathon-l1.png",
    evidence: ["3 张本次上传的事件照片", "活动日期、地点与参与者", "项目名称与晋级结果"],
  },
  ride: {
    number: "0807",
    kicker: "追着晚风生长的花",
    date: "2026 年 8 月 7 日",
    place: "西湖沿线",
    participants: ["一寸欢喜", "饭团", "迟野"],
    note: "夜里的西湖边，树影把路灯切成一段一段。大家跟着车流往前骑，在湖边停下来拍了会儿水面，也看见岸边那棵像路标一样的树。照片里没有风，却有被灯照亮的车、安静的湖和还没准备回去的人。骑到可以掉头的地方，最后还是继续把这一圈走完了。",
    quote: "照片里没有风，但我每次看见它都能想起那晚。",
    chat: ["都骑到这里了，要不要把这一圈骑完？", "那就完整一圈。"],
    photos: ["/world/event-media/ride/cover.jpg", "/world/event-media/ride/detail-1.jpg", "/world/event-media/ride/detail-2.jpg"],
    captions: ["夜骑开始 · 路灯下的人和车", "湖边停靠 · 柳树与水面的灯", "短暂休息 · 几辆车挨在栏杆边"],
    flower: "/world/generated/flower_ride-l1.png",
    evidence: ["3 张本次上传的事件照片", "活动日期、地点与参与者", "1 条本人感言", "2 句获准收录的聊天"],
  },
  music: {
    number: "0522",
    kicker: "没有节目单的歌",
    date: "2026 年 5 月 22 日",
    place: "校园草坪",
    participants: ["一寸欢喜", "饭团", "Lion", "白羽"],
    note: "天还没完全黑时，操场边的人只是三三两两地坐着。等灯串亮起来，草坪中央围出了小小的舞台，话筒和歌声把越来越多的人留了下来。有人站在前面唱，有人举着荧光棒跟拍子晃，也有人安静坐到最后。那晚没有宏大的布景，草地、树和一圈暖黄的灯就够了。",
    quote: "有一首歌，回去以后我又听了很多遍。",
    chat: ["下一首你来选。", "等这首唱完再走吧。"],
    photos: ["/world/event-media/music/cover.jpg", "/world/event-media/music/detail-1.jpg", "/world/event-media/music/detail-2.jpg"],
    captions: ["傍晚的操场 · 人群还在慢慢聚拢", "草坪舞台 · 灯串亮起来以后", "散场以前 · 观众围坐在树下"],
    flower: "/world/generated/flower_music-l1.png",
    evidence: ["3 张本次上传的事件照片", "活动日期、地点与参与者", "1 条本人感言"],
  },
  worldcup: {
    number: "0720",
    kicker: "哨声和天光一起到来的花",
    date: "2026 年 7 月 20 日",
    place: "酒店公共活动区",
    participants: ["饭团", "Lion", "迟野", "Bamboo"],
    note: "比赛开始前，大家把小小的世界杯摆件、饮料和零食都放到屏幕下面，像认真给这一晚搭了个临时看台。转播里的草坪亮得刺眼，屋里却一直是深夜的颜色。中间有人争一脚越位，也有人紧张得忘了碰桌上的瓜子；等终场哨响，最先记住的不是精确比分，而是那阵同时从座位上起来的声音。",
    quote: "有人记得比分，也有人只记得天亮前那阵欢呼。",
    chat: ["刚刚为什么不算？", "越位。"],
    photos: ["/world/event-media/worldcup/cover.jpg", "/world/event-media/worldcup/detail-1.jpg", "/world/event-media/worldcup/detail-2.jpg"],
    captions: ["开赛以后 · 屏幕前的临时看台", "比赛进行中 · 零食还剩一半", "终场以前 · 小小的世界杯布置"],
    flower: "/world/generated/flower_worldcup-l1.png",
    evidence: ["3 张本次上传的事件照片", "活动日期、地点与参与者", "1 条本人感言", "2 句获准收录的聊天"],
  },
  gelato: {
    number: "0627",
    kicker: "为了十分钟出发三小时的花",
    date: "2026 年 6 月 27 日",
    place: "杭州另一端的 Gelato 小店",
    participants: ["一寸欢喜", "饭团", "橘子汽水"],
    note: "真正吃 Gelato 的时间很短：纸杯放在蓝绿色小桌上，蛋卷脆筒斜斜插在浅粉、米白和开心果绿的冰淇淋里；另外两张照片里，刚盛好的纸杯还在柜台边。往返的路比坐在店里的时间长得多，可也正因为有人愿意一起上车，这个有点不划算的下午才变得很值得。",
    quote: "店很小，但去那里的路很长，刚刚好。",
    chat: ["真的要坐这么远吗？", "都已经查到路线了。"],
    photos: ["/world/event-media/gelato/cover.jpg", "/world/event-media/gelato/detail-1.jpg", "/world/event-media/gelato/detail-2.jpg"],
    captions: ["刚坐下来 · 三种颜色挤在小桌上", "第一口以前 · 开心果绿和米白", "柜台边 · 两杯刚刚递到手里"],
    flower: "/world/generated/flower_gelato-l1.png",
    evidence: ["3 张本次上传的事件照片", "活动日期、地点与参与者", "1 条本人感言", "2 句获准收录的聊天"],
  },
  tulip: {
    number: "0329",
    kicker: "差一点错过春天的花",
    date: "2026 年 3 月 29 日",
    place: "太子湾公园",
    participants: ["一寸欢喜", "饭团", "橘子汽水", "小满"],
    note: "到了太子湾才发现，春天并不是只长成一种样子。入口附近还有大片红色、粉色和白色的郁金香，走到水边，视线又被一圈紫色鸢尾和树影接住。花期确实已经往后走了，可阳光照在花瓣上时，谁也不觉得这趟来晚了。照片还把远处的小路、草坡和坐在树下的人一起留了下来。",
    quote: "花期快结束，不等于春天结束。",
    chat: ["你们在哪一片红色郁金香？", "这里全是红色的。"],
    photos: ["/world/event-media/tulip/cover.jpg", "/world/event-media/tulip/detail-1.jpg", "/world/event-media/tulip/detail-2.jpg"],
    captions: ["太子湾入口 · 春天铺满了草坪", "花丛近处 · 粉色郁金香还开着", "走到水边 · 鸢尾与树影围住池塘"],
    flower: "/world/generated/flower_tulip-l1.png",
    evidence: ["3 张本次上传的事件照片", "图片明确出现郁金香", "活动日期、地点与参与者", "1 条本人感言", "2 句获准收录的聊天"],
  },
  photo: {
    kicker: "来得及被春天看见的花",
    date: "2026 年 4 月 5 日",
    place: "校园樱花道",
    participants: ["一寸欢喜", "Bamboo", "橘子汽水"],
    note: "一寸欢喜举着相机，橘子汽水拿速写本找位置。Bamboo 没看镜头，只是被一句很普通的笑话逗笑，花瓣也刚好落在肩上。我们最后留下的，偏偏是没有排练过的那张。",
    quote: "我确认，当时只是因为一个很普通的笑话。",
    chat: ["不要看镜头。", "对，就是现在。"],
    captions: ["肩上的花瓣 · 本人确认的人像", "玻璃倒影 · 摄影者也在照片里"],
    evidence: ["活动日期与地点", "3 张参与者确认的照片", "1 条本人感言", "2 句获准收录的聊天"],
  },
  study: {
    kicker: "只按一次快门的夏天",
    date: "2026 年 6 月 19 日",
    place: "校园各处",
    participants: ["一寸欢喜", "橘子汽水", "小满"],
    note: "一卷胶片分给三个人，不能回看，也不能重拍。旧教学楼墙上的树影、跑起来有点失焦的朋友、被风吹翻的一片叶子，都只有那一个版本。糊掉的那格没有被删掉，因为那一秒确实发生过。",
    quote: "不能重拍以后，我反而更敢按快门了。",
    chat: ["刚刚那张好像糊了。", "糊掉也是那一秒真的发生过。"],
    captions: ["旧教学楼 · 墙面上的树影", "奔跑的人 · 略微失焦的一格"],
    evidence: ["一卷胶片的活动规则", "3 张参与者确认的照片", "1 条本人感言", "2 句获准收录的聊天"],
  },
};

const publicGardens = {
  小蓝: { pet: "pet-water.png", tagline: "喜欢不赶时间的轻徒步，也会照顾第一次爬山的人。", flowers: ["flower-1.png", "flower-4.png", "flower-7.png"], interests: ["轻徒步", "沿途拍照", "当天往返"], memories: ["磨山的雾和热干面", "第一次带新手走完整条线"] },
  小雨: { pet: "pet-talk.png", tagline: "常去剧场和小型演出，散场后喜欢慢慢聊一会儿。", flowers: ["flower-2.png", "flower-5.png", "flower-8.png"], interests: ["话剧", "现场音乐", "城市散步"], memories: ["没有节目单的草坪歌会", "散场后走回学校的一晚"] },
  阿杰: { pet: "pet-idle.png", tagline: "骑车不追配速，路上看到好光线会停下来拍照。", flowers: ["flower-3.png", "flower-6.png", "flower-1.png"], interests: ["骑行", "摄影", "修车"], memories: ["西湖完整一圈", "帮朋友补好第一条内胎"] },
  饭团: { pet: "pet-mail.png", tagline: "会为一个临时起意认真查路线，也愿意陪朋友多走一段。", flowers: ["flower-1.png", "flower-6.png", "flower-8.png"], interests: ["夜骑", "烧烤", "看球"], memories: ["绕湖一整圈的晚风", "窗外发白时的终场哨"] },
  迟野: { pet: "pet-walk.png", tagline: "偏爱夜晚和清晨，背包里常有一瓶汽水。", flowers: ["flower-4.png", "flower-3.png", "flower-7.png"], interests: ["夜骑", "日出", "城市醒来"], memories: ["第一班车的空座位", "绕湖轨迹合上的那一刻"] },
};

const candidates = [
  { name: "小林", avatar: "林", match: "经验匹配", note: "有稳定的同行记录", facts: ["周六上午有空", "完成过 6 次结伴行动", "会提前确认安排"], reason: "过往行动中守时、会照顾同行节奏，这次时间与活动偏好也吻合。" },
  { name: "小雨", avatar: "雨", match: "地点匹配", note: "喜欢户外活动", facts: ["周六全天有空", "户外新手", "从学校出发"], reason: "她想尝试短途徒步，集合地点与你一致。" },
  { name: "阿杰", avatar: "杰", match: "兴趣匹配", note: "体力好，摄影爱好者", facts: ["周六 10 点后有空", "有带队经验", "当天往返"], reason: "路线经验和摄影兴趣匹配，但出发时间需要微调。" },
];

const stageMeta = {
  SEED: ["种子", "正在寻找同行者"],
  SPROUT: ["发芽", "你们刚刚成为搭子"],
  LEAF: ["长叶", "第一次真人对话发生了"],
  GROWING: ["生长", "一个行动条件已确认"],
  BUD: ["花苞", "时间、地点和人都已确认"],
  BLOOM: ["开花", "这次行动真的发生了"],
  FOREST: ["入林", "共同经历已留在森林"],
};

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

// 数据层：当前行动标题与同伴名，优先用真实发布的数据，否则回退演示文案
function actionTitle() { return (server.draft && server.draft.idea) || "周六一起爬磨山"; }
function partnerName() { return server.selectedCandidate || "小蓝"; }
function candidateList() { return (server.candidates && server.candidates.length) ? server.candidates : candidates; }
function candidateAt(index) { return candidateList()[Number(index)] || candidateList()[0]; }

function profileFor(name) {
  const candidate = candidateList().find(person => person.name === name);
  return publicGardens[name] || {
    pet: "pet-walk.png",
    tagline: candidate?.note || "这个花园还在慢慢长出主人的样子。",
    flowers: ["flower-2.png", "flower-5.png", "flower-7.png"],
    interests: candidate?.facts?.slice(0, 3) || ["校园同行", "新的体验", "认真赴约"],
    memories: ["第一次和新搭子完成行动", "一件愿意再做一次的小事"],
  };
}

function profileAvatar(name, label = `进入${name}的主页花园`) {
  return `<button class="profile-avatar-link" data-profile="${escapeHtml(name)}" aria-label="${escapeHtml(label)}"><span>${escapeHtml(name.slice(-1))}</span><i>看花园</i></button>`;
}

async function api(path, body, options = {}) {
  const silent = options.silent === true;
  if (!silent) {
    ui.loading = true;
    render();
  }
  try {
    const response = await fetch(path, { method: body === undefined ? "GET" : "POST", headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "操作失败");
    server = result;
    return result;
  } catch (error) {
    notify(error.message || "网络开了小差");
    return null;
  } finally {
    if (!silent) ui.loading = false;
    render();
  }
}

async function fusionApi(body, options = {}) {
  const silent = options.silent === true;
  if (!silent) {
    ui.loading = true;
    render();
  }
  try {
    const method = options.method || (body === undefined ? "GET" : "POST");
    const response = await fetch("/api/bloom-fusions", {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "花朵共鸣失败");
    bloomFusion = result;
    return result;
  } catch (error) {
    notify(error.message || "花朵暂时没有产生共鸣");
    return null;
  } finally {
    if (!silent) ui.loading = false;
    render();
  }
}

function fusionCandidateFor(partnerId) {
  return bloomFusion.candidates.find(candidate => candidate.partnerId === partnerId);
}

function fusionFor(partnerId) {
  return bloomFusion.fusions.find(item => item.partnerId === partnerId);
}

function experienceFlowerUrl(flower) {
  return flower?.artwork?.status === "ready" && flower.artwork.url
    ? flower.artwork.url
    : flower.assetUrl;
}

function relationshipFlowerArt(item, compact = false) {
  if (item?.artwork?.status === "ready" && item.artwork.url) {
    return `<div class="relationship-flower-art ${compact ? "compact" : ""}"><img class="generated-relationship-flower" src="${escapeHtml(item.artwork.url)}" alt="AI 生成的${escapeHtml(item.title)}"></div>`;
  }
  const flowers = (item?.sourceFlowers || []).slice(0, 4);
  return `<div class="relationship-flower-art ${compact ? "compact" : ""} ${item?.artwork ? "is-fused" : "is-preview"}" role="img" aria-label="${item?.artwork ? "两朵源花融合后的组合预览" : "两朵可以合成的经历花"}"><i class="relationship-aura"></i><i class="relationship-stem"></i>${flowers.map((flower, index) => `<img class="source-petal source-petal-${index + 1}" src="${escapeHtml(experienceFlowerUrl(flower))}" alt="${escapeHtml(flower.title)}的经历花">`).join("")}${item?.artwork ? `<span class="relationship-core">L${item.tier.level}</span>` : `<span class="resonance-mark">↝</span>`}</div>`;
}

function relationshipGrowthRoadmap(currentLevel = 1) {
  const visibleLevels = new Set([2, 3, 4, 5, 10, 25, 50, 100]);
  const stages = (bloomFusion.progression || []).filter(stage => visibleLevels.has(stage.level));
  if (!stages.length) return "";
  return `<section class="evolution-roadmap"><header><small>RELATIONSHIP EVOLUTION</small><h2>每一次共同经历，都让轮廓继续生长</h2><p>等级永远等于共同经历数；尺寸只是一部分，真正的进化由花冠层级、分枝和专属纹样共同表达。</p></header><div>${stages.map(stage => `<article class="${stage.level === currentLevel ? "current" : stage.level < currentLevel ? "passed" : ""}"><b>L${stage.level}</b><strong>${escapeHtml(stage.name)}</strong><span>${escapeHtml(stage.form)}</span><i style="--stage-scale:${stage.scale}"></i></article>`).join("")}</div></section>`;
}

function flowerDetailShowcase({ level, tierName, art, title, description, className = "" }) {
  return `<section class="flower-detail-showcase ${className}"><span class="tier-pill">L${level} · ${escapeHtml(tierName)}</span><div class="flower-detail-art">${art}</div><small>FLOWER PORTRAIT</small><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></section>`;
}

function journalPhotoStory(journal, title, compact = false) {
  const photos = journal?.photos || [];
  if (!photos.length) return "";
  return `<section class="journal-photo-story ${compact ? "compact" : ""}"><header><small>${compact ? "这一章的真实片段" : "那天留下的真实片段"}</small><span>${photos.length} 张参与者上传照片</span></header><div class="journal-photo-grid journal-photo-grid-all">${photos.map((photo, index) => `<figure><img src="${escapeHtml(photo)}" alt="${escapeHtml(journal.captions?.[index] || title)}"><figcaption>${escapeHtml(journal.captions?.[index] || "已确认的事件照片")}</figcaption></figure>`).join("")}</div></section>`;
}

function upcomingDates() {
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const day = `${date.getMonth() + 1}月${date.getDate()}日`;
    return { value: `${day} ${weekdays[date.getDay()]}`, day, weekday: offset === 0 ? "今天" : weekdays[date.getDay()] };
  });
}

function startPublishFlow() {
  const fresh = initialUi();
  ui.route = "publish";
  ui.publishStep = 0;
  ui.draft = fresh.draft;
  ui.selectedDate = "";
  ui.selectedPeriod = "";
  ui.activityQuestion = "";
  ui.activityOptions = [];
  ui.activityQuestionError = false;
  ui.activityQuestionLoading = false;
  render();
}

async function prepareActivityQuestion() {
  ui.publishStep = 5;
  ui.activityQuestion = "";
  ui.activityOptions = [];
  ui.activityQuestionError = false;
  ui.activityQuestionLoading = true;
  render();
  try {
    const requestQuestion = () => fetch("/api/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "activity_detail",
          context: {
            idea: ui.draft.idea,
            time: ui.draft.time,
            place: ui.draft.place,
            companion: ui.draft.companion,
            habit: ui.draft.habit,
          },
        }),
      });
    let response = await requestQuestion();
    if (response.status === 401) {
      const sessionResponse = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "小周", emoji: "🌱", interests: [ui.draft.idea] }),
      });
      if (!sessionResponse.ok) throw new Error("演示身份初始化失败");
      response = await requestQuestion();
    }
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "AI 追问生成失败");
    ui.activityQuestion = result.reply;
    ui.activityOptions = result.options;
  } catch (error) {
    ui.activityQuestionError = true;
    notify(error.message || "小绿暂时没想好怎么追问");
  } finally {
    ui.activityQuestionLoading = false;
    render();
  }
}

function notify(message) {
  clearTimeout(toastTimer);
  ui.toast = message;
  render();
  toastTimer = setTimeout(() => { ui.toast = ""; render(); }, 2600);
}

function plant(stage = server.stage, size = "md", palette = "green") {
  return `<div class="plant plant-${stage.toLowerCase()} plant-${size} palette-${palette}" role="img" aria-label="植物状态：${stageMeta[stage]?.[0] || "植物"}">
    <i class="soil"></i><i class="seed"></i><i class="stem"></i>
    <i class="leaf leaf-a"></i><i class="leaf leaf-b"></i><i class="leaf leaf-c"></i><i class="leaf leaf-d"></i>
    <i class="bud"></i><i class="petal p1"></i><i class="petal p2"></i><i class="petal p3"></i><i class="petal p4"></i><i class="flower-core"></i>
  </div>`;
}

function pet(small = false) {
  return `<div class="pet ${small ? "pet-small" : ""}" role="img" aria-label="花匠小绿"><img src="assets/pet-actions/pet-idle.png" alt=""></div>`;
}

function icon(name) {
  if (name === "bell") return `<svg class="bell-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>`;
  const icons = { garden: "⌂", mailbox: "✉", actions: "♧", forest: "♨", profile: "♙", bell: "♧", back: "‹", clock: "◷", pin: "⌖", people: "♙" };
  return `<span class="ui-icon" aria-hidden="true">${icons[name] || "·"}</span>`;
}

function gardenSvg() {
  return `<svg class="scene-svg" viewBox="0 0 390 720" role="img" aria-label="社交森林花园场景 SVG 占位图">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff6d8"/><stop offset="1" stop-color="#eff0bd"/></linearGradient>
      <linearGradient id="water" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#a8d9df"/><stop offset="1" stop-color="#72b6c2"/></linearGradient>
      <filter id="soft"><feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#6f783d" flood-opacity=".18"/></filter>
    </defs>
    <rect width="390" height="720" fill="url(#sky)"/>
    <path d="M0 130 Q72 86 145 126 T292 118 T420 102 V720 H0Z" fill="#b8ca72"/>
    <path d="M0 185 Q75 142 155 170 T314 151 T420 140 V720 H0Z" fill="#cbd989"/>
    <path d="M244 720 C230 650 307 602 274 541 C242 483 321 439 301 365 C289 321 315 271 343 218 L391 224 V720Z" fill="#86957b" opacity=".35"/>
    <path d="M274 720 C252 650 329 598 294 535 C267 487 342 442 320 369 C305 318 340 272 360 223 L390 229 V720Z" fill="url(#water)"/>
    <g fill="#eef3c8" opacity=".75"><ellipse cx="336" cy="300" rx="15" ry="5"/><ellipse cx="310" cy="451" rx="13" ry="5"/><ellipse cx="331" cy="576" rx="15" ry="5"/><ellipse cx="291" cy="656" rx="12" ry="4"/></g>
    <g fill="#8d9c75"><ellipse cx="292" cy="697" rx="21" ry="12"/><ellipse cx="313" cy="616" rx="19" ry="11"/><ellipse cx="291" cy="540" rx="17" ry="10"/><ellipse cx="324" cy="458" rx="16" ry="10"/><ellipse cx="311" cy="378" rx="18" ry="11"/><ellipse cx="341" cy="292" rx="18" ry="11"/></g>
    <g stroke="#7a6842" stroke-width="6" stroke-linecap="round"><path d="M18 155H365"/><path d="M31 135V185M88 135V176M145 132V170M207 128V167M267 126V162M331 118V161"/></g>
    <g fill="#72933d" stroke="#536b31" stroke-width="3"><circle cx="18" cy="172" r="39"/><circle cx="68" cy="150" r="34"/><circle cx="125" cy="153" r="31"/><circle cx="183" cy="139" r="34"/><circle cx="236" cy="143" r="35"/><circle cx="294" cy="132" r="39"/><circle cx="361" cy="148" r="48"/></g>
    <g fill="#496b2f" opacity=".72"><ellipse cx="16" cy="282" rx="42" ry="64"/><ellipse cx="375" cy="268" rx="39" ry="66"/><ellipse cx="36" cy="387" rx="45" ry="58"/></g>
    <g filter="url(#soft)">
      <path d="M28 462 L84 416 L143 461 V540 H28Z" fill="#fff3cf" stroke="#756942" stroke-width="4"/>
      <path d="M17 463 L83 404 L153 463 L135 474 L84 429 L36 475Z" fill="#718e48" stroke="#526938" stroke-width="4"/>
      <rect x="47" y="476" width="34" height="64" rx="16" fill="#9b774e" stroke="#70583b" stroke-width="3"/>
      <rect x="99" y="474" width="25" height="28" rx="7" fill="#9bc5c5" stroke="#6a6849" stroke-width="3"/>
      <circle cx="80" cy="447" r="7" fill="#d9a654"/>
    </g>
    <g filter="url(#soft)">
      <rect x="127" y="548" width="48" height="38" rx="7" fill="#d27643" stroke="#784f36" stroke-width="4"/>
      <path d="M127 551 Q151 531 175 551" fill="#e59a5d" stroke="#784f36" stroke-width="4"/>
      <rect x="145" y="559" width="22" height="14" rx="2" fill="#fff2d1"/>
      <path d="M148 562 L156 568 L164 562" fill="none" stroke="#8d6e43" stroke-width="2"/>
      <path d="M143 586V626" stroke="#76583d" stroke-width="6"/>
    </g>
    <g filter="url(#soft)">
      <path d="M271 524 Q306 497 345 524 L334 539 Q306 519 279 539Z" fill="#d8a85c" stroke="#846943" stroke-width="3"/>
      <path d="M279 539V558M334 539V558" stroke="#846943" stroke-width="5"/>
    </g>
    <g fill="#a47d4a" stroke="#775d3c" stroke-width="3">
      <ellipse cx="177" cy="242" rx="43" ry="28"/><ellipse cx="274" cy="238" rx="39" ry="27"/>
      <ellipse cx="129" cy="334" rx="43" ry="29"/><ellipse cx="230" cy="332" rx="45" ry="30"/>
      <ellipse cx="179" cy="428" rx="44" ry="29"/>
    </g>
    <g fill="none" stroke="#d6b876" stroke-width="9" stroke-dasharray="3 8" stroke-linecap="round">
      <ellipse cx="177" cy="242" rx="48" ry="33"/><ellipse cx="274" cy="238" rx="44" ry="32"/>
      <ellipse cx="129" cy="334" rx="48" ry="34"/><ellipse cx="230" cy="332" rx="50" ry="35"/>
      <ellipse cx="179" cy="428" rx="49" ry="34"/>
    </g>
    <g fill="#b5aa82"><ellipse cx="105" cy="245" rx="18" ry="10"/><ellipse cx="85" cy="289" rx="16" ry="9"/><ellipse cx="183" cy="294" rx="19" ry="10"/><ellipse cx="245" cy="397" rx="17" ry="9"/><ellipse cx="105" cy="420" rx="15" ry="8"/></g>
    <g fill="#fff6cf"><circle cx="56" cy="344" r="5"/><circle cx="67" cy="339" r="5"/><circle cx="59" cy="354" r="5"/><circle cx="355" cy="415" r="5"/><circle cx="365" cy="407" r="5"/><circle cx="370" cy="421" r="5"/></g>
  </svg>`;
}

function roomSvg(decorated = false) {
  return `<svg class="scene-svg" viewBox="0 0 390 720" role="img" aria-label="小绿的家室内场景 SVG 占位图">
    <defs><linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff6da"/><stop offset="1" stop-color="#eee1b9"/></linearGradient></defs>
    <rect width="390" height="720" fill="url(#wall)"/>
    <path d="M0 450 L195 335 L390 450 V720 H0Z" fill="#c99d62"/>
    <path d="M0 450 L195 360 L390 450" fill="none" stroke="#a87d4e" stroke-width="5"/>
    <g stroke="#b58a57" stroke-width="2" opacity=".45"><path d="M48 427V720M110 401V720M174 374V720M236 375V720M299 409V720M350 434V720"/><path d="M0 520H390M0 602H390M0 682H390"/></g>
    <rect x="35" y="124" width="112" height="176" rx="18" fill="#9ebc9d" stroke="#786c47" stroke-width="6"/>
    <path d="M91 124V300M35 211H147" stroke="#f7ebc7" stroke-width="6"/>
    <path d="M42 278 Q88 225 142 250 V294 H42Z" fill="#77965e" opacity=".7"/>
    <g transform="translate(231 117)"><rect width="115" height="174" rx="12" fill="#a47d4c" stroke="#70583a" stroke-width="5"/><path d="M8 51H107M8 106H107" stroke="#70583a" stroke-width="5"/><g fill="#e8cf8d"><rect x="18" y="15" width="21" height="34" rx="3"/><rect x="47" y="10" width="17" height="39" rx="3"/><rect x="73" y="20" width="25" height="29" rx="3"/><rect x="15" y="66" width="27" height="38" rx="3"/><rect x="51" y="70" width="18" height="34" rx="3"/><rect x="77" y="63" width="23" height="41" rx="3"/></g></g>
    <g transform="translate(30 415)"><rect x="0" y="32" width="142" height="64" rx="14" fill="#799047" stroke="#596d37" stroke-width="5"/><path d="M0 52 Q65 27 142 52" fill="#e5cf8e"/><rect x="11" y="0" width="50" height="42" rx="12" fill="#f1dfad"/><rect x="80" y="2" width="49" height="39" rx="12" fill="#d7bc79"/></g>
    <g transform="translate(224 425)"><ellipse cx="61" cy="58" rx="69" ry="36" fill="#d5b277" stroke="#886a42" stroke-width="5"/><path d="M0 57H122M28 33L20 97M96 34L104 97" stroke="#886a42" stroke-width="6"/></g>
    <g transform="translate(53 570)"><rect width="112" height="77" rx="12" fill="#8a9d50" stroke="#607239" stroke-width="5"/><circle cx="56" cy="39" r="22" fill="#d8c184"/><path d="M56 19V59M36 39H76" stroke="#8a7445" stroke-width="3"/></g>
    ${decorated ? `<g class="decor-added"><ellipse cx="280" cy="585" rx="55" ry="29" fill="#d99887" opacity=".85"/><circle cx="298" cy="360" r="33" fill="#e5b852"/><path d="M298 329V390M267 360H329" stroke="#fff4ca" stroke-width="7"/><path d="M181 181 q18 -32 36 0 q-18 22 -36 0" fill="#e8898c"/><path d="M181 181 q-31 15 -2 34 q17 -15 2 -34" fill="#eda1a0"/><path d="M217 181 q31 15 2 34 q-17 -15 -2 -34" fill="#eda1a0"/></g>` : ""}
  </svg>`;
}

function sceneImage(src, alt) {
  return `<img class="scene-image" src="${src}" alt="${alt}">`;
}

function topbar(title, subtitle = "", back = false) {
  return `<header class="topbar">
    ${back ? `<button class="round-button" data-action="back" aria-label="返回">${icon("back")}</button>` : `<div><p class="eyebrow">${subtitle}</p><h1>${title}</h1></div>`}
    ${back ? `<div class="topbar-title"><p class="eyebrow">${subtitle}</p><h1>${title}</h1></div>` : ""}
    <button class="round-button bell" data-action="notify" aria-label="通知">${icon("bell")}<b>3</b></button>
  </header>`;
}

function nav() {
  const items = [["garden", "花园"], ["mailbox", "信箱"], ["publish", ""], ["actions", "行动中"], ["profile", "我的"]];
  return `<nav class="bottom-nav">${items.map(([id, label]) => id === "publish"
    ? `<button class="publish-button" data-action="publish" aria-label="种下一颗行动种子"><span>＋</span></button>`
    : `<button class="nav-item ${ui.tab === id && !ui.route ? "active" : ""}" data-tab="${id}">${icon(id)}<small>${label}</small>${id === "mailbox" && ui.unreadMail ? `<b>${ui.unreadMail}</b>` : ""}</button>`).join("")}</nav>`;
}

function WorldGardenPage() {
  const meta = stageMeta[server.stage] || stageMeta.SEED;
  const world = window.WorldLayer;
  const resonanceCandidate = bloomFusion.candidates[0];
  const relationshipBloom = resonanceCandidate ? fusionFor(resonanceCandidate.partnerId) : bloomFusion.fusions[0];
  const inventory = flowerInventory();
  const activePerson = gardenPeople().find(person => person.id === ui.activeGardenPartnerId);
  const relationshipFlowers = activePerson
    ? inventory.filter(flower => flower.partnerId === activePerson.id).sort((a, b) => b.level - a.level)
    : [];
  const friendFlowers = activePerson ? friendGardenInventory(activePerson.id) : [];
  const selectedGardenFlowers = ui.activeGardenMode === "friend" ? friendFlowers : activePerson ? relationshipFlowers : inventory.filter(flower => displayGarden.includes(flower.id));
  const plantedFlowers = selectedGardenFlowers.slice(0, DISPLAY_GARDEN_CAPACITY);
  const plotIds = ["ride", "photo", "current", "center", "study", "bottom"];
  const gardenTitle = ui.activeGardenMode === "friend" && activePerson ? `${activePerson.name}的花园` : activePerson ? `和${activePerson.name}的花园` : "小周的展示花园";
  const gardenCount = activePerson
    ? `${plantedFlowers.length}/${DISPLAY_GARDEN_CAPACITY} 花坛 · 共 ${selectedGardenFlowers.length} 朵`
    : `${plantedFlowers.length}/${DISPLAY_GARDEN_CAPACITY} 花坛`;
  return `<main class="world-screen garden-world-screen ${ui.mailboxOverlay || ui.gardenSwitcherOpen ? "has-world-modal" : ""}">
    <section class="game-hud"><div><small>${escapeHtml(gardenTitle)} · ${gardenCount}</small><strong>${activePerson ? ui.activeGardenMode === "friend" ? "拜访对方正在展示的花园" : `${activePerson.note} · 完整收藏在森林` : plantedFlowers.length < DISPLAY_GARDEN_CAPACITY ? "花坛里还有空位" : "花坛已经种满了"}</strong></div><button data-action="world-help">?</button></section>
    <div class="world-scene">
      ${sceneImage(world.scenes.garden.image, "绘本风社交花园：小屋、信箱、花圃、小桥和溪流")}
      <div class="garden-growth-layer" aria-label="花园中的行动植物">
        ${plantedFlowers.map((flower, index) => `<button class="real-plant-slot display-garden-flower level-${flower.level} ${flower.generated ? "generated-flower" : ""}" data-plot-id="${plotIds[index]}" style="${world.plantStyle(plotIds[index])}" ${flower.visitorOnly ? `data-action="visit-friend-flower"` : flower.fusionPartnerId ? `data-fusion-partner="${escapeHtml(flower.fusionPartnerId)}"` : `data-memory="${escapeHtml(flower.memoryId)}"`} aria-label="${flower.visitorOnly ? "看看" : "打开"}${escapeHtml(flower.title)}"><img src="${escapeHtml(flower.image)}" alt=""><span>L${flower.level} · ${escapeHtml(flower.partnerName || activePerson?.name || "朋友")}</span></button>`).join("")}
        ${Array.from({ length: DISPLAY_GARDEN_CAPACITY - plantedFlowers.length }, (_, index) => activePerson
          ? `<span class="empty-display-plot relationship-empty-plot" style="${world.plantStyle(plotIds[plantedFlowers.length + index])}" aria-hidden="true"></span>`
          : `<button class="empty-display-plot" data-plot-id="${plotIds[plantedFlowers.length + index]}" style="${world.plantStyle(plotIds[plantedFlowers.length + index])}" data-action="open-empty-plot" aria-label="选择一朵花种进这个花坛"></button>`).join("")}
        ${resonanceCandidate && !relationshipBloom ? `<button class="garden-resonance-entry" data-fusion-partner="${escapeHtml(resonanceCandidate.partnerId)}" aria-label="两朵花可以合成，打开共鸣页"><span class="resonance-flower-pair"><img src="${escapeHtml(experienceFlowerUrl(resonanceCandidate.sourceFlowers[0]))}" alt=""><i>＋</i><img src="${escapeHtml(experienceFlowerUrl(resonanceCandidate.sourceFlowers[1]))}" alt=""></span><span class="resonance-entry-copy"><small>发现花朵共鸣</small><strong>这两朵花可以合成</strong><b>去合成 ›</b></span></button>` : ""}
      </div>
      ${world.objectEffectsMarkup(ui.openingObject)}
      <button class="world-hotspot" data-anchor="home" style="${world.anchorStyle("garden", "home")}" data-action="open-home" aria-label="进入我的家"></button>
      <button class="world-hotspot mailbox-object" data-anchor="mailbox" style="${world.anchorStyle("garden", "mailbox")}" data-action="open-mailbox-overlay" aria-label="打开种子信箱">${ui.unreadMail ? `<span class="mail-notice"><img src="assets/nav-mailbox-v2.png" alt=""><b>${ui.unreadMail}</b></span>` : ""}</button>
      <button class="world-hotspot garden-bridge-gate" data-anchor="bridge" style="${world.anchorStyle("garden", "bridge")}" data-action="open-garden-switcher" aria-label="打开花园驿站，选择要去的花园"></button>
      ${ui.mailboxOverlay ? MailboxOverlay(ui.welcomeLetter) : ""}
      ${ui.gardenSwitcherOpen ? GardenSwitcherModal() : ""}
    </div>
    <div class="world-dock"><button data-world="home"><img src="assets/nav-profile-v2.png" alt=""><small>家</small></button><button data-world="mailbox"><img src="assets/nav-mailbox-v2.png" alt=""><small>信箱</small></button><button class="dock-seed" data-action="publish" aria-label="发布需求"><span class="dock-plus" aria-hidden="true"></span></button><button data-world="actions"><img src="assets/nav-chat-v2.png" alt=""><small>行动</small></button><button class="forest-dock-entry" data-world="forest"><img src="assets/nav-garden-v2.png" alt=""><small>森林</small>${resonanceCandidate && !relationshipBloom ? `<b class="fusion-ready-badge">可合成</b>` : ""}</button></div>
  </main>`;
}

function GardenSwitcherModal() {
  const people = gardenPeople();
  const activeName = people.find(person => person.id === ui.activeGardenPartnerId)?.name;
  const isShared = ui.gardenSwitcherTab === "shared";
  return `<div class="world-modal-backdrop garden-switcher-backdrop" data-action="close-garden-switcher"><section class="world-mailbox-panel garden-switcher-panel" role="dialog" aria-modal="true" aria-label="花园驿站"><header><div><small>花园驿站 · 从小桥出发</small><h2>去谁的花园看看？</h2></div><button data-action="close-garden-switcher" aria-label="关闭">×</button></header><div class="garden-destination-tabs" role="tablist"><button class="${isShared ? "active" : ""}" data-garden-tab="shared">我的与共同</button><button class="${isShared ? "" : "active"}" data-garden-tab="friends">朋友的花园</button></div><label class="garden-person-search"><span>⌕</span><input data-garden-person-search placeholder="搜索一起种过花的人" autocomplete="off"></label><div class="garden-switcher-list">${isShared ? `<button class="${activeName || ui.activeGardenMode === "friend" ? "" : "active"}" data-garden-view="mine"><span class="relationship-avatar">周</span><span><strong>我的展示花园</strong><small>我亲手搭配的 ${displayGarden.length} 朵花</small></span><i>${!activeName && ui.activeGardenMode === "mine" ? "✓" : "›"}</i></button>${people.map(person => `<button class="${ui.activeGardenMode === "shared" && ui.activeGardenPartnerId === person.id ? "active" : ""}" data-garden-partner="${escapeHtml(person.id)}" data-garden-mode="shared" data-person-name="${escapeHtml(person.name)}"><span class="relationship-avatar">${escapeHtml(person.name.slice(0, 1))}</span><span><strong>我和${escapeHtml(person.name)}的共同花园</strong><small>${person.flowers.length} 朵共同花 · ${escapeHtml(person.note)}</small></span><i>${ui.activeGardenMode === "shared" && ui.activeGardenPartnerId === person.id ? "✓" : "›"}</i></button>`).join("")}` : people.map(person => `<button class="${ui.activeGardenMode === "friend" && ui.activeGardenPartnerId === person.id ? "active" : ""}" data-garden-partner="${escapeHtml(person.id)}" data-garden-mode="friend" data-person-name="${escapeHtml(person.name)}"><span class="relationship-avatar">${escapeHtml(person.name.slice(0, 1))}</span><span><strong>${escapeHtml(person.name)}自己的花园</strong><small>${friendGardenInventory(person.id).length} 朵正在展示 · 可能与你的花有交集</small></span><i>${ui.activeGardenMode === "friend" && ui.activeGardenPartnerId === person.id ? "✓" : "›"}</i></button>`).join("")}</div><p>${isShared ? "展示花园与共同花园都是你种过的花的子集。" : "这里展示对方自己的收藏，是另一套花的集合。"}底图和 6 个花坛的位置始终不变。</p></section></div>`;
}

function MailboxOverlay(showWelcome = false) {
  if (showWelcome) return `<div class="world-modal-backdrop welcome-backdrop"><section class="world-mailbox-panel welcome-letter" role="dialog" aria-modal="true" aria-label="小绿带回的第一封信"><header><div><small>小绿的旅行见闻</small><h2>今天带回了一颗新种子</h2></div><button data-action="close-welcome-letter" aria-label="稍后再看">×</button></header><div class="welcome-letter-body"><img src="assets/pet-actions/pet-mail.png" alt="小绿带回信件"><p>小周，我在花园外遇见了小蓝的花匠。你们都想在周六去磨山，也都喜欢沿途拍照。</p><blockquote>“要不要一起走一条轻松的路线？”</blockquote><button data-seed="hike">拆开这封信</button></div><button class="mailbox-expand" data-action="show-mailbox-preview">看看另外 ${Math.max(0, ui.unreadMail - 1)} 封来信</button></section></div>`;
  return `<div class="world-modal-backdrop" data-action="close-mailbox-overlay"><section class="world-mailbox-panel" role="dialog" aria-modal="true" aria-label="种子信箱预览"><header><div><small>花园邮便</small><h2>种子信箱</h2></div><button data-action="close-mailbox-overlay" aria-label="关闭">×</button></header><div class="mail-preview-list">${seeds.slice(0, 2).map(seed => `<button data-seed="${seed.id}"><img src="assets/pet-actions/${seed.petAsset}" alt="${seed.peer}的小花匠"><span><strong>${seed.peer}</strong><small>${seed.preview}</small></span><i>›</i></button>`).join("")}</div><button class="mailbox-expand" data-action="expand-mailbox">打开完整信箱 <span>↗</span></button></section></div>`;
}

function HomeWorldPage() {
  return `<main class="world-screen home-world-screen">
    <section class="game-hud indoor"><button class="hud-back" data-world="garden">‹ 花园</button><div><small>我的家</small><strong>小绿的生活空间</strong></div><button data-action="decorate">✦</button></section>
    <div class="world-scene room-scene">
      ${sceneImage("assets/home-interior.png", "绘本风小屋室内：床、书架、旅行背包和行动桌")}
      ${ui.decorated ? `<div class="home-decoration"><img src="assets/flower-7.png" alt="新摆放的牡丹装饰"><i></i></div>` : ""}
      <button class="world-hotspot" data-anchor="bed" style="${window.WorldLayer.anchorStyle("home", "bed")}" data-action="pet-sleep" aria-label="让小绿去床上休息"></button>
      <button class="world-hotspot" data-anchor="table" style="${window.WorldLayer.anchorStyle("home", "table")}" data-world="actions" aria-label="打开行动桌"></button>
      <button class="world-hotspot" data-anchor="books" style="${window.WorldLayer.anchorStyle("home", "books")}" data-world="profile" aria-label="打开记忆书架"></button>
      <button class="world-pet indoor-pet ${ui.petMood === "sleep" ? "is-sleeping" : ""}" data-action="pet-talk" aria-label="和小绿互动"><img class="pet-asset" src="assets/pet-actions/${ui.petMood === "sleep" ? "pet-sleep" : "pet-talk"}.png" alt="小绿"><span>${ui.petMood === "sleep" ? "Z z z…" : "今天要一起把什么事做成？"}</span></button>
      <div class="decorate-tip ${ui.decorated ? "show" : ""}">新地毯和花灯已经摆好啦！</div>
    </div>
    <div class="room-toolbar compact-room-toolbar"><button data-action="decorate"><span>✦</span><b>${ui.decorated ? "已装扮" : "装扮"}</b></button><button data-action="pet-talk"><span>☻</span><b>互动</b></button></div>
  </main>`;
}

function forestBackdrop() {
  return `<div class="forest-backdrop" aria-hidden="true">
    <div class="cloud cloud-a"></div><div class="cloud cloud-b"></div>
    <div class="hill hill-back"></div><div class="hill hill-front"></div>
    <div class="forest-plant fp1">${plant("BLOOM", "sm", "gold")}</div>
    <div class="forest-plant fp2">${plant("FOREST", "sm", "pink")}</div>
    <div class="forest-plant fp3">${plant("BLOOM", "sm", "blue")}</div>
    <div class="forest-plant fp4">${plant("FOREST", "sm", "green")}</div>
    <i class="stone s1"></i><i class="stone s2"></i><i class="grass g1"></i><i class="grass g2"></i>
  </div>`;
}

function GardenPage() {
  const meta = stageMeta[server.stage] || stageMeta.SEED;
  const fresh = !server.published && !server.selectedCandidate;
  return `<main class="screen garden-page">
    ${topbar("我的花园", "下午好，小周")}
    <section class="garden-world" data-route="${fresh ? "publish" : "chat"}">
      ${forestBackdrop()}
      <div class="garden-copy"><span class="status-chip"><i></i>${fresh ? "花园还有一块空地" : `${meta[0]} · ${meta[1]}`}</span><h2>${fresh ? "种下最近想做的事" : escapeHtml(actionTitle())}</h2><p>${fresh ? "不用先想得很完整，小绿会和你一起把它说清楚。" : "每一次确认，都会让这株植物真实地长大。"}</p></div>
      <div class="current-plot ${server.stage !== "SEED" ? "growing-now" : ""}">${plant(server.stage, "xl", "green")}<span>${fresh ? "点击种下" : meta[0]}</span></div>
      <div class="pet-perch">${pet()}<div class="speech-bubble">${fresh ? "最近想和谁一起做点什么？" : server.stage === "BUD" ? "都约好啦，就等出发！" : server.stage === "FOREST" ? "这次回忆已经住进森林啦" : "我只在你需要时帮一把"}</div></div>
    </section>
    <div class="section-heading"><div><span>NOW GROWING</span><h2>正在生长</h2></div><button data-route="${fresh ? "publish" : "chat"}">${fresh ? "种一颗" : "进入行动"} ›</button></div>
    ${fresh ? `<button class="empty-action card" data-route="publish"><span class="empty-plot">＋</span><span><strong>把一个愿望变成行动</strong><small>同时推进的行动最多 3 个</small></span></button>` : `<article class="active-event card" data-route="chat">${plant(server.stage, "sm", "green")}<div><span class="mini-label">${meta[0]}</span><h3>${escapeHtml(actionTitle())}</h3><p>${meta[1]} · 和${partnerName()}</p></div><span class="chevron">›</span></article>`}
    <div class="section-heading"><div><span>MY FOREST</span><h2>我的森林</h2></div><button data-route="memory">看看全部 ›</button></div>
    <div class="memory-strip">
      <button class="memory-plant gold" data-route="memory">${plant("FOREST", "sm", "gold")}<strong>东湖骑行</strong><small>和阿澄</small></button>
      <button class="memory-plant pink" data-route="memory">${plant("FOREST", "sm", "pink")}<strong>樱花摄影</strong><small>和小满</small></button>
      <button class="memory-plant blue" data-route="memory">${plant("BLOOM", "sm", "blue")}<strong>周末自习</strong><small>和鹿鸣</small></button>
    </div>
  </main>`;
}

function MailboxPage() {
  return `<main class="screen github-aligned-page mailbox-full-page">
    ${topbar("种子信箱", "与你匹配的找搭子需求", true)}
    <div class="tabs"><button class="${ui.mailboxMode === "received" ? "active" : ""}" data-mailbox="received">收到的种子 ${seeds.length}</button><button class="${ui.mailboxMode === "sent" ? "active" : ""}" data-mailbox="sent">我发出的 ${server.published ? 1 : 0}</button></div>
    ${ui.mailboxMode === "received" ? `<div class="letter-list">${seeds.map(seed => `<button class="letter-row" data-seed="${seed.id}"><span class="letter-avatar"><img src="assets/pet-actions/${seed.petAsset}" alt="${seed.peer}的小花匠"></span><span class="letter-summary"><b>${seed.peer}</b><strong>${seed.title}</strong><small>${seed.preview}</small></span><time>${seed.time.split(" ")[0]}</time><i>›</i></button>`).join("")}</div>` : `<section class="card sent-seed">${plant(server.stage, "md", "green")}<span class="mini-label">${server.published ? "匹配进行中" : "还没有发出的种子"}</span><h2>${server.published ? escapeHtml(actionTitle()) : "种下一件想做的事"}</h2><p>${server.published ? "小绿正在寻找时间合适的同行者。" : "一句话就可以开始。"}</p><button class="primary" data-action="${server.published ? "view-candidates" : "publish"}">${server.published ? "查看候选" : "去种一颗"}</button></section>`}
  </main>`;
}

function SeedDetailPage(id) {
  const seed = seeds.find(item => item.id === id) || seeds[0];
  return `<main class="screen detail-page letter-detail-page">
    ${topbar(seed.title, "小绿带回的一封信", true)}
    <section class="paper-letter"><header>${profileAvatar(seed.peer)}<div><small>来自花园外</small><strong>${seed.peer} · 校园已认证</strong><button class="inline-profile-link" data-profile="${seed.peer}">看看 TA 的花园 ›</button></div><span class="paper-stamp">小绿<br>已送达</span></header><div class="letter-copy">${escapeHtml(seed.letter).replace(/\n/g, "<br>")}</div><footer>${seed.peer}<br><time>${seed.time}</time></footer></section>
    <div class="letter-facts"><span>${icon("clock")} ${seed.time}</span><span>${icon("pin")} ${seed.place}</span>${seed.tags.map(tag => `<span>${tag}</span>`).join("")}</div>
    <section class="match-box"><div>${pet(true)}</div><p><strong>为什么带给你</strong>${seed.reason}</p></section>
    <div class="sticky-actions"><button class="secondary" data-action="decline-seed">这次不合适</button><button class="primary" data-action="join-seed">愿意加入</button></div>
  </main>`;
}

function PublishPage() {
  const idea = escapeHtml(ui.draft.idea || "轻松爬山");
  const companion = escapeHtml(ui.draft.companion || "还未确认");
  const habit = escapeHtml(ui.draft.habit || "还未确认");
  const activityDetail = escapeHtml(ui.draft.activityDetail || "还未确认");
  const progress = ["做什么", "时间", "地点", "同行者", "相处习惯", "确认", "发布"];
  const dateOptions = upcomingDates();
  const steps = [
    `<div class="agent-bubble"><strong>最近想和别人一起做什么？</strong><br><span class="muted tiny">选一个最接近的，也可以自己填写</span></div><div class="choice-grid uniform-choice-grid"><button data-publish-choice="idea:轻松爬山">🥾 轻松爬山</button><button data-publish-choice="idea:一起自习">📚 一起自习</button><button data-publish-choice="idea:扫街摄影">📷 扫街摄影</button><button data-publish-choice="idea:看展或演出">🎵 看展／演出</button></div><form id="publish-form" class="custom-companion uniform-entry"><label for="publish-input">自定义想做的事</label><div class="inline-entry"><input id="publish-input" maxlength="40" placeholder="例如：一起练习羽毛球"><button>确定</button></div></form>`,
    `<div class="answer-summary"><span>做什么</span><strong>${idea}</strong></div><div class="agent-bubble"><strong>你希望什么时候进行？</strong><br><span class="muted tiny">左右滑动，分别选择日期和时段</span></div><section class="time-picker-card flow-card"><label>选择日期</label><div class="date-strip">${dateOptions.map(date => `<button class="${ui.selectedDate === date.value ? "selected" : ""}" data-date="${date.value}"><small>${date.weekday}</small><strong>${date.day}</strong></button>`).join("")}</div><label>选择时段</label><div class="period-strip">${["上午", "下午", "晚上"].map(period => `<button class="${ui.selectedPeriod === period ? "selected" : ""}" data-period="${period}">${period}</button>`).join("")}</div><button class="primary full flow-next" data-action="confirm-time" ${ui.selectedDate && ui.selectedPeriod ? "" : "disabled"}>确认时间</button></section>`,
    `<div class="answer-summary"><span>时间</span><strong>${escapeHtml(ui.draft.time)}</strong></div><div class="agent-bubble"><strong>活动范围放在哪里比较合适？</strong><br><span class="muted tiny">选择常用范围，或输入具体地址</span></div><div class="choice-grid uniform-choice-grid"><button data-publish-choice="place:校内">校内</button><button data-publish-choice="place:学校附近">学校附近</button><button data-publish-choice="place:市内都可以">市内都可以</button><button data-action="use-location">⌖ 使用我的定位</button></div><form id="place-form" class="custom-companion uniform-entry"><label for="place-input">自定义地点 / 地址</label><div class="inline-entry"><input id="place-input" maxlength="60" placeholder="例如：图书馆东门"><button>确定</button></div></form>`,
    `<div class="agent-bubble"><strong>你希望同行的人是什么样的？</strong><br><span class="muted tiny">选最看重的一点，也可以自己补充</span></div><div class="preference-list"><button data-companion="聊得来，气氛轻松"><span>💬</span><div><strong>聊得来，气氛轻松</strong><small>愿意分享，也尊重彼此表达</small></div><b>›</b></button><button data-companion="守时靠谱"><span>⏱</span><div><strong>守时靠谱</strong><small>确定后尽量不临时变动</small></div><b>›</b></button><button data-companion="愿意一起做决定"><span>🤝</span><div><strong>愿意一起做决定</strong><small>安排可以共同商量</small></div><b>›</b></button><button data-companion="没有特别要求"><span>🌱</span><div><strong>没有特别要求</strong><small>合适就好，保持开放</small></div><b>›</b></button></div><form id="companion-form" class="custom-companion"><label for="companion-input">自定义同行者要求</label><div class="inline-entry"><input id="companion-input" maxlength="40" placeholder="例如：希望对方也有拍摄经验"><button>确定</button></div></form>`,
    `<div class="agent-bubble"><strong>相处时，有什么习惯想提前说清楚？</strong><br><span class="muted tiny">这不是硬性条件，只是帮助彼此更自在</span></div><div class="habit-options"><button data-habit="喜欢边做边聊">边做边聊</button><button data-habit="慢热，先做事再熟悉">我比较慢热</button><button data-habit="不抽烟，少饮酒">不抽烟 / 少饮酒</button><button data-habit="没有特别习惯">没有特别习惯</button></div>`,
    ui.activityQuestionLoading
      ? `<section class="activity-confirm-state"><div class="activity-ai-loading"><i></i><strong>小绿正在想，这项活动还需要确认什么…</strong><small>不会重复询问时间、地点或同行者要求</small></div></section>`
      : ui.activityQuestionError
        ? `<section class="activity-confirm-state"><div class="activity-ai-error"><span>🌿</span><strong>专项问题暂时没有生成</strong><small>这一步必须由 Agent 根据活动来判断，不使用固定问题代替。</small><button class="primary" data-action="retry-activity-question">请小绿再想一次</button></div></section>`
        : `<div class="agent-bubble activity-question"><span class="ai-generated-label">AI 活动专项追问</span><strong>${escapeHtml(ui.activityQuestion)}</strong><small>这是根据“${idea}”临时生成的最后一问</small></div><div class="activity-option-list">${ui.activityOptions.map(option => `<button data-activity-detail="${escapeHtml(option)}">${escapeHtml(option)}<span>›</span></button>`).join("")}</div><form id="activity-detail-form" class="custom-companion"><label for="activity-detail-input">我想自己补充</label><div class="inline-entry"><input id="activity-detail-input" maxlength="60" placeholder="用一句话告诉小绿"><button>确定</button></div></form>`,
    `<div class="agent-bubble">我已经把标准信息和这次活动的特殊要求都整理好了。你确认后，我才会发布。</div><section class="card github-seed-preview detailed"><span class="pill">待发布</span><h2>${idea}</h2><div class="draft-summary"><p><span>◷</span><b>时间</b>${escapeHtml(ui.draft.time)}</p><p><span>⌖</span><b>地点</b>${escapeHtml(ui.draft.place)}</p><p><span>☺</span><b>同行者</b>${companion}</p><p><span>♡</span><b>相处习惯</b>${habit}</p><p class="activity-detail-summary"><span>✦</span><b>活动确认</b>${activityDetail}</p></div></section><div class="button-row"><button class="secondary" data-action="publish-reset">重新选择</button><button class="primary" data-action="confirm-publish">确认并发布</button></div>`,
  ];
  return `<main class="screen github-aligned-page publish-page">${topbar("种下一件想做的事", "和小绿聊聊", true)}<div class="agent-chat"><div class="profile-chip"><div class="agent-orb">${pet(true)}</div><div><strong>小绿 · 你的个人 Agent</strong><small>标准信息之后，我会针对活动再确认一项</small></div><span class="step-count">${Math.min(ui.publishStep + 1, 7)}/7</span></div><div class="publish-progress">${progress.map((label, index) => `<div class="${index < ui.publishStep ? "done" : index === ui.publishStep ? "active" : ""}"><i></i><span>${label}</span></div>`).join("")}</div>${steps[Math.min(ui.publishStep, 6)]}</div></main>`;
}

function MatchingPage() {
  return `<main class="screen matching-page">${topbar("小绿正在旅行", "寻找真正合适的同行者", true)}<section class="travel-scene">${forestBackdrop()}<div class="travel-pet">${pet()}</div><div class="trail"></div></section><h2>种子正在穿过校园</h2><p>先检查时间是否重合，再看地点与行动偏好。匹配理由只来自双方确认过的事实。</p><div class="matching-steps"><span class="done">✓ 时间位图有交集</span><span class="done">✓ 地点范围兼容</span><span class="active"><i></i> 正在整理候选人</span></div></main>`;
}

function CandidatesPage() {
  const list = candidateList();
  return `<main class="screen candidates-page">${topbar("匹配候选", `小绿找到了 ${list.length} 位可能同行的人`, true)}<div class="candidate-intro">${pet(true)}<p><strong>你来做最后选择</strong>我只整理与这次行动有关的事实。没被选中的人，我会替你礼貌回复。</p></div>${list.map((person, index) => `<article class="candidate-card card ${index === 0 ? "recommended" : ""}">${index === 0 ? `<span class="recommend-label">最合拍</span>` : ""}<span class="avatar avatar-${index}">${escapeHtml(person.avatar)}</span><div class="candidate-main"><div><h3>${escapeHtml(person.name)}</h3><span>${escapeHtml(person.match)}</span></div><p>${escapeHtml(person.note)}</p><ul>${person.facts.map(fact => `<li>${escapeHtml(fact)}</li>`).join("")}</ul><div class="match-reason"><strong>为什么适合</strong>${escapeHtml(person.reason)}</div></div><div class="candidate-actions"><button class="secondary" data-candidate-detail="${index}">查看资料</button><button class="primary" data-candidate="${escapeHtml(person.name)}">选择 ${escapeHtml(person.name)}</button></div></article>`).join("")}</main>`;
}

function CandidateDetailPage(index) {
  const person = candidateAt(index);
  return `<main class="screen candidate-detail-page">${topbar("同行者资料", `来自 ${escapeHtml(person.name)} 的公开信息`, true)}<section class="candidate-profile-card card">${profileAvatar(person.name)}<div><h2>${escapeHtml(person.name)}</h2><p>校园已认证 · 头像可进入公开花园</p><span>${escapeHtml(person.match)}</span></div></section><section class="a2a-proof-lite"><div class="a2a-proof-head"><div class="agent-pair"><span>🐦</span><span>🦊</span></div><div><small>A2A 过往经历总结</small><h3>为什么选择${escapeHtml(person.name)}</h3></div></div><p class="proof-intro">小绿与${escapeHtml(person.name)}的 Agent 核对了与这次行动有关的过往经历，只保留能支持你判断的部分。</p><div class="proof-facts">${person.facts.map(fact => `<span><i>✓</i>${escapeHtml(fact)}</span>`).join("")}</div><blockquote>${escapeHtml(person.reason)}</blockquote></section><button class="primary full profile-space-button" data-profile="${escapeHtml(person.name)}">进入${escapeHtml(person.name)}的主页花园</button><button class="secondary full a2a-record-button" data-a2a-record="${index}">查看完整 A2A 沟通记录</button><div class="candidate-detail-actions"><button class="ghost" data-action="back">继续比较</button><button class="primary" data-candidate="${escapeHtml(person.name)}">选择 ${escapeHtml(person.name)}</button></div></main>`;
}

function PublicGardenPage(name) {
  const garden = profileFor(name);
  return `<main class="screen public-garden-page">${topbar(`${escapeHtml(name)}的花园`, "经本人授权公开", true)}<section class="visitor-garden-hero"><img src="assets/garden-world-v2.png" alt="${escapeHtml(name)}的个性化花园底图"><div class="visitor-garden-shade"></div><div class="visitor-garden-house-note">房子与信箱位置将保持一致<br><small>宠物、花和兴趣装饰会因主人不同而变化</small></div><img class="visitor-pet" src="assets/pet-actions/${garden.pet}" alt="${escapeHtml(name)}的宠物">${garden.flowers.map((flower, index) => `<img class="visitor-flower visitor-flower-${index + 1}" src="assets/${flower}" alt="${escapeHtml(name)}种下的花">`).join("")}</section><section class="visitor-profile-card"><div class="visitor-profile-head"><span class="profile-avatar-link public-profile-avatar"><span>${escapeHtml(name.slice(-1))}</span><i>花园主人</i></span><div><small>校园已认证 · 公开花园</small><h2>${escapeHtml(name)}</h2><p>${escapeHtml(garden.tagline)}</p></div></div><div class="visitor-interest-list">${garden.interests.map(item => `<span>${escapeHtml(item)}</span>`).join("")}</div></section><div class="space-section-title"><h3>TA 做过的有趣事情</h3><span>只展示本人同意公开的回忆</span></div><div class="public-memory-list">${garden.memories.map((memory, index) => `<article><img src="assets/${garden.flowers[index % garden.flowers.length]}" alt=""><div><small>${index ? "愿意再次同行" : "最近开花"}</small><h3>${escapeHtml(memory)}</h3><p>这段经历的具体手账由参与者共同决定是否公开。</p></div></article>`).join("")}</div><p class="garden-placeholder-note">个性化家园 Mock 仍在设计中。本页已经把头像入口、数据结构和稳定的房子／信箱布局留好，后续可直接替换主人专属底图。</p></main>`;
}

function CandidateA2APage(index) {
  const person = candidateAt(index);
  return `<main class="screen candidate-a2a-page">${topbar("A2A 沟通记录", `小绿 × ${escapeHtml(person.name)}的 Agent`, true)}<div class="a2a-disclosure"><span>🔒</span><p><strong>仅展示本次匹配相关内容</strong><br>不交换联系方式，也不使用未授权的个人信息。</p></div><div class="a2a-record-log"><div class="a2a-chat-row mine"><span>🐦</span><div><b>小绿 · 小周的 Agent</b><p>小周想找同行者一起“${escapeHtml(ui.draft.idea || actionTitle())}”，时间是${escapeHtml(ui.draft.time)}，地点在${escapeHtml(ui.draft.place)}。</p></div></div><div class="a2a-chat-row peer"><div><b>${escapeHtml(person.name)}的 Agent</b><p>${escapeHtml(person.name)}对这项活动有兴趣。我可以核对与这次同行有关的过往经验。</p></div><span>🦊</span></div>${person.facts.map((fact, factIndex) => `<div class="a2a-chat-row ${factIndex % 2 ? "mine" : "peer"}">${factIndex % 2 ? `<span>🐦</span>` : ""}<div><b>${factIndex % 2 ? "小绿" : `${escapeHtml(person.name)}的 Agent`}</b><p>${escapeHtml(fact)}</p></div>${factIndex % 2 ? "" : `<span>🦊</span>`}</div>`).join("")}<div class="a2a-chat-row mine"><span>🐦</span><div><b>小绿 · 匹配结论</b><p>${escapeHtml(person.reason)} 最终是否选择，仍由小周本人决定。</p></div></div></div></main>`;
}

function ActionsPage() {
  const meta = stageMeta[server.stage] || stageMeta.SEED;
  return `<main class="screen github-aligned-page">${topbar("聊天列表", "同行与协作", true)}<div class="tabs chat-tabs"><button class="active">进行中的聊天</button><button>已结束</button></div><div class="conversation-list"><article class="action-list-item" data-route="chat"><div class="chat-avatar"><img src="assets/flower-7.png" alt=""></div><div class="chat-summary"><div><h3>${escapeHtml(actionTitle())}</h3><time>刚刚</time></div><p>${server.messages.length ? `${server.messages[server.messages.length - 1].author === "me" ? "我" : partnerName()}：${escapeHtml(server.messages[server.messages.length - 1].text)}` : `${partnerName()}：期待和你一起～`}</p><span>${server.selectedCandidate ? `${meta[0]} · 4 位群聊成员` : "演示会话 · 4 位群聊成员"}</span></div><div class="unread">1</div></article><article class="action-list-item"><div class="chat-avatar warm"><img src="assets/flower-8.png" alt=""></div><div class="chat-summary"><div><h3>一起看夏日音乐节</h3><time>昨天</time></div><p>小绿：已整理好双方方便的时间</p><span>正在安排 · 4 位成员</span></div></article></div></main>`;
}

function ChatPage() {
  const meta = stageMeta[server.stage] || stageMeta.SEED;
  const messages = server.messages.map(message => `<div class="message ${message.author === "me" ? "me" : "them"}">${escapeHtml(message.text)}</div>`).join("");
  const allConfirmed = server.slots.people && server.slots.time && server.slots.place;
  return `<main class="screen chat-screen github-aligned-page"><header class="chat-person-topbar"><button data-action="back" aria-label="返回">‹</button>${profileAvatar(partnerName())}<div><small>4 位群聊成员 · 点击头像看主页</small><h1>${escapeHtml(actionTitle())}</h1><button class="chat-profile-text" data-profile="${escapeHtml(partnerName())}">${escapeHtml(partnerName())}的花园 ›</button></div></header>
    <section class="chat-progress"><div class="growth-plant">${plant(server.stage, "sm", "green")}</div><div><strong>行动状态 · ${meta[0]}</strong><small>${meta[1]}</small></div></section>
    <div class="chat-log" id="chat-log">
      <div class="chat-divider"><span>匹配阶段 · 两位 Agent 的对话记录</span></div>
      <div class="agent-message own"><span class="agent-avatar">🐦</span><div><strong>小周的 Agent</strong><p>小周想找一位搭子一起「${escapeHtml(actionTitle())}」，希望时间和路线都合得来。</p><small>来自小周发布种子时确认的信息</small></div></div>
      <div class="agent-message peer"><span class="agent-avatar">🦊</span><div><strong>${partnerName()}的 Agent</strong><p>${partnerName()}时间和你合得上，对这次行动也很有兴趣，愿意一起完成。</p><small>来自${partnerName()}向自己 Agent 确认的信息</small></div></div>
      <div class="chat-divider active"><span>双方已确认组队 · 四方行动群聊开始</span></div>
      ${server.messages.length ? "" : `<div class="message them">嗨！很期待和你一起，咱们把时间地点定一下吧～</div>`}${messages}
      ${!ui.proposalsOpen && !allConfirmed ? `<button class="secondary full chat-help" data-action="help-progress">请小绿整理时间与地点</button>` : ""}
      ${ui.proposalsOpen ? `<section class="proposal card"><div class="proposal-head">${pet(true)}<div><span class="mini-label">AI 提案 · 需要人确认</span><h3>我只整理了你们刚才说过的</h3></div></div><div class="proposal-item ${server.slots.time ? "confirmed" : ""}"><span>${icon("clock")}</span><div><small>时间</small><strong>本周六 15:00</strong></div><button data-slot="time">${server.slots.time ? "已确认 ✓" : "确认时间"}</button></div><div class="proposal-item ${server.slots.place ? "confirmed" : ""}"><span>${icon("pin")}</span><div><small>集合地点</small><strong>学校北门</strong></div><button data-slot="place">${server.slots.place ? "已确认 ✓" : "确认地点"}</button></div><p class="proposal-note">小绿只生成提案；你的点击才会写入行动约定。</p></section>` : ""}
      ${allConfirmed ? `<section class="agreement card"><span class="mini-label">行动确认卡 · 双方已接受</span><h2>${escapeHtml(actionTitle())}</h2><p>${icon("clock")} 8 月 15 日 15:00</p><p>${icon("pin")} 学校北门集合</p><p>${icon("people")} 小周、${partnerName()} · 轻松路线</p><button class="primary full" data-action="open-completion">行动后回来打卡</button></section>` : ""}
    </div>
    <form class="chat-compose" id="chat-form"><input id="chat-input" maxlength="240" autocomplete="off" placeholder="在四方群聊中发消息…"><button aria-label="发送">发送</button></form>
  </main>`;
}

function CompletePage() {
  return `<main class="screen complete-page">${topbar(server.checkedIn ? "行动开花了" : "完成行动", "把真实发生的事留住", true)}<section class="completion-scene ${server.checkedIn ? "is-bloom" : ""}">${forestBackdrop()}${plant(server.checkedIn ? "BLOOM" : "BUD", "xl", "gold")}<div class="sparkles"><i></i><i></i><i></i><i></i></div></section>${server.checkedIn ? `<span class="complete-kicker">你们把一颗种子，变成了共同经历</span><h2>${escapeHtml(actionTitle())}</h2><p class="center-copy">现在它会开进你和${partnerName()}的森林，成为下一次行动的起点。</p><textarea id="memory-text" class="memory-input" placeholder="留下一句话，记住今天…">${escapeHtml(ui.memoryText)}</textarea><button class="primary full" data-action="archive-memory">收进我的森林</button>` : `<h2>这次行动真的发生了吗？</h2><p class="center-copy">打卡只记录行动事实，不公开评分，也不会惩罚提前说明的改期。</p><button class="primary full" data-action="check-in">我们完成了</button><button class="secondary full" data-action="back">先不打卡</button>`}</main>`;
}

function MemoryPage() {
  const inventory = flowerInventory();
  const people = gardenPeople();
  const visible = inventory.filter(flower =>
    (ui.forestLevel === "all" || flower.level === Number(ui.forestLevel))
    && (ui.forestPerson === "all" || flower.partnerId === ui.forestPerson)
  );
  const activePerson = people.find(person => person.id === ui.forestPerson);
  const levels = ["all", 1, 2, 3, 4, 5];
  return `<main class="screen memories-screen flower-library-page">${topbar("我的森林", `${inventory.length} 朵花的完整收藏`, true)}
    <section class="forest-space-intro"><span>FLOWER LIBRARY</span><h2>森林收好所有花，首页只展示你亲手选的</h2><p>首页花坛共有 ${DISPLAY_GARDEN_CAPACITY} 个位置，目前已种 ${displayGarden.length} 个。合并出的花会先进入这里，不会自己跑到首页。</p><button data-world="garden">回到我的展示花园 · ${displayGarden.length}/${DISPLAY_GARDEN_CAPACITY} ›</button></section>
    <section class="flower-library"><header><div><small>ALL FLOWERS</small><h2>花朵仓库</h2></div><p>等级和共同种花的人可以叠加筛选，例如“L1 + 橘子汽水”。</p></header>
      <div class="semantic-filter-block"><small>花朵等级</small><div class="level-filter" role="group" aria-label="按花朵等级筛选">${levels.map(level => `<button class="${String(ui.forestLevel) === String(level) ? "active" : ""}" data-flower-level="${level}">${level === "all" ? "全部" : `L${level}`}</button>`).join("")}</div></div>
      <div class="semantic-filter-block"><small>共同种花的人</small><label class="forest-person-search"><span>⌕</span><input data-forest-person-search list="forest-people" placeholder="搜索联系人" value="${activePerson ? escapeHtml(activePerson.name) : ""}" autocomplete="off"><datalist id="forest-people">${people.map(person => `<option value="${escapeHtml(person.name)}"></option>`).join("")}</datalist></label><div class="person-filter" role="group" aria-label="按共同种花的人筛选"><button class="${ui.forestPerson === "all" ? "active" : ""}" data-flower-person="all">所有人</button>${people.slice(0, 4).map(person => `<button class="${ui.forestPerson === person.id ? "active" : ""}" data-flower-person="${escapeHtml(person.id)}">${escapeHtml(person.name)}</button>`).join("")}</div></div>
      <p class="active-filter-summary">当前：${ui.forestLevel === "all" ? "全部等级" : `L${escapeHtml(ui.forestLevel)}`} × ${activePerson ? escapeHtml(activePerson.name) : "所有人"} · ${visible.length} 朵</p>
    ${visible.length ? `<div class="flower-library-grid">${visible.map(flower => `<article><button class="flower-library-art" ${flower.fusionPartnerId ? `data-fusion-partner="${escapeHtml(flower.fusionPartnerId)}"` : `data-memory="${escapeHtml(flower.memoryId)}"`}><span>L${flower.level} · ${escapeHtml(flower.tierName)}</span><img src="${escapeHtml(flower.image)}" alt="${escapeHtml(flower.title)}"></button><div><small>和${escapeHtml(flower.partnerName)}</small><h3>${escapeHtml(flower.title)}</h3><button class="garden-placement-button ${displayGarden.includes(flower.id) ? "planted" : ""}" data-display-flower="${escapeHtml(flower.id)}">${displayGarden.includes(flower.id) ? "✓ 已种在首页" : "种到首页花坛"}</button></div></article>`).join("")}</div>` : `<div class="empty-level"><span>🌱</span><strong>这个组合下还没有花</strong><p>换一个等级或联系人，看看别的共同经历。</p></div>`}</section>
  </main>`;
}

function BloomFusionPage(partnerId) {
  const fused = fusionFor(partnerId);
  const candidate = fusionCandidateFor(partnerId);
  const item = fused || candidate;
  if (!item) return `<main class="screen bloom-fusion-page">${topbar("关系花", "还没有可以共鸣的经历", true)}<section class="fusion-empty"><span>🌱</span><h2>再一起完成一件事吧</h2><p>与同一个人拥有两朵经历花后，这里会出现共鸣。</p></section></main>`;

  if (!fused) {
    return `<main class="screen bloom-fusion-page">${topbar("两朵花正在共鸣", `和${escapeHtml(item.partnerName)} · ${item.sourceFlowers.length} 段共同经历`, true)}<section class="fusion-hero"><span class="tier-pill">下一阶 · L${item.nextTier.level} ${escapeHtml(item.nextTier.name)}</span>${relationshipFlowerArt(item)}<p>两段真实发生过的事，在花园里认出了彼此。</p></section><section class="fusion-story-card"><small>将要融合的故事</small><h2>它们不会消失，而会多长出一条关系故事线</h2><div class="source-flower-list">${item.sourceFlowers.map((flower, index) => `<button data-memory="${escapeHtml(flower.memoryId)}"><img src="${escapeHtml(experienceFlowerUrl(flower))}" alt=""><span><small>第 ${index + 1} 次同行 · ${escapeHtml(flower.completedAt.slice(5).replace("-", "."))}</small><strong>${escapeHtml(flower.title)}</strong><p>${escapeHtml(flower.summary)}</p></span><i>›</i></button>`).join("")}</div></section><section class="fusion-rule-card"><div><span>${escapeHtml(item.nextTier.form)}</span><b>不是简单放大</b></div><p>${escapeHtml(item.nextTier.visualRule)}。原花和原手账永久保留。</p><div class="motif-preview">${item.sourceFlowers.flatMap(flower => flower.motifs).map(motif => `<span>${escapeHtml(motif)}</span>`).join("")}</div></section>${relationshipGrowthRoadmap(item.nextTier.level)}<button class="primary full fusion-cta" data-action="fuse-blooms" data-fusion-partner="${escapeHtml(item.partnerId)}">生成 L${item.nextTier.level} 专属升级花</button><small class="fusion-consent-note">由你主动触发 · 两张源花图与已确认的共同回忆会一起参与生成</small></main>`;
  }

  const generationCopy = fused.artwork.status === "ready"
    ? `<b>Seedream 真实图生图已完成</b><small>两张源花图与两段共同回忆共同参与生成，并通过理解模型视觉验收。</small>`
    : `<b>升级花生成失败</b><small>${escapeHtml(fused.artwork.error || "你仍可以保留关系手账并稍后重试。")}</small>`;
  const nextCount = Math.min(100, fused.experienceCount + 1);
  const isDisplayed = displayGarden.includes(fused.id);
  const showcase = flowerDetailShowcase({
    level: fused.tier.level,
    tierName: fused.tier.name,
    art: relationshipFlowerArt(fused),
    title: fused.title,
    description: fused.storyBridge,
    className: "is-fused",
  });
  return `<main class="screen bloom-fusion-page fused-journal-page">${topbar(fused.title, `和${escapeHtml(fused.partnerName)}的关系手账`, true)}${showcase}<section class="fusion-detail-status"><div class="generation-status"><i></i><span>${generationCopy}</span></div><div class="fusion-library-status"><span>已收进森林花库</span><strong>${isDisplayed ? "也种在首页花坛中" : "不会自动占用首页花坛"}</strong><button data-world="forest">去森林${isDisplayed ? "管理花坛" : "选择种植"} ›</button></div></section><article class="relationship-journal"><header><small>OUR STORY · ${fused.experienceCount} CHAPTERS</small><h2>你们一起写下的故事</h2><p>每一章都汇入原手账中的文字与真实照片；原手账仍会永久保留。</p></header><div class="relationship-timeline">${fused.sourceFlowers.map((flower, index) => `<section><span class="chapter-index">${String(index + 1).padStart(2, "0")}</span><div><small>${escapeHtml(flower.completedAt)} · ${escapeHtml(flower.place)}</small><h3>${escapeHtml(flower.title)}</h3><p>${escapeHtml(flower.summary)}</p><blockquote>“${escapeHtml(flower.quote)}”</blockquote>${journalPhotoStory(memoryJournals[flower.memoryId], flower.title, true)}<button data-memory="${escapeHtml(flower.memoryId)}">打开这一章的完整手账 ›</button></div></section>`).join("")}</div><footer><small>融合后长出的颜色与纹样</small><div>${fused.palette.concat(fused.motifs).map(token => `<span>${escapeHtml(token)}</span>`).join("")}</div></footer></article><section class="growth-ladder"><small>下一次共同经历</small><h2>再种 1 朵，升级为 L${nextCount}</h2><div><i style="width:${Math.min(100, fused.experienceCount / nextCount * 100)}%"></i></div><p>${fused.tier.visualRule}</p></section>${relationshipGrowthRoadmap(fused.tier.level)}<button class="primary full" data-action="again">和${escapeHtml(fused.partnerName)}再种一朵</button></main>`;
}

function PlantDetailPage(id) {
  const item = gardenPlants[id] || gardenPlants.ride;
  if (item.status === "active") return `<main class="screen plant-detail-page">${topbar(actionTitle(), "正在生长", true)}<section class="plant-detail-hero active">${sceneImage("assets/garden-scene.png", "花园里的行动植物")}<img src="assets/${server.stage === "BLOOM" ? "flower-6.png" : "tree.png"}" alt="${escapeHtml(actionTitle())}"></section><span class="plant-state">${stageMeta[server.stage]?.[0] || "生长中"}</span><h2>${escapeHtml(actionTitle())}</h2><p>${item.copy}</p><section class="plant-timeline"><span class="done">种下愿望</span><span class="done">找到同行者</span><span>确认行动细节</span><span>完成并开花</span></section><button class="primary full" data-action="open-plant-chat">回到行动对话</button></main>`;
  return MemoryDetailPage(id, item);
}

function MemoryDetailPage(id, source) {
  const fallback = gardenPlants.music || { title: "一段共同回忆", peer: "朋友", date: "最近", copy: "这段经历已经被收进花园。" };
  const item = source || gardenPlants[id] || fallback;
  const title = id === "current" && server.archived ? actionTitle() : item.title;
  const peer = id === "current" && server.archived ? partnerName() : item.peer;
  const copy = id === "current" && ui.memoryText ? ui.memoryText : item.copy;
  const journal = memoryJournals[id] || {
    kicker: "一株刚刚收好的花",
    date: item.date || "最近",
    place: "共同抵达的地方",
    participants: ["小周", ...String(peer).split("、")],
    note: copy,
    quote: copy,
    chat: ["这段记忆已经收好。", "下次再一起出发。"],
    photos: [],
    captions: [],
    flower: item.asset ? `/world/assets/${item.asset}` : "/world/assets/flower-7.png",
    evidence: ["活动元数据", "参与者主动提交的感言"],
  };
  const flower = journal.flower || (item.asset ? `/world/assets/${item.asset}` : "/world/assets/flower-7.png");
  const showcase = flowerDetailShowcase({
    level: 1,
    tierName: "经历花",
    art: `<img src="${escapeHtml(flower)}" alt="${escapeHtml(title)}开出的花">`,
    title,
    description: `由这一次和${peer}共同完成的经历生长而来`,
    className: "is-experience",
  });
  return `<main class="screen memory-detail-page memory-journal-page">${topbar(title, "这株花保存的共同回忆", true)}${showcase}<article class="journal-book"><section class="journal-paper"><div class="journal-meta"><span>NO. ${escapeHtml(journal.number || "MEMORY")}</span><span>${escapeHtml(journal.date)} · ${escapeHtml(journal.place)}</span></div><p class="journal-kicker">${escapeHtml(journal.kicker)}</p><h2>${escapeHtml(title)}</h2><div class="journal-people"><span>那天在场</span>${journal.participants.map(name => `<button data-profile="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join("")}</div><p class="journal-note">${escapeHtml(journal.note)}</p><blockquote class="journal-quote">“${escapeHtml(journal.quote)}”<small>${escapeHtml(journal.quoteLabel || "参与者提交的感言")}</small></blockquote>${journalPhotoStory(journal, title)}<div class="journal-sticker sticker-one">一起<br>发生</div><div class="journal-sticker sticker-two">记住<br>这一天</div><div class="journal-doodle" aria-hidden="true">⌁ · · · ⌁</div><section class="journal-chat"><small>${escapeHtml(journal.chatLabel || "当时获准收录的两句话")}</small><p>${escapeHtml(journal.chat[0])}</p><p>${escapeHtml(journal.chat[1])}</p></section><details class="journal-evidence"><summary>这页手账用了哪些已确认材料</summary><ul>${journal.evidence.map(entry => `<li>${escapeHtml(entry)}</li>`).join("")}</ul><p>小花只整理参与者交给它的材料，不补写无法知道的现场细节。</p></details></section></article><div class="memory-detail-actions"><button class="secondary full" data-action="open-all-memories">查看全部回忆</button><button class="primary full" data-action="again">从这里再种一颗种子</button></div></main>`;
}

function ProfilePage() {
  return `<main class="screen profile-page">${topbar("记忆书架", "从家里的书架打开", true)}<section class="profile-hero card"><span class="avatar profile-avatar">周</span>${pet()}<div><h2>小周与小绿</h2><p>校园已认证 · 一起做成过 8 件事</p></div><div class="profile-stats"><span><b>8</b>共同经历</span><span><b>5</b>再次同行</span><span><b>72%</b>小绿了解度</span></div></section><section class="settings card"><button>兴趣与行动偏好 <span>›</span></button><button>小绿可对外使用的信息 <span>›</span></button><button>空闲时间 <span>已更新</span></button><button>隐私与安全 <span>›</span></button></section><button class="reset-button" data-action="reset-demo">重置演示进度</button></main>`;
}

function page() {
  if (ui.route === "world-home") return HomeWorldPage();
  if (ui.route?.startsWith("seed:")) return SeedDetailPage(ui.route.split(":")[1]);
  if (ui.route?.startsWith("plant:")) return PlantDetailPage(ui.route.split(":")[1]);
  if (ui.route?.startsWith("memory:")) return MemoryDetailPage(ui.route.split(":")[1]);
  if (ui.route?.startsWith("fusion:")) return BloomFusionPage(ui.route.split(":")[1]);
  if (ui.route?.startsWith("profile:")) return PublicGardenPage(decodeURIComponent(ui.route.slice(8)));
  if (ui.route?.startsWith("candidate-a2a:")) return CandidateA2APage(ui.route.split(":")[1]);
  if (ui.route?.startsWith("candidate:")) return CandidateDetailPage(ui.route.split(":")[1]);
  return ({ publish: PublishPage, matching: MatchingPage, candidates: CandidatesPage, chat: ChatPage, complete: CompletePage, memory: MemoryPage }[ui.route]
    || { garden: WorldGardenPage, mailbox: MailboxPage, actions: ActionsPage, profile: ProfilePage }[ui.tab]
    || WorldGardenPage)();
}

function render() {
  const app = document.querySelector("#app");
  if (!app.querySelector(".app-shell")) {
    app.innerHTML = `<div class="app-shell"><div class="phone"></div><aside class="demo-guide"><span>社交森林 · 世界原型</span><h2>花园不是首页，<br>花园就是世界。</h2><p>场景内导航</p><ol><li>点击房子进入可装扮的 Home</li><li>点击信箱读取行动种子</li><li>点击花圃种下愿望或查看成长</li><li>点击宠物进行生活化互动</li><li>行动完成后，植物进入回忆林</li></ol><small>花园、Home 与植物组件已接入正式绘本资产；交互热点独立于底图，便于继续替换动画层。</small></aside></div>`;
  }
  app.querySelector(".phone").innerHTML = `${page()}${ui.loading ? `<div class="loading"><i></i><span>小绿正在跑腿…</span></div>` : ""}${ui.toast ? `<div class="toast">${escapeHtml(ui.toast)}</div>` : ""}`;
  requestAnimationFrame(() => { const log = document.querySelector("#chat-log"); if (log) log.scrollTop = log.scrollHeight; });
  requestAnimationFrame(() => window.WorldLayer?.mount());
}

function goBack() {
  if (ui.route === "world-home") { ui.route = null; ui.tab = "garden"; }
  else if (ui.route?.startsWith("seed:")) { ui.route = null; ui.tab = "mailbox"; }
  else if (ui.route?.startsWith("plant:")) { ui.route = null; ui.tab = "garden"; }
  else if (ui.route?.startsWith("memory:")) { ui.route = ui.memoryReturn || "memory"; ui.memoryReturn = null; }
  else if (ui.route?.startsWith("fusion:")) { ui.route = "memory"; }
  else if (ui.route?.startsWith("profile:")) { ui.route = ui.profileReturn || null; ui.profileReturn = null; }
  else if (ui.route?.startsWith("candidate-space:") || ui.route?.startsWith("candidate-a2a:")) ui.route = `candidate:${ui.route.split(":")[1]}`;
  else if (ui.route?.startsWith("candidate:")) ui.route = "candidates";
  else if (ui.route === "chat" || ui.route === "memory") { const previous = ui.route; ui.route = null; ui.tab = previous === "chat" ? "actions" : "garden"; }
  else if (ui.route === "candidates" || ui.route === "matching") ui.route = "publish";
  else { ui.route = null; ui.tab = "garden"; }
  render();
}

document.addEventListener("click", async event => {
  if (event.target.closest(".world-mailbox-panel") && !event.target.closest("button, [data-seed], [data-action]")) return;
  if (event.target.closest(".garden-switcher-panel") && !event.target.closest("button")) return;
  const target = event.target.closest("button, [data-route], [data-seed], [data-plant], [data-memory], [data-action], [data-profile], [data-fusion-partner], [data-display-flower], [data-flower-level], [data-flower-person], [data-garden-partner], [data-garden-view], [data-garden-tab]");
  if (!target) return;
  if (target.dataset.tab) { ui.tab = target.dataset.tab; ui.route = null; return render(); }
  if (target.dataset.route) { ui.route = target.dataset.route; return render(); }
  if (target.dataset.seed) { ui.mailboxOverlay = false; markMailboxRead(); ui.route = `seed:${target.dataset.seed}`; return render(); }
  if (target.dataset.plant) { ui.route = `plant:${target.dataset.plant}`; return render(); }
  if (target.dataset.memory) {
    ui.memoryReturn = ui.route?.startsWith("fusion:") ? ui.route : null;
    ui.route = `memory:${target.dataset.memory}`;
    return render();
  }
  if (target.dataset.fusionPartner && target.dataset.action !== "fuse-blooms") {
    ui.route = `fusion:${target.dataset.fusionPartner}`;
    return render();
  }
  if (target.dataset.flowerLevel) { ui.forestLevel = target.dataset.flowerLevel; return render(); }
  if (target.dataset.flowerPerson) { ui.forestPerson = target.dataset.flowerPerson; return render(); }
  if (target.dataset.gardenTab) { ui.gardenSwitcherTab = target.dataset.gardenTab; return render(); }
  if (target.dataset.gardenPartner) {
    ui.activeGardenMode = target.dataset.gardenMode || "shared";
    ui.activeGardenPartnerId = target.dataset.gardenPartner;
    ui.gardenSwitcherOpen = false;
    const name = gardenPeople().find(person => person.id === ui.activeGardenPartnerId)?.name || "朋友";
    notify(ui.activeGardenMode === "friend" ? `已经走进${name}自己的花园` : `已经走进和${name}的共同花园`);
    return render();
  }
  if (target.dataset.gardenView === "mine") {
    ui.activeGardenMode = "mine";
    ui.activeGardenPartnerId = null;
    ui.gardenSwitcherOpen = false;
    notify("已经回到我的展示花园");
    return render();
  }
  if (target.dataset.displayFlower) {
    const flower = flowerInventory().find(item => item.id === target.dataset.displayFlower);
    const result = toggleFlowerInDisplayGarden(target.dataset.displayFlower);
    if (result.full) return notify(`首页 ${DISPLAY_GARDEN_CAPACITY} 个花坛已经种满，请先换下一朵花`);
    notify(result.planted ? `${flower?.title || "这朵花"}已经种进首页花坛` : `${flower?.title || "这朵花"}已收回森林`);
    return render();
  }
  if (target.dataset.profile) { ui.profileReturn = ui.route; ui.route = `profile:${encodeURIComponent(target.dataset.profile)}`; return render(); }
  if (target.dataset.mailbox) { ui.mailboxMode = target.dataset.mailbox; return render(); }
  if (target.dataset.world) {
    const destination = target.dataset.world;
    if (destination === "garden") { ui.route = null; ui.tab = "garden"; }
    if (destination === "home") ui.route = "world-home";
    if (destination === "mailbox") { ui.route = null; ui.tab = "mailbox"; }
    if (destination === "forest") ui.route = "memory";
    if (destination === "profile") { ui.route = null; ui.tab = "profile"; }
    if (destination === "actions") { ui.route = null; ui.tab = "actions"; }
    if (destination === "plot") ui.route = server.selectedCandidate ? "chat" : "publish";
    return render();
  }
  if (target.dataset.idea) { ui.draft.idea = target.dataset.idea; ui.publishStep = 1; return render(); }
  if (target.dataset.date) { ui.selectedDate = target.dataset.date; return render(); }
  if (target.dataset.period) { ui.selectedPeriod = target.dataset.period; return render(); }
  if (target.dataset.publishChoice) {
    const [field, value] = target.dataset.publishChoice.split(":");
    if (field === "idea") { ui.draft.idea = value; ui.publishStep = 1; }
    if (field === "place") { ui.draft.place = value; ui.publishStep = 3; }
    return render();
  }
  if (target.dataset.companion) { ui.draft.companion = target.dataset.companion; ui.publishStep = 4; return render(); }
  if (target.dataset.habit) { ui.draft.habit = target.dataset.habit; return prepareActivityQuestion(); }
  if (target.dataset.activityDetail) { ui.draft.activityDetail = target.dataset.activityDetail; ui.publishStep = 6; return render(); }
  if (target.dataset.candidateDetail !== undefined) { ui.route = `candidate:${target.dataset.candidateDetail}`; return render(); }
  if (target.dataset.personSpace !== undefined) { ui.route = `candidate-space:${target.dataset.personSpace}`; return render(); }
  if (target.dataset.a2aRecord !== undefined) { ui.route = `candidate-a2a:${target.dataset.a2aRecord}`; return render(); }
  if (target.dataset.draft) return notify("MVP 中使用预填演示值；联调接口已保留结构化字段");
  if (target.dataset.candidate) {
    if (!await api("/api/gatherings/select", { name: target.dataset.candidate })) return;
    ui.route = "chat";
    notify(`已和${target.dataset.candidate}成为搭子，另外两位已由小绿礼貌回复`);
    return render();
  }
  if (target.dataset.slot) {
    const slot = target.dataset.slot;
    if (server.slots[slot]) return;
    await api("/api/proposals/confirm", { slot, value: slot === "time" ? "本周六 15:00" : "学校北门" });
    notify(slot === "time" ? "时间已由你确认，植物长高了一点" : "行动约定已完整，花苞出现了");
    return;
  }

  const action = target.dataset.action;
  if (action === "back") return goBack();
  if (action === "world-help") return notify("首页永远使用同一组 6 个花坛；点小桥可切换朋友花园，去森林可组合筛选完整花库");
  if (action === "open-garden-switcher") { ui.gardenSwitcherOpen = true; return render(); }
  if (action === "close-garden-switcher") { ui.gardenSwitcherOpen = false; return render(); }
  if (action === "open-home") { ui.route = "world-home"; return render(); }
  if (action === "open-mailbox-overlay") {
    markMailboxRead();
    ui.openingObject = "mailbox";
    ui.mailboxOverlay = true;
    render();
    setTimeout(() => {
      ui.openingObject = "";
      document.querySelector(".world-object-effects")?.classList.remove("opening-mailbox");
    }, 560);
    return;
  }
  if (action === "open-empty-plot") { ui.route = "memory"; return render(); }
  if (action === "visit-friend-flower") return notify("这是朋友花园里的故事；等对方授权后才会打开完整手账");
  if (action === "close-mailbox-overlay") { ui.mailboxOverlay = false; return render(); }
  if (action === "close-welcome-letter") { ui.mailboxOverlay = false; ui.welcomeLetter = false; return render(); }
  if (action === "show-mailbox-preview") { markMailboxRead(); ui.welcomeLetter = false; return render(); }
  if (action === "expand-mailbox") { markMailboxRead(); ui.mailboxOverlay = false; ui.route = null; ui.tab = "mailbox"; return render(); }
  if (action === "pet-talk" && document.querySelector(".garden-world-screen")) { window.WorldLayer?.interactPet(); return; }
  if (action === "pet-talk") { ui.petMood = ui.petMood === "happy" ? "idle" : "happy"; return render(); }
  if (action === "pet-sleep") { ui.petMood = "sleep"; notify("小绿睡着了，等会儿还会自己醒来"); return render(); }
  if (action === "decorate") { ui.decorated = !ui.decorated; notify(ui.decorated ? "摆上了新地毯和花灯" : "已收起本次装扮"); return render(); }
  if (action === "notify") return notify("3 个新机会已经放进信箱");
  if (action === "publish") return startPublishFlow();
  if (action === "open-plant-chat") { ui.route = "chat"; return render(); }
  if (action === "open-all-memories") { ui.route = "memory"; return render(); }
  if (action === "view-candidates") { ui.route = "candidates"; return render(); }
  if (action === "confirm-time") {
    if (!ui.selectedDate || !ui.selectedPeriod) return notify("请先选好日期和时段");
    ui.draft.time = `${ui.selectedDate} ${ui.selectedPeriod}`;
    ui.publishStep = 2;
    return render();
  }
  if (action === "use-location") {
    if (!navigator.geolocation) return notify("当前设备暂不支持定位，请输入地址");
    navigator.geolocation.getCurrentPosition(
      position => {
        ui.draft.place = `我的位置（${position.coords.latitude.toFixed(3)}, ${position.coords.longitude.toFixed(3)}）`;
        ui.publishStep = 3;
        render();
      },
      () => notify("没有取得定位权限，可以直接输入地址")
    );
    return;
  }
  if (action === "retry-activity-question") return prepareActivityQuestion();
  if (action === "publish-reset") return startPublishFlow();
  if (action === "edit-draft") { ui.publishStep = 0; return render(); }
  if (action === "confirm-publish") {
    if (!await api("/api/gatherings/publish", ui.draft)) return;
    ui.route = "matching";
    render();
    setTimeout(() => { if (ui.route === "matching") { ui.route = "candidates"; render(); } }, 1500);
    return;
  }
  if (action === "decline-seed") { ui.route = null; ui.tab = "mailbox"; notify("没关系，小绿会继续帮你留意"); return render(); }
  if (action === "join-seed") { ui.route = null; ui.tab = "mailbox"; ui.mailboxMode = "sent"; notify("参与意向已送回去，最终决定仍由对方完成"); return render(); }
  if (action === "help-progress") { ui.proposalsOpen = true; return render(); }
  if (action === "show-stage") return notify(`${stageMeta[server.stage][0]}：${stageMeta[server.stage][1]}`);
  if (action === "open-completion") { ui.route = "complete"; return render(); }
  if (action === "check-in") { if (await api("/api/gatherings/check-in", {})) notify("打卡成功，植物开花了！"); return; }
  if (action === "archive-memory") {
    ui.memoryText = document.querySelector("#memory-text")?.value.trim() || "湖边的光比想象中更好看。";
    if (!await api("/api/gatherings/archive", { text: ui.memoryText })) return;
    ui.route = "memory";
    notify("共同经历已进入你们的森林");
    return render();
  }
  if (action === "fuse-blooms") {
    const candidate = fusionCandidateFor(target.dataset.fusionPartner);
    if (!candidate) return notify("还没有找到可以共鸣的两朵花");
    const result = await fusionApi({ sourceFlowerIds: candidate.sourceFlowers.map(flower => flower.id), generateArtwork: true });
    if (!result) return;
    ui.route = `fusion:${candidate.partnerId}`;
    notify("L2 双生共鸣花已进入森林；去花库选择是否种到首页");
    return render();
  }
  if (action === "again") { ui.route = "publish"; ui.publishStep = 1; ui.draft.idea = "再约一次磨山轻徒步"; return render(); }
  if (action === "reset-demo") { await api("/api/demo/reset", {}); await fusionApi(undefined, { method: "DELETE", silent: true }); try { localStorage.removeItem(MAIL_READ_KEY); localStorage.removeItem(DISPLAY_GARDEN_KEY); } catch {} displayGarden = ["hackathon", "ride", "music", "worldcup", "gelato", "tulip"]; ui = initialUi(); notify("演示进度已重置"); return render(); }
});

document.addEventListener("cobloom:seed-caught", event => receiveCaughtSeed(event.detail?.seed));

document.addEventListener("input", event => {
  if (!event.target.matches("[data-garden-person-search]")) return;
  const query = event.target.value.trim().toLocaleLowerCase("zh-CN");
  document.querySelectorAll(".garden-switcher-list [data-person-name]").forEach(button => {
    button.hidden = Boolean(query) && !button.dataset.personName.toLocaleLowerCase("zh-CN").includes(query);
  });
});

document.addEventListener("change", event => {
  if (!event.target.matches("[data-forest-person-search]")) return;
  const query = event.target.value.trim();
  const person = gardenPeople().find(item => item.name === query);
  ui.forestPerson = person?.id || "all";
  render();
});

document.addEventListener("submit", async event => {
  event.preventDefault();
  if (event.target.id === "publish-form") {
    const value = document.querySelector("#publish-input")?.value.trim();
    if (!value) return notify("先告诉小绿你最近想做什么");
    ui.draft.idea = value;
    ui.publishStep = 1;
    return render();
  }
  if (event.target.id === "companion-form") {
    const value = document.querySelector("#companion-input")?.value.trim();
    if (!value) return notify("写一句你对同行者最在意的要求吧");
    ui.draft.companion = value;
    ui.publishStep = 4;
    return render();
  }
  if (event.target.id === "place-form") {
    const value = document.querySelector("#place-input")?.value.trim();
    if (!value) return notify("请输入具体地点或地址");
    ui.draft.place = value;
    ui.publishStep = 3;
    return render();
  }
  if (event.target.id === "activity-detail-form") {
    const value = document.querySelector("#activity-detail-input")?.value.trim();
    if (!value) return notify("用一句话补充这次活动的特殊要求吧");
    ui.draft.activityDetail = value;
    ui.publishStep = 6;
    return render();
  }
  if (event.target.id === "chat-form") {
    const input = document.querySelector("#chat-input");
    const value = input?.value.trim();
    if (!value) return;
    if (await api("/api/chat/messages", { author: "me", text: value })) notify(server.stage === "LEAF" ? "第一次真人对话让植物长出了叶子" : "消息已发送");
  }
});

window.addEventListener("popstate", render);
api("/api/demo", undefined, { silent: true });
fusionApi(undefined, { silent: true });
