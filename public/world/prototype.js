const MAIL_READ_KEY = "cobloom.mailbox.read.v1";

function unreadMailCount() {
  try { return localStorage.getItem(MAIL_READ_KEY) === "1" ? 0 : 3; }
  catch { return 3; }
}

function markMailboxRead() {
  ui.unreadMail = 0;
  try { localStorage.setItem(MAIL_READ_KEY, "1"); } catch {}
}

const initialUi = () => {
  const unreadMail = unreadMailCount();
  return ({
  tab: "garden",
  route: null,
  toast: "",
  loading: false,
  publishStep: 0,
  calendarMonthOffset: 0,
  selectedDate: "",
  selectedPeriods: [],
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
  activityQuestionRequestId: 0,
  proposalsOpen: false,
  completionOpen: false,
  memoryText: "",
  mailboxMode: "received",
  mailboxOverlay: unreadMail > 0,
  welcomeLetter: unreadMail > 0,
  unreadMail,
  openingObject: "",
  decorated: false,
  petMood: "idle",
  joinedSeeds: [],
  });
};

let ui = initialUi();
let server = { stage: "SEED", published: false, selectedCandidate: null, messages: [], slots: { people: false, time: false, place: false }, checkedIn: false, archived: false };
let toastTimer;

const seeds = [
  { id: "hike", title: "周六一起去爬山", type: "户外", time: "周六 08:30", place: "学校周边", peer: "小蓝", color: "sage", asset: "flower-1.png", petAsset: "pet-mail.png", preview: "看到你也想去爬山，要不要一起走一条轻松的路线？", letter: "嗨，小周：\n\n看到你也想在周六出去走走。我去过磨山两次，有一条不陡、沿途也很好拍照的路线。我们可以慢慢走，累了就停下来看看风景，新手也完全没问题。\n\n如果你愿意，我们周六早上从学校北门出发，当天回来。", tags: ["新手友好", "当天往返"], reason: "你们周六上午都有空，都接受新手路线，也都希望当天往返。" },
  { id: "show", title: "一起去看话剧", type: "文艺", time: "周日 19:00", place: "市中心大剧院", peer: "小雨", color: "pink", asset: "flower-2.png", petAsset: "pet-talk.png", preview: "我刚好也收藏了这部剧，散场后还可以一起聊聊。", letter: "小周，你好：\n\n我发现我们都收藏了周日晚上的那场话剧。我已经买好票了，旁边的位置还空着。如果你也想去，我们可以提前半小时在剧院门口碰面。\n\n散场后要是不太晚，还可以找个安静的地方聊聊最喜欢的片段。", tags: ["已有票", "周日晚"], reason: "你们收藏了同一部剧，也都偏好周日晚上出发。" },
  { id: "ride", title: "周末骑行环湖", type: "运动", time: "周日 09:00", place: "西湖环线", peer: "阿杰", color: "gold", asset: "flower-3.png", petAsset: "pet-idle.png", preview: "想约一次不赶速度的环湖骑行，二十公里左右。", letter: "嗨：\n\n这周日天气看起来不错，想找一位搭子轻松环湖。不追配速，大约二十公里，中间会停下来喝水和拍照。\n\n如果你的车需要简单检查，我也可以提前帮忙看看胎压和刹车。", tags: ["轻松骑行", "20 km"], reason: "你们都接受 20 公里轻量路线，空闲时段有 3 小时重合。" },
];

const gardenPlants = {
  current: { title: "周六一起爬磨山", status: "active", asset: "tree.png", peer: "小蓝", date: "本周六", copy: "时间和地点还在确认中。回到行动群聊继续推进。" },
  ride: { title: "东湖的夏日晚风", status: "memory", asset: "flower-1.png", peer: "阿澄", date: "7 月 26 日", copy: "湖边的风很轻，我们停下来拍了很久的落日。" },
  photo: { title: "樱花季扫街", status: "memory", asset: "flower-4.png", peer: "小满", date: "4 月 5 日", copy: "一边走，一边交换镜头里的春天。" },
  study: { title: "周末旧书店寻宝", status: "memory", asset: "flower-3.png", peer: "鹿鸣", date: "6 月 16 日", copy: "找到了彼此小时候都读过的那一本。" },
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
// partnerName 仅用于展示，直接返回已转义值，避免各调用点漏转义（名字来自 LLM/用户不可控输入）
function partnerName() { return escapeHtml(server.selectedCandidate || "小蓝"); }
function candidateList() {
  if (server.published) return server.candidates || [];
  return (server.candidates && server.candidates.length) ? server.candidates : candidates;
}
function candidateAt(index) { return candidateList()[Number(index)] || candidateList()[0]; }

async function api(path, body) {
  if (ui.loading) return null; // 防连点：进行中的请求未回来前，忽略重复提交
  ui.loading = true;
  render();
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
    ui.loading = false;
    render();
  }
}

function upcomingDates() {
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const month = new Date(today.getFullYear(), today.getMonth() + ui.calendarMonthOffset, 1);
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstWeekday = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const dates = Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(year, monthIndex, index + 1);
    const day = `${monthIndex + 1}月${date.getDate()}日`;
    return {
      value: `${day} ${weekdays[date.getDay()]}`,
      day: date.getDate(),
      isToday: date.getTime() === today.getTime(),
      disabled: date < today,
    };
  });
  return {
    label: `${year}年 ${monthIndex + 1}月`,
    dates: [...Array(firstWeekday).fill(null), ...dates],
  };
}

function startPublishFlow() {
  const fresh = initialUi();
  ui.activityQuestionRequestId += 1;
  ui.route = "publish";
  ui.publishStep = 0;
  ui.calendarMonthOffset = 0;
  ui.draft = fresh.draft;
  ui.selectedDate = "";
  ui.selectedPeriods = [];
  ui.activityQuestion = "";
  ui.activityOptions = [];
  ui.activityQuestionError = false;
  ui.activityQuestionLoading = false;
  render();
}

async function prepareActivityQuestion() {
  const requestId = ++ui.activityQuestionRequestId;
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
    if (requestId !== ui.activityQuestionRequestId) return;
    ui.activityQuestion = result.reply;
    ui.activityOptions = result.options;
  } catch (error) {
    if (requestId !== ui.activityQuestionRequestId) return;
    ui.activityQuestionError = true;
    notify(error.message || "小绿暂时没想好怎么追问");
  } finally {
    if (requestId !== ui.activityQuestionRequestId) return;
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
  // 关键卡片上的图标用内联 SVG，避免生僻 Unicode 在 iOS/Android 被渲染成彩色 emoji
  const svgPaths = {
    bell: `<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>`,
    clock: `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`,
    pin: `<path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11Z"/><circle cx="12" cy="10" r="2.4"/>`,
    people: `<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16.5 6.6a3 3 0 0 1 0 5.6M20.5 20a5.5 5.5 0 0 0-3.6-5.2"/>`,
  };
  if (svgPaths[name]) return `<svg class="${name === "bell" ? "bell-icon" : "ui-svg"}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svgPaths[name]}</svg>`;
  const icons = { garden: "⌂", mailbox: "✉", actions: "◲", forest: "❀", profile: "◍", back: "‹" };
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
    <button class="round-button bell" data-action="notify" aria-label="通知">${icon("bell")}${ui.unreadMail ? `<b>${ui.unreadMail}</b>` : ""}</button>
  </header>`;
}

function nav() {
  const items = [["garden", "花园"], ["mailbox", "信箱"], ["publish", ""], ["actions", "行动中"], ["profile", "我的"]];
  return `<nav class="bottom-nav">${items.map(([id, label]) => id === "publish"
    ? `<button class="publish-button" data-action="publish" aria-label="种下一颗行动种子"><span>＋</span></button>`
    : `<button class="nav-item ${ui.tab === id && !ui.route ? "active" : ""}" data-tab="${id}">${icon(id)}<small>${label}</small>${id === "mailbox" ? "<b>3</b>" : ""}</button>`).join("")}</nav>`;
}

function WorldGardenPage() {
  const meta = stageMeta[server.stage] || stageMeta.SEED;
  const world = window.WorldLayer;
  return `<main class="world-screen garden-world-screen ${ui.mailboxOverlay ? "has-world-modal" : ""}">
    <section class="game-hud"><div><small>小周的社交森林</small><strong>${server.selectedCandidate ? `1 株植物 · ${meta[0]}` : "花园里还有空地"}</strong></div><button data-action="world-help">?</button></section>
    <div class="world-scene">
      ${sceneImage(world.scenes.garden.image, "绘本风社交花园：小屋、信箱、花圃、小桥和溪流")}
      <div class="garden-growth-layer" aria-label="花园中的行动植物">
        ${server.selectedCandidate ? `<button class="real-plant-slot" data-plot-id="current" style="${world.plantStyle("current")}" data-plant="current" aria-label="打开${escapeHtml(actionTitle())}"><img src="assets/${server.stage === "FOREST" ? "flower-7.png" : server.stage === "BLOOM" ? "flower-6.png" : "tree.png"}" alt=""></button>` : ""}
        <button class="real-plant-slot" data-plot-id="ride" style="${world.plantStyle("ride")}" data-plant="ride" aria-label="打开东湖骑行回忆"><img src="assets/flower-1.png" alt=""></button>
        <button class="real-plant-slot" data-plot-id="photo" style="${world.plantStyle("photo")}" data-plant="photo" aria-label="打开樱花摄影回忆"><img src="assets/flower-4.png" alt=""></button>
        <button class="real-plant-slot" data-plot-id="study" style="${world.plantStyle("study")}" data-plant="study" aria-label="打开周末自习回忆"><img src="assets/flower-3.png" alt=""></button>
      </div>
      ${world.objectEffectsMarkup(ui.openingObject)}
      <button class="world-hotspot" data-anchor="home" style="${world.anchorStyle("garden", "home")}" data-action="open-home" aria-label="进入我的家"></button>
      <button class="world-hotspot mailbox-object" data-anchor="mailbox" style="${world.anchorStyle("garden", "mailbox")}" data-action="open-mailbox-overlay" aria-label="打开种子信箱">${ui.unreadMail ? `<span class="mail-notice"><img src="assets/nav-mailbox-v2.png" alt=""><b>${ui.unreadMail}</b></span>` : ""}</button>
      ${ui.mailboxOverlay ? MailboxOverlay(ui.welcomeLetter) : ""}
    </div>
    <div class="world-dock"><button data-world="garden"><img src="assets/nav-garden-v2.png" alt=""><small>花园</small></button><button data-world="actions"><img src="assets/nav-chat-v2.png" alt=""><small>聊天</small></button><button class="dock-seed" data-action="publish" aria-label="种下一件想做的事"><span class="dock-plus" aria-hidden="true"></span></button><button data-world="mailbox"><img src="assets/nav-mailbox-v2.png" alt=""><small>信箱</small></button><button data-world="profile"><img src="assets/nav-profile-v2.png" alt=""><small>我的</small></button></div>
  </main>`;
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
    <div class="tabs"><button class="${ui.mailboxMode === "received" ? "active" : ""}" data-mailbox="received">收到的种子 3</button><button class="${ui.mailboxMode === "sent" ? "active" : ""}" data-mailbox="sent">我发出的 ${server.published ? 1 : 0}</button></div>
    ${ui.mailboxMode === "received" ? `<div class="letter-list">${seeds.map(seed => `<button class="letter-row" data-seed="${seed.id}"><span class="letter-avatar"><img src="assets/pet-actions/${seed.petAsset}" alt="${seed.peer}的小花匠"></span><span class="letter-summary"><b>${seed.peer}</b><strong>${seed.title}</strong><small>${seed.preview}</small></span><time>${seed.time.split(" ")[0]}</time><i>›</i></button>`).join("")}</div>` : `<section class="card sent-seed">${plant(server.stage, "md", "green")}<span class="mini-label">${server.published ? "匹配进行中" : "还没有发出的种子"}</span><h2>${server.published ? escapeHtml(actionTitle()) : "种下一件想做的事"}</h2><p>${server.published ? "小绿正在寻找时间合适的同行者。" : "一句话就可以开始。"}</p><button class="primary" data-action="${server.published ? "view-candidates" : "publish"}">${server.published ? "查看候选" : "去种一颗"}</button></section>`}
  </main>`;
}

function SeedDetailPage(id) {
  const seed = seeds.find(item => item.id === id) || seeds[0];
  return `<main class="screen detail-page letter-detail-page">
    ${topbar(seed.title, "小绿带回的一封信", true)}
    <section class="paper-letter"><header><span class="letter-avatar large"><img src="assets/pet-actions/${seed.petAsset}" alt="${seed.peer}的小花匠"></span><div><small>来自花园外</small><strong>${seed.peer} · 校园已认证</strong></div><span class="paper-stamp">小绿<br>已送达</span></header><div class="letter-copy">${escapeHtml(seed.letter).replace(/\n/g, "<br>")}</div><footer>${seed.peer}<br><time>${seed.time}</time></footer></section>
    <div class="letter-facts"><span>${icon("clock")} ${seed.time}</span><span>${icon("pin")} ${seed.place}</span>${seed.tags.map(tag => `<span>${tag}</span>`).join("")}</div>
    <section class="match-box"><div>${pet(true)}</div><p><strong>为什么带给你</strong>${seed.reason}</p></section>
    <div class="sticky-actions"><button class="secondary" data-action="decline-seed">这次不合适</button>${ui.joinedSeeds.includes(seed.id) ? `<div class="joined-state">✓ 已表达参与意向 · 等待${escapeHtml(seed.peer)}确认</div>` : `<button class="primary" data-action="join-seed">愿意加入</button>`}</div>
  </main>`;
}

function PublishPage() {
  const idea = escapeHtml(ui.draft.idea || "轻松爬山");
  const companion = escapeHtml(ui.draft.companion || "还未确认");
  const habit = escapeHtml(ui.draft.habit || "还未确认");
  const activityDetail = escapeHtml(ui.draft.activityDetail || "还未确认");
  const progress = ["做什么", "时间", "地点", "同行者", "相处习惯", "活动确认", "确认发布"];
  const calendar = upcomingDates();
  const steps = [
    `<div class="agent-bubble"><strong>最近想和别人一起做什么？</strong><br><span class="muted tiny">选一个最接近的，也可以自己填写</span></div><div class="choice-grid uniform-choice-grid"><button data-publish-choice="idea:轻松爬山">🥾 轻松爬山</button><button data-publish-choice="idea:一起自习">📚 一起自习</button><button data-publish-choice="idea:扫街摄影">📷 扫街摄影</button><button data-publish-choice="idea:看展或演出">🎵 看展／演出</button></div><form id="publish-form" class="custom-companion uniform-entry"><label for="publish-input">自定义想做的事</label><div class="inline-entry"><input id="publish-input" maxlength="40" placeholder="例如：一起练习羽毛球"><button>确定</button></div></form>`,
    `<div class="agent-bubble"><strong>你希望什么时候进行？</strong><br><span class="muted tiny">在日历上选一天；时段可以多选</span></div><section class="time-picker-card flow-card"><label>选择日期</label><div class="calendar-picker"><div class="calendar-head"><button data-action="calendar-prev" aria-label="上个月" ${ui.calendarMonthOffset === 0 ? "disabled" : ""}>‹</button><strong>${calendar.label}</strong><button data-action="calendar-next" aria-label="下个月">›</button></div><div class="calendar-weekdays" aria-hidden="true">${["一", "二", "三", "四", "五", "六", "日"].map(day => `<span>${day}</span>`).join("")}</div><div class="calendar-days" role="grid" aria-label="选择日期">${calendar.dates.map(date => date ? `<button class="${ui.selectedDate === date.value ? "selected" : ""} ${date.isToday ? "today" : ""}" data-date="${date.value}" aria-label="${date.value}" aria-pressed="${ui.selectedDate === date.value ? "true" : "false"}" ${date.disabled ? "disabled" : ""}>${date.day}</button>` : `<span></span>`).join("")}</div></div><label>选择时段 <small>可多选</small></label><div class="period-strip">${["上午", "下午", "晚上"].map(period => `<button class="${ui.selectedPeriods.includes(period) ? "selected" : ""}" data-period="${period}">${period}</button>`).join("")}</div><button class="primary full flow-next" data-action="confirm-time" ${ui.selectedDate && ui.selectedPeriods.length ? "" : "disabled"}>确认时间</button></section>`,
    `<div class="agent-bubble"><strong>活动范围放在哪里比较合适？</strong><br><span class="muted tiny">选择常用范围，或输入具体地址</span></div><div class="choice-grid uniform-choice-grid"><button data-publish-choice="place:校内">校内</button><button data-publish-choice="place:学校附近">学校附近</button><button data-publish-choice="place:市内都可以">市内都可以</button><button data-action="use-location">⌖ 使用我的定位</button></div><form id="place-form" class="custom-companion uniform-entry"><label for="place-input">自定义地点 / 地址</label><div class="inline-entry"><input id="place-input" maxlength="60" placeholder="例如：图书馆东门"><button>确定</button></div></form>`,
    `<div class="agent-bubble"><strong>你希望同行的人是什么样的？</strong><br><span class="muted tiny">选最看重的一点，也可以自己补充</span></div><div class="preference-list"><button data-companion="聊得来，气氛轻松"><span>💬</span><div><strong>聊得来，气氛轻松</strong><small>愿意分享，也尊重彼此表达</small></div><b>›</b></button><button data-companion="守时靠谱"><span>⏱</span><div><strong>守时靠谱</strong><small>确定后尽量不临时变动</small></div><b>›</b></button><button data-companion="愿意一起做决定"><span>🤝</span><div><strong>愿意一起做决定</strong><small>安排可以共同商量</small></div><b>›</b></button><button data-companion="没有特别要求"><span>🌱</span><div><strong>没有特别要求</strong><small>合适就好，保持开放</small></div><b>›</b></button></div><form id="companion-form" class="custom-companion"><label for="companion-input">自定义同行者要求</label><div class="inline-entry"><input id="companion-input" maxlength="40" placeholder="例如：希望对方也有拍摄经验"><button>确定</button></div></form>`,
    `<div class="agent-bubble"><strong>相处时，有什么习惯想提前说清楚？</strong><br><span class="muted tiny">这不是硬性条件，只是帮助彼此更自在</span></div><div class="habit-options"><button data-habit="喜欢边做边聊">边做边聊</button><button data-habit="慢热，先做事再熟悉">我比较慢热</button><button data-habit="不抽烟，少饮酒">不抽烟 / 少饮酒</button><button data-habit="没有特别习惯">没有特别习惯</button></div>`,
    ui.activityQuestionLoading
      ? `<section class="activity-confirm-state"><div class="activity-ai-loading"><i></i><strong>小绿正在想，这项活动还需要确认什么…</strong><small>不会重复询问时间、地点或同行者要求</small></div></section>`
      : ui.activityQuestionError
        ? `<section class="activity-confirm-state"><div class="activity-ai-error"><span>🌿</span><strong>专项问题暂时没有生成</strong><small>这一步必须由 Agent 根据活动来判断，不使用固定问题代替。</small><button class="primary" data-action="retry-activity-question">请小绿再想一次</button></div></section>`
        : `<div class="agent-bubble activity-question"><span class="ai-generated-label">AI 活动专项追问</span><strong>${escapeHtml(ui.activityQuestion)}</strong><small>这是根据“${idea}”临时生成的最后一问</small></div><div class="activity-option-list">${ui.activityOptions.map(option => `<button data-activity-detail="${escapeHtml(option)}">${escapeHtml(option)}<span>›</span></button>`).join("")}</div><form id="activity-detail-form" class="custom-companion"><label for="activity-detail-input">我想自己补充</label><div class="inline-entry"><input id="activity-detail-input" maxlength="60" placeholder="用一句话告诉小绿"><button>确定</button></div></form>`,
    `<div class="agent-bubble">我已经把标准信息和这次活动的特殊要求都整理好了。你确认后，我才会发布。</div><section class="card github-seed-preview detailed"><span class="pill">待发布</span><h2>${idea}</h2><div class="draft-summary"><p><span>◷</span><b>时间</b>${escapeHtml(ui.draft.time)}</p><p><span>⌖</span><b>地点</b>${escapeHtml(ui.draft.place)}</p><p><span>☺</span><b>同行者</b>${companion}</p><p><span>♡</span><b>相处习惯</b>${habit}</p><p class="activity-detail-summary"><span>✦</span><b>活动确认</b>${activityDetail}</p></div></section><div class="button-row"><button class="secondary" data-action="publish-prev">上一步</button><button class="primary" data-action="confirm-publish">确认并发布</button></div>`,
  ];
  const clarifyControls = ui.publishStep < 6
    ? `<div class="clarify-actions"><button data-action="publish-prev">${ui.publishStep === 0 ? "退出" : "上一步"}</button><button data-action="publish-skip">暂时跳过</button></div>`
    : "";
  return `<main class="screen github-aligned-page publish-page">${topbar("种下一件想做的事", "和小绿聊聊", true)}<div class="agent-chat"><div class="profile-chip"><div class="agent-orb">${pet(true)}</div><div><strong>小绿 · 你的花匠（个人 Agent）</strong><small>标准信息之后，我会针对活动再确认一项</small></div><span class="step-count">${Math.min(ui.publishStep + 1, 7)}/7</span></div><div class="publish-progress">${progress.map((label, index) => `<div class="${index < ui.publishStep ? "done" : index === ui.publishStep ? "active" : ""}"><i></i><span>${label}</span></div>`).join("")}</div>${steps[Math.min(ui.publishStep, 6)]}${clarifyControls}</div></main>`;
}

function MatchingPage() {
  return `<main class="screen matching-page">${topbar("小绿正在旅行", "寻找真正合适的同行者", true)}<section class="travel-scene">${forestBackdrop()}<div class="travel-pet">${pet()}</div><div class="trail"></div></section><h2>种子正在穿过校园</h2><p>先检查时间是否重合，再看地点与行动偏好。匹配理由只来自双方确认过的事实。</p><div class="matching-steps"><span class="done">✓ 时间位图有交集</span><span class="done">✓ 地点范围兼容</span><span class="active"><i></i> 正在整理候选人</span></div></main>`;
}

function CandidatesPage() {
  const list = candidateList();
  if (!list.length) {
    return `<main class="screen candidates-page">${topbar("匹配候选", "小绿还在整理", true)}<div class="candidate-intro">${pet(true)}<p><strong>候选人还没有生成出来</strong>需求已经发布到后端了；如果 AI 凭证可用，小绿会继续生成模拟用户并完成匹配。</p></div><button class="primary full" data-action="back">返回花园</button></main>`;
  }
  return `<main class="screen candidates-page">${topbar("匹配候选", `小绿找到了 ${list.length} 位可能同行的人`, true)}<div class="candidate-intro">${pet(true)}<p><strong>你来做最后选择</strong>我只整理与这次行动有关的事实。没被选中的人，我会替你礼貌回复。</p></div>${list.map((person, index) => `<article class="candidate-card card ${index === 0 ? "recommended" : ""}">${index === 0 ? `<span class="recommend-label">最合拍</span>` : ""}<span class="avatar avatar-${index}">${escapeHtml(person.avatar)}</span><div class="candidate-main"><div><h3>${escapeHtml(person.name)}</h3><span>${escapeHtml(person.match)}</span></div><p>${escapeHtml(person.note)}</p><ul>${person.facts.map(fact => `<li>${escapeHtml(fact)}</li>`).join("")}</ul><div class="match-reason"><strong>为什么适合</strong>${escapeHtml(person.reason)}</div></div><div class="candidate-actions"><button class="secondary" data-candidate-detail="${index}">查看资料</button><button class="primary" data-candidate="${escapeHtml(person.name)}">选择 ${escapeHtml(person.name)}</button></div></article>`).join("")}</main>`;
}

function CandidateDetailPage(index) {
  const person = candidateAt(index);
  return `<main class="screen candidate-detail-page">${topbar("同行者资料", `来自 ${escapeHtml(person.name)} 的公开信息`, true)}<section class="candidate-profile-card card"><span class="avatar">${escapeHtml(person.avatar)}</span><div><h2>${escapeHtml(person.name)}</h2><p>校园已认证 · 资料仅用于本次匹配</p><span>${escapeHtml(person.match)}</span></div></section><section class="a2a-proof-lite"><div class="a2a-proof-head"><div class="agent-pair"><span>🐦</span><span>🦊</span></div><div><small>A2A 过往经历总结</small><h3>为什么选择${escapeHtml(person.name)}</h3></div></div><p class="proof-intro">小绿与${escapeHtml(person.name)}的 Agent 核对了与这次行动有关的过往经历，只保留能支持你判断的部分。</p><div class="proof-facts">${person.facts.map(fact => `<span><i>✓</i>${escapeHtml(fact)}</span>`).join("")}</div><blockquote>${escapeHtml(person.reason)}</blockquote></section><button class="primary full profile-space-button" data-person-space="${index}">进入${escapeHtml(person.name)}的个人空间</button><button class="secondary full a2a-record-button" data-a2a-record="${index}">查看双方 Agent 沟通记录</button><div class="candidate-detail-actions"><button class="ghost" data-action="back">继续比较</button><button class="primary" data-candidate="${escapeHtml(person.name)}">选择 ${escapeHtml(person.name)}</button></div></main>`;
}

function CandidateSpacePage(index) {
  const person = candidateAt(index);
  const experiences = [
    ["🌿", "周末兴趣同行", "提前确认安排，按约到场", "和 1 位搭子共同完成"],
    ["📚", "校园共同计划", "会照顾彼此节奏，沟通自然", "和 2 位搭子共同完成"],
    ["✨", "轻松体验活动", "结束后双方都愿意再次同行", "最近一次搭子经历"],
  ];
  return `<main class="screen candidate-space-page">${topbar(`${escapeHtml(person.name)}的个人空间`, "经本人授权展示", true)}<section class="space-hero card"><span class="avatar">${escapeHtml(person.avatar)}</span><h2>${escapeHtml(person.name)}</h2><p>用真实发生过的同行，代替抽象标签</p><div><span><b>6</b>共同经历</span><span><b>4</b>再次同行</span><span><b>100%</b>按约反馈</span></div></section><div class="space-section-title"><h3>过往搭子经历</h3><span>只展示双方同意公开的内容</span></div><div class="experience-list">${experiences.map(([emoji, title, note, meta]) => `<article class="experience-card card"><span>${emoji}</span><div><small>${meta}</small><h3>${title}</h3><p>${note}</p></div></article>`).join("")}</div></main>`;
}

function CandidateA2APage(index) {
  const person = candidateAt(index);
  return `<main class="screen candidate-a2a-page">${topbar("A2A 沟通记录", `小绿 × ${escapeHtml(person.name)}的 Agent`, true)}<div class="a2a-disclosure"><span>🔒</span><p><strong>仅展示本次匹配相关内容</strong><br>不交换联系方式，也不使用未授权的个人信息。</p></div><div class="a2a-record-log"><div class="a2a-chat-row mine"><span>🐦</span><div><b>小绿 · 小周的 Agent</b><p>小周想找同行者一起“${escapeHtml(server.draft?.idea || ui.draft.idea || actionTitle())}”，时间是${escapeHtml(server.draft?.time || ui.draft.time || "你发布时选择的时间")}，地点在${escapeHtml(server.draft?.place || ui.draft.place || "你发布时选择的地点")}。</p></div></div><div class="a2a-chat-row peer"><div><b>${escapeHtml(person.name)}的 Agent</b><p>${escapeHtml(person.name)}对这项活动有兴趣。我可以核对与这次同行有关的过往经验。</p></div><span>🦊</span></div>${person.facts.map((fact, factIndex) => `<div class="a2a-chat-row ${factIndex % 2 ? "mine" : "peer"}">${factIndex % 2 ? `<span>🐦</span>` : ""}<div><b>${factIndex % 2 ? "小绿" : `${escapeHtml(person.name)}的 Agent`}</b><p>${escapeHtml(fact)}</p></div>${factIndex % 2 ? "" : `<span>🦊</span>`}</div>`).join("")}<div class="a2a-chat-row mine"><span>🐦</span><div><b>小绿 · 匹配结论</b><p>${escapeHtml(person.reason)} 最终是否选择，仍由小周本人决定。</p></div></div></div></main>`;
}

function ActionsPage() {
  const meta = stageMeta[server.stage] || stageMeta.SEED;
  const body = server.selectedCandidate
    ? `<div class="conversation-list"><article class="action-list-item" data-route="chat"><div class="chat-avatar"><img src="assets/flower-7.png" alt=""></div><div class="chat-summary"><div><h3>${escapeHtml(actionTitle())}</h3><time>刚刚</time></div><p>${server.messages.length ? `${server.messages[server.messages.length - 1].author === "me" ? "我" : partnerName()}：${escapeHtml(server.messages[server.messages.length - 1].text)}` : `${partnerName()}：期待和你一起～`}</p><span>${meta[0]} · 4 位群聊成员</span></div><div class="unread">1</div></article></div>`
    : `<section class="card sent-seed">${plant("SEED", "md", "green")}<span class="mini-label">还没有进行中的行动</span><h2>先种下一件想做的事</h2><p>成局之后，你和同行者的群聊会出现在这里。</p><button class="primary" data-action="publish">种一颗种子</button></section>`;
  return `<main class="screen github-aligned-page">${topbar("聊天列表", "同行与协作", true)}<div class="tabs chat-tabs"><button class="active">进行中的聊天</button><button>已结束</button></div>${body}</main>`;
}

function ChatPage() {
  const meta = stageMeta[server.stage] || stageMeta.SEED;
  const messages = server.messages.map(message => `<div class="message ${message.author === "me" ? "me" : "them"}">${escapeHtml(message.text)}</div>`).join("");
  const allConfirmed = server.slots.people && server.slots.time && server.slots.place;
  return `<main class="screen chat-screen github-aligned-page">${topbar(escapeHtml(actionTitle()), "4 位群聊成员", true)}
    <section class="chat-progress"><div class="growth-plant">${plant(server.stage, "sm", "green")}</div><div><strong>行动状态 · ${meta[0]}</strong><small>${meta[1]}</small></div></section>
    <div class="chat-log" id="chat-log">
      <div class="chat-divider"><span>匹配阶段 · 两位 Agent 的对话记录</span></div>
      <div class="agent-message own"><span class="agent-avatar">🐦</span><div><strong>小周的 Agent</strong><p>小周想找一位搭子一起「${escapeHtml(actionTitle())}」，希望时间和路线都合得来。</p><small>来自小周发布种子时确认的信息</small></div></div>
      <div class="agent-message peer"><span class="agent-avatar">🦊</span><div><strong>${partnerName()}的 Agent</strong><p>${partnerName()}时间和你合得上，对这次行动也很有兴趣，愿意一起完成。</p><small>来自${partnerName()}向自己 Agent 确认的信息</small></div></div>
      <div class="chat-divider active"><span>双方已确认组队 · 四方行动群聊开始</span></div>
      ${server.messages.length ? "" : `<div class="message them">嗨！很期待和你一起，咱们把时间地点定一下吧～</div>`}${messages}
      ${!ui.proposalsOpen && !allConfirmed ? `<button class="secondary full chat-help" data-action="help-progress">请小绿整理时间与地点</button>` : ""}
      ${ui.proposalsOpen ? `<section class="proposal card"><div class="proposal-head">${pet(true)}<div><span class="mini-label">AI 提案 · 需要人确认</span><h3>我只整理了你们刚才说过的</h3></div></div><div class="proposal-item ${server.slots.time ? "confirmed" : ""}"><span>${icon("clock")}</span><div><small>时间</small><strong>${escapeHtml(server.draft?.time || "你发布时选择的时间")}</strong></div><button data-slot="time">${server.slots.time ? "已确认 ✓" : "确认时间"}</button></div><div class="proposal-item ${server.slots.place ? "confirmed" : ""}"><span>${icon("pin")}</span><div><small>集合地点</small><strong>${escapeHtml(server.draft?.place || "你发布时选择的地点")}</strong></div><button data-slot="place">${server.slots.place ? "已确认 ✓" : "确认地点"}</button></div><p class="proposal-note">小绿只生成提案；你的点击才会写入行动约定。</p></section>` : ""}
      ${allConfirmed ? `<section class="agreement card"><span class="mini-label">行动确认卡 · 双方已接受</span><h2>${escapeHtml(actionTitle())}</h2><p>${icon("clock")} ${escapeHtml(server.draft?.time || "时间待定")}</p><p>${icon("pin")} ${escapeHtml(server.draft?.place || "地点待定")}</p><p>${icon("people")} 小周、${partnerName()} · 轻松路线</p><button class="primary full" data-action="open-completion">行动后回来打卡</button></section>` : ""}
    </div>
    <form class="chat-compose" id="chat-form"><input id="chat-input" maxlength="240" autocomplete="off" placeholder="在四方群聊中发消息…"><button aria-label="发送">发送</button></form>
  </main>`;
}

function CompletePage() {
  return `<main class="screen complete-page">${topbar(server.checkedIn ? "行动开花了" : "完成行动", "把真实发生的事留住", true)}<section class="completion-scene ${server.checkedIn ? "is-bloom" : ""}">${forestBackdrop()}${plant(server.checkedIn ? "BLOOM" : "BUD", "xl", "gold")}<div class="sparkles"><i></i><i></i><i></i><i></i></div></section>${server.checkedIn ? `<span class="complete-kicker">你们把一颗种子，变成了共同经历</span><h2>${escapeHtml(actionTitle())}</h2><div class="both-confirm"><span class="tick">✓</span>${partnerName()} 也确认了完成，并表示愿意以后再和你一起</div><p class="center-copy">共同回忆只有在你们<b>都愿意再组队</b>时才会生成。你愿意吗？</p><textarea id="memory-text" class="memory-input" placeholder="留下一句话，记住今天…">${escapeHtml(ui.memoryText)}</textarea><button class="primary full" data-action="archive-memory">愿意，收进我们的森林</button><button class="secondary full" data-action="decline-reteam">这次就好，暂不组队</button>` : `<h2>这次行动真的发生了吗？</h2><p class="center-copy">打卡只记录行动事实，不公开评分，也不会惩罚提前说明的改期。</p><button class="primary full" data-action="check-in">我们完成了</button><button class="secondary full" data-action="back">先不打卡</button>`}</main>`;
}

function MemoryPage() {
  const memories = [
    { id: server.archived ? "current" : "ride", image: server.archived ? "flower-7.png" : "flower-3.png", label: "最近开花", title: server.archived ? actionTitle() : "东湖的夏日晚风", copy: ui.memoryText || "湖边的光比想象中更好看。", peer: server.archived ? partnerName() : "阿澄" },
    { id: "photo", image: "flower-2.png", label: "被采种 3 次", title: "樱花季扫街", copy: "一边走，一边交换镜头里的春天。", peer: "小满" },
    { id: "study", image: "flower-5.png", label: "一起完成", title: "周末旧书店寻宝", copy: "找到了彼此小时候都读过的那一本。", peer: "鹿鸣" },
    { id: "music", image: "flower-8.png", label: "上周开花", title: "夏夜草地音乐会", copy: "散场很晚，但我们都舍不得先走。", peer: "小雨" },
  ];
  return `<main class="screen memories-screen github-aligned-page">${topbar("全部回忆", "我的花园", ui.route === "memory")}<p class="memory-intro">每一次真实同行，都会在这里长成一段可以重访的记忆。</p><div class="memory-waterfall">${memories.map((memory, index) => `<button class="memory-tile ${index % 2 === 0 ? "tall" : ""}" data-memory="${memory.id}"><div class="memory-tile-art"><img src="assets/${memory.image}" alt=""></div><div class="memory-tile-body"><p>和${memory.peer} · 共同完成</p><h3>${escapeHtml(memory.title)}</h3><blockquote>${escapeHtml(memory.copy)}</blockquote><span class="memory-open">打开这段回忆 <i>›</i></span></div></button>`).join("")}</div></main>`;
}

function PlantDetailPage(id) {
  const item = gardenPlants[id] || gardenPlants.ride;
  if (item.status === "active") return `<main class="screen plant-detail-page">${topbar(escapeHtml(actionTitle()), "正在生长", true)}<section class="plant-detail-hero active">${sceneImage("assets/garden-scene.png", "花园里的行动植物")}<img src="assets/${server.stage === "BLOOM" ? "flower-6.png" : "tree.png"}" alt="${escapeHtml(actionTitle())}"></section><span class="plant-state">${stageMeta[server.stage]?.[0] || "生长中"}</span><h2>${escapeHtml(actionTitle())}</h2><p>${item.copy}</p><section class="plant-timeline"><span class="done">种下愿望</span><span class="done">找到同行者</span><span>确认行动细节</span><span>完成并开花</span></section><button class="primary full" data-action="open-plant-chat">回到行动对话</button></main>`;
  return MemoryDetailPage(id, item);
}

function MemoryDetailPage(id, source) {
  const fallback = { title: "夏夜草地音乐会", asset: "flower-8.png", peer: "小雨", date: "上周", copy: "散场很晚，但我们都舍不得先走。" };
  const item = source || gardenPlants[id] || fallback;
  const title = id === "current" && server.archived ? actionTitle() : item.title;
  const peer = id === "current" && server.archived ? partnerName() : item.peer;
  const copy = id === "current" && ui.memoryText ? ui.memoryText : item.copy;
  return `<main class="screen memory-detail-page">${topbar(escapeHtml(title), "这株花保存的共同回忆", true)}<section class="memory-cover"><img src="assets/garden-scene.png" alt="${escapeHtml(title)}的花园回忆"><img class="memory-flower" src="assets/${item.asset || "flower-7.png"}" alt="${escapeHtml(title)}开出的花"></section><section class="memory-letter"><small>${item.date || "最近"} · 和${peer}</small><h2>${escapeHtml(title)}</h2><p>${escapeHtml(copy)}</p><div class="memory-photo-grid"><figure><img src="assets/garden-background.png" alt="行动途中的花园留影"><figcaption>路上遇见的风景</figcaption></figure><figure><img src="assets/home-interior.png" alt="行动后的手账留影"><figcaption>小绿收好的手账</figcaption></figure></div></section><section class="history-chat"><h3>当时的对话</h3><div class="message them">今天真的很开心，下次还走这条路吗？</div><div class="message me">好呀，下次换个季节再来。</div></section><div class="memory-detail-actions"><button class="secondary full" data-action="open-all-memories">查看全部回忆</button><button class="primary full" data-action="again">从这里再种一颗种子</button></div></main>`;
}

function ProfilePage() {
  return `<main class="screen profile-page">${topbar("我的", "小周 · 个人主页", true)}<section class="profile-hero card"><span class="avatar profile-avatar">周</span>${pet()}<div><h2>小周与小绿</h2><p>校园已认证 · 一起做成过 4 件事</p></div><div class="profile-stats"><span><b>4</b>共同经历</span><span><b>3</b>再次同行</span><span><b>72%</b>偏好已记录</span></div></section><section class="settings card"><button>兴趣与行动偏好 <span>›</span></button><button>小绿可对外使用的信息 <span>›</span></button><button>空闲时间 <span>已更新</span></button><button>隐私与安全 <span>›</span></button></section><button class="reset-button" data-action="reset-demo">重置演示进度</button></main>`;
}

function page() {
  if (ui.route === "world-home") return HomeWorldPage();
  if (ui.route?.startsWith("seed:")) return SeedDetailPage(ui.route.split(":")[1]);
  if (ui.route?.startsWith("plant:")) return PlantDetailPage(ui.route.split(":")[1]);
  if (ui.route?.startsWith("memory:")) return MemoryDetailPage(ui.route.split(":")[1]);
  if (ui.route?.startsWith("candidate-space:")) return CandidateSpacePage(ui.route.split(":")[1]);
  if (ui.route?.startsWith("candidate-a2a:")) return CandidateA2APage(ui.route.split(":")[1]);
  if (ui.route?.startsWith("candidate:")) return CandidateDetailPage(ui.route.split(":")[1]);
  return ({ publish: PublishPage, matching: MatchingPage, candidates: CandidatesPage, chat: ChatPage, complete: CompletePage, memory: MemoryPage }[ui.route]
    || { garden: WorldGardenPage, mailbox: MailboxPage, actions: ActionsPage, profile: ProfilePage }[ui.tab]
    || WorldGardenPage)();
}

function render() {
  // 重建 DOM 前，先把用户正在输入的内容存回 state，避免 toast 定时器/其它 render 把未提交文字清空
  const memoryInput = document.querySelector("#memory-text");
  if (memoryInput) ui.memoryText = memoryInput.value;
  document.querySelector("#app").innerHTML = `<div class="app-shell"><div class="phone">${page()}${ui.loading ? `<div class="loading"><i></i><span>小绿正在跑腿…</span></div>` : ""}${ui.toast ? `<div class="toast">${escapeHtml(ui.toast)}</div>` : ""}</div><aside class="demo-guide"><span>社交森林 · 世界原型</span><h2>花园不是首页，<br>花园就是世界。</h2><p>场景内导航</p><ol><li>点击房子进入可装扮的 Home</li><li>点击信箱读取行动种子</li><li>点击花圃种下愿望或查看成长</li><li>点击宠物进行生活化互动</li><li>行动完成后，植物进入回忆林</li></ol><small>花园、Home 与植物组件已接入正式绘本资产；交互热点独立于底图，便于继续替换动画层。</small></aside></div>`;
  requestAnimationFrame(() => {
    syncPhoneScale();
    const log = document.querySelector("#chat-log");
    if (log) log.scrollTop = log.scrollHeight;
  });
  requestAnimationFrame(() => window.WorldLayer?.mount());
}

function syncPhoneScale() {
  const scale = Math.min(1, (window.innerWidth - 20) / 390, (window.innerHeight - 20) / 780);
  document.documentElement.style.setProperty("--phone-scale", String(Math.max(.62, scale)));
}

function goBack() {
  if (ui.route === "publish" && ui.publishStep > 0) {
    if (ui.publishStep === 5) {
      ui.activityQuestionRequestId += 1;
      ui.activityQuestionLoading = false;
    }
    ui.publishStep -= 1;
  }
  else if (ui.route === "world-home") { ui.route = null; ui.tab = "garden"; }
  else if (ui.route?.startsWith("seed:")) { ui.route = null; ui.tab = "mailbox"; }
  else if (ui.route?.startsWith("plant:")) { ui.route = null; ui.tab = "garden"; }
  else if (ui.route?.startsWith("memory:")) { ui.route = "memory"; }
  else if (ui.route?.startsWith("candidate-space:") || ui.route?.startsWith("candidate-a2a:")) ui.route = `candidate:${ui.route.split(":")[1]}`;
  else if (ui.route?.startsWith("candidate:")) ui.route = "candidates";
  else if (ui.route === "chat" || ui.route === "memory") { const previous = ui.route; ui.route = null; ui.tab = previous === "chat" ? "actions" : "garden"; }
  else if (ui.route === "candidates" || ui.route === "matching") ui.route = "publish";
  else if (ui.route === "complete") ui.route = "chat";
  else { ui.route = null; ui.tab = "garden"; }
  render();
}

document.addEventListener("click", async event => {
  if (event.target.closest(".world-mailbox-panel") && !event.target.closest("button, [data-seed], [data-action]")) return;
  const target = event.target.closest("button, [data-route], [data-seed], [data-plant], [data-memory], [data-action]");
  if (!target) return;
  if (target.dataset.tab) { ui.tab = target.dataset.tab; ui.route = null; return render(); }
  if (target.dataset.route) { ui.route = target.dataset.route; return render(); }
  if (target.dataset.seed) { ui.mailboxOverlay = false; markMailboxRead(); ui.route = `seed:${target.dataset.seed}`; return render(); }
  if (target.dataset.plant) { ui.route = `plant:${target.dataset.plant}`; return render(); }
  if (target.dataset.memory) { ui.route = `memory:${target.dataset.memory}`; return render(); }
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
  if (target.dataset.period) {
    const period = target.dataset.period;
    ui.selectedPeriods = ui.selectedPeriods.includes(period)
      ? ui.selectedPeriods.filter(item => item !== period)
      : [...ui.selectedPeriods, period];
    return render();
  }
  if (target.dataset.date) {
    ui.selectedDate = target.dataset.date;
    return render();
  }
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
    const value = slot === "time" ? (server.draft?.time || "时间待定") : (server.draft?.place || "地点待定");
    if (!await api("/api/proposals/confirm", { slot, value })) return;
    const done = server.slots.people && server.slots.time && server.slots.place;
    notify(done ? "时间、地点都确认了，花苞出现了" : `${slot === "time" ? "时间" : "地点"}已确认，植物又长高了一点`);
    return;
  }

  const action = target.dataset.action;
  if (action === "back") return goBack();
  if (action === "world-help") return notify("点房子进我的家，点信箱看来信，点中间的加号种下一件想做的事");
  if (action === "open-home") { ui.route = "world-home"; return render(); }
  if (action === "open-mailbox-overlay") { markMailboxRead(); ui.openingObject = "mailbox"; ui.mailboxOverlay = true; ui.welcomeLetter = false; render(); setTimeout(() => { ui.openingObject = ""; render(); }, 560); return; }
  if (action === "close-mailbox-overlay") { ui.mailboxOverlay = false; return render(); }
  if (action === "close-welcome-letter") { ui.mailboxOverlay = false; ui.welcomeLetter = false; return render(); }
  if (action === "show-mailbox-preview") { markMailboxRead(); ui.welcomeLetter = false; return render(); }
  if (action === "expand-mailbox") { markMailboxRead(); ui.mailboxOverlay = false; ui.route = null; ui.tab = "mailbox"; return render(); }
  if (action === "pet-talk" && document.querySelector(".garden-world-screen")) { window.WorldLayer?.interactPet(); return; }
  if (action === "pet-talk") { ui.petMood = ui.petMood === "happy" ? "idle" : "happy"; return render(); }
  if (action === "pet-sleep") { ui.petMood = "sleep"; notify("小绿睡着了，等会儿还会自己醒来"); return render(); }
  if (action === "decorate") { ui.decorated = !ui.decorated; notify(ui.decorated ? "摆上了新地毯和花灯" : "已收起本次装扮"); return render(); }
  if (action === "notify") return notify(ui.unreadMail ? `${ui.unreadMail} 个新机会已经放进信箱` : "信箱暂时没有新消息");
  if (action === "publish") return startPublishFlow();
  if (action === "open-plant-chat") { ui.route = "chat"; return render(); }
  if (action === "open-all-memories") { ui.route = "memory"; return render(); }
  if (action === "view-candidates") { ui.route = "candidates"; return render(); }
  if (action === "calendar-prev") { ui.calendarMonthOffset = Math.max(0, ui.calendarMonthOffset - 1); return render(); }
  if (action === "calendar-next") { ui.calendarMonthOffset += 1; return render(); }
  if (action === "confirm-time") {
    if (!ui.selectedDate || !ui.selectedPeriods.length) return notify("请先选好日期和至少一个时段");
    ui.draft.time = `${ui.selectedDate} ${ui.selectedPeriods.join(" / ")}`;
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
  if (action === "publish-prev") {
    if (ui.publishStep === 0) {
      ui.route = null;
      ui.tab = "garden";
      return render();
    }
    if (ui.publishStep === 5) {
      ui.activityQuestionRequestId += 1;
      ui.activityQuestionLoading = false;
    }
    ui.publishStep -= 1;
    return render();
  }
  if (action === "publish-skip") {
    if (ui.publishStep === 0) {
      ui.draft.idea = "还没想好，想听听建议";
      ui.publishStep = 1;
    } else if (ui.publishStep === 1) {
      ui.draft.time = "时间可商量";
      ui.publishStep = 2;
    } else if (ui.publishStep === 2) {
      ui.draft.place = "地点可商量";
      ui.publishStep = 3;
    } else if (ui.publishStep === 3) {
      ui.draft.companion = "没有特别要求";
      ui.publishStep = 4;
    } else if (ui.publishStep === 4) {
      ui.draft.habit = "没有特别习惯";
      return prepareActivityQuestion();
    } else if (ui.publishStep === 5) {
      ui.activityQuestionRequestId += 1;
      ui.activityQuestionLoading = false;
      ui.draft.activityDetail = "暂无补充，后续共同确认";
      ui.publishStep = 6;
    }
    return render();
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
  if (action === "join-seed") { const seedId = ui.route?.split(":")[1]; const joinedSeed = seeds.find(s => s.id === seedId); if (seedId && !ui.joinedSeeds.includes(seedId)) ui.joinedSeeds.push(seedId); notify(`已把参与意向送给${joinedSeed?.peer || "对方"}，等ta确认后就能一起了。最终决定仍由对方完成`); return render(); }
  if (action === "help-progress") { ui.proposalsOpen = true; return render(); }
  if (action === "show-stage") return notify(`${stageMeta[server.stage][0]}：${stageMeta[server.stage][1]}`);
  if (action === "open-completion") { ui.route = "complete"; return render(); }
  if (action === "check-in") { if (await api("/api/gatherings/check-in", {})) notify("打卡成功，植物开花了！"); return; }
  if (action === "archive-memory") {
    ui.memoryText = document.querySelector("#memory-text")?.value.trim() || "湖边的光比想象中更好看。";
    if (!await api("/api/gatherings/archive", { text: ui.memoryText })) return;
    ui.route = "memory";
    notify("双方都愿意再组队，共同回忆已进入你们的森林");
    return render();
  }
  // 红线#4：任一方不愿再组队 → 不生成共同回忆，也不告知对方是谁、原因（植物停在开花，不入林）
  if (action === "decline-reteam") {
    ui.route = null;
    ui.tab = "garden";
    notify("尊重你的选择。这段回忆不会生成，我们也不会把原因告诉对方。");
    return render();
  }
  if (action === "again") { ui.route = "publish"; ui.publishStep = 1; ui.draft.idea = "再约一次磨山轻徒步"; return render(); }
  if (action === "reset-demo") { await api("/api/demo/reset", {}); try { localStorage.removeItem(MAIL_READ_KEY); } catch {} ui = initialUi(); notify("演示进度已重置"); return render(); }
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
window.addEventListener("resize", syncPhoneScale);
api("/api/demo").then(render);
