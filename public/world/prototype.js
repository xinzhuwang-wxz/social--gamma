const initialUi = () => ({
  tab: "garden",
  route: null,
  toast: "",
  loading: false,
  publishStep: 0,
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
  decorated: false,
  petMood: "idle",
});

let ui = initialUi();
let server = { stage: "SEED", published: false, selectedCandidate: null, messages: [], slots: { people: false, time: false, place: false }, checkedIn: false, archived: false };
let toastTimer;

const seeds = [
  { id: "hike", title: "周六一起去爬山", type: "户外", time: "周六 08:30", place: "学校周边", peer: "小蓝", color: "sage", asset: "flower-1.png", tags: ["新手友好", "当天往返"], reason: "你们周六上午都有空，都接受新手路线，也都希望当天往返。" },
  { id: "show", title: "一起去看话剧", type: "文艺", time: "周日 19:00", place: "市中心大剧院", peer: "小雨", color: "pink", asset: "flower-2.png", tags: ["已有票", "周日晚"], reason: "你们收藏了同一部剧，也都偏好周日晚上出发。" },
  { id: "ride", title: "周末骑行环湖", type: "运动", time: "周日 09:00", place: "西湖环线", peer: "阿杰", color: "gold", asset: "flower-3.png", tags: ["轻松骑行", "20 km"], reason: "你们都接受 20 公里轻量路线，空闲时段有 3 小时重合。" },
];

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

async function api(path, body) {
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
  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const day = `${date.getMonth() + 1}月${date.getDate()}日`;
    return { value: `${day} ${weekdays[date.getDay()]}`, day, weekday: offset === 0 ? "今天" : weekdays[date.getDay()] };
  });
}

function startPublishFlow() {
  const fresh = initialUi();
  ui.activityQuestionRequestId += 1;
  ui.route = "publish";
  ui.publishStep = 0;
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
  return `<div class="pet ${small ? "pet-small" : ""}" role="img" aria-label="信使小绿"><img src="assets/pet-agent.png" alt=""></div>`;
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
    : `<button class="nav-item ${ui.tab === id && !ui.route ? "active" : ""}" data-tab="${id}">${icon(id)}<small>${label}</small>${id === "mailbox" ? "<b>3</b>" : ""}</button>`).join("")}</nav>`;
}

function WorldGardenPage() {
  const meta = stageMeta[server.stage] || stageMeta.SEED;
  return `<main class="world-screen garden-world-screen">
    <div class="world-scene">
      ${sceneImage("assets/garden-background.png", "绘本风社交花园：小屋、信箱、长椅、草地与小溪")}
      <div class="garden-growth-layer" aria-label="花园中的行动植物">
        ${server.selectedCandidate ? `<button class="real-plant-slot slot-one" data-world="plot"><img src="assets/${server.stage === "FOREST" ? "flower-7.png" : server.stage === "BLOOM" ? "flower-6.png" : "tree.png"}" alt="${escapeHtml(actionTitle())}的植物"><span>${meta[0]}</span></button>` : `<button class="empty-real-plot" data-world="plot"><span>＋</span><b>种一颗行动种子</b></button>`}
        <button class="real-plant-slot slot-two" data-world="forest"><img src="assets/flower-1.png" alt="东湖骑行的植物"><span>东湖骑行</span></button>
        <button class="real-plant-slot slot-three" data-world="forest"><img src="assets/flower-4.png" alt="樱花摄影的植物"><span>樱花摄影</span></button>
        <button class="real-plant-slot slot-four" data-world="forest"><img src="assets/flower-3.png" alt="周末自习的植物"><span>周末自习</span></button>
      </div>
      <button class="world-hotspot hotspot-house" data-world="home"><span class="hotspot-ring"></span><b>我的家</b><small>回家看看小绿</small></button>
      <button class="world-hotspot hotspot-mailbox" data-world="mailbox"><span class="hotspot-ring"></span><b>种子信箱</b><small>3 封新信</small><i>3</i></button>
      <button class="world-hotspot hotspot-forest" data-world="forest"><span class="hotspot-ring"></span><b>回忆林</b><small>8 段共同经历</small></button>
      <button class="world-hotspot hotspot-bridge" data-world="actions"><span class="hotspot-ring"></span><b>行动溪</b><small>${server.selectedCandidate ? `去找${partnerName()}` : "暂无同行"}</small></button>
      <button class="world-pet ${ui.petMood === "happy" ? "is-happy" : ""}" data-action="pet-talk" aria-label="和小绿说话">${pet()}<span>${ui.petMood === "happy" ? "嘿嘿，今天的花园很热闹！" : "点点我"}</span></button>
    </div>
    <div class="world-dock"><button data-world="garden"><img src="assets/nav-garden-v2.png" alt=""><small>花园</small></button><button data-world="actions"><img src="assets/nav-chat-v2.png" alt=""><small>聊天</small></button><button class="dock-seed" data-action="publish" aria-label="发布需求"><span class="dock-plus" aria-hidden="true"></span></button><button data-world="mailbox"><img src="assets/nav-mailbox-v2.png" alt=""><small>信箱</small></button><button data-world="home"><img src="assets/nav-profile-v2.png" alt=""><small>我的</small></button></div>
  </main>`;
}

function HomeWorldPage() {
  return `<main class="world-screen home-world-screen">
    <section class="game-hud indoor"><button class="hud-back" data-world="garden">‹ 花园</button><div><small>我的家</small><strong>小绿的生活空间</strong></div><button data-action="decorate">✦</button></section>
    <div class="world-scene room-scene">
      ${sceneImage("assets/home-interior.png", "绘本风小屋室内：床、书架、旅行背包和行动桌")}
      ${ui.decorated ? `<div class="home-decoration"><img src="assets/flower-7.png" alt="新摆放的牡丹装饰"><i></i></div>` : ""}
      <button class="world-hotspot home-bed" data-action="pet-sleep"><span class="hotspot-ring"></span><b>小绿的床</b><small>睡一会儿</small></button>
      <button class="world-hotspot home-table" data-world="actions"><span class="hotspot-ring"></span><b>行动桌</b><small>整理约定</small></button>
      <button class="world-hotspot home-books" data-world="profile"><span class="hotspot-ring"></span><b>记忆书架</b><small>它有多了解你</small></button>
      <button class="world-hotspot home-bag" data-world="mailbox"><span class="hotspot-ring"></span><b>旅行背包</b><small>准备去送信</small></button>
      <button class="world-pet indoor-pet ${ui.petMood === "sleep" ? "is-sleeping" : ""}" data-action="pet-talk" aria-label="和小绿互动"><img class="pet-asset" src="assets/pet-agent.png" alt="小绿行动信使"><span>${ui.petMood === "sleep" ? "Z z z…" : "今天要一起把什么事做成？"}</span></button>
      <div class="decorate-tip ${ui.decorated ? "show" : ""}">新地毯和花灯已经摆好啦！</div>
    </div>
    <div class="room-toolbar"><button data-action="decorate"><span>✦</span><b>${ui.decorated ? "已装扮" : "装扮"}</b></button><button data-action="pet-talk"><span>☻</span><b>互动</b></button><button data-action="publish"><span>＋</span><b>聊愿望</b></button></div>
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
  return `<main class="screen github-aligned-page">
    ${topbar("种子信箱", "与你匹配的找搭子需求", true)}
    <div class="tabs"><button class="${ui.mailboxMode === "received" ? "active" : ""}" data-mailbox="received">收到的种子 3</button><button class="${ui.mailboxMode === "sent" ? "active" : ""}" data-mailbox="sent">我发出的 ${server.published ? 1 : 0}</button></div>
    ${ui.mailboxMode === "received" ? `<div class="seed-list">${seeds.map((seed, index) => `<article class="seed-card" data-seed="${seed.id}"><div class="seed-art"><img src="assets/flower-${index + 4}.png" alt=""></div><div class="seed-main"><div class="seed-title-row"><div><p class="seed-from">${seed.peer} 发来的同行邀请</p><h3>${seed.title}</h3></div><span class="chevron">›</span></div><div class="seed-meta"><span>${seed.time}</span><span>${seed.place}</span></div><div class="seed-tags">${seed.tags.map(tag => `<span>${tag}</span>`).join("")}</div><p class="seed-reason">${seed.reason}</p></div></article>`).join("")}</div>` : `<section class="card sent-seed">${plant(server.stage, "md", "green")}<span class="mini-label">${server.published ? "匹配进行中" : "还没有发出的种子"}</span><h2>${server.published ? escapeHtml(actionTitle()) : "种下一件想做的事"}</h2><p>${server.published ? "小绿正在寻找时间合适的同行者。" : "一句话就可以开始。"}</p><button class="primary" data-action="${server.published ? "view-candidates" : "publish"}">${server.published ? "查看候选" : "去种一颗"}</button></section>`}
  </main>`;
}

function SeedDetailPage(id) {
  const seed = seeds.find(item => item.id === id) || seeds[0];
  return `<main class="screen detail-page">
    ${topbar("种子详情", "小绿带回的明信片", true)}
    <section class="postcard card"><div class="postcard-art ${seed.color}"><img class="postcard-scene" src="assets/garden-scene.png" alt="花园明信片"><img class="postcard-plant" src="assets/${seed.asset}" alt="${seed.title}的植物"></div><span class="stamp">新鲜送达</span><h2>${seed.title}</h2><div class="fact-row"><span>${icon("clock")} ${seed.time}</span><span>${icon("pin")} ${seed.place}</span><span>${icon("people")} 3–4 人</span></div><p class="postcard-note">“想找愿意慢慢走、沿途拍照的搭子，新手也完全没问题。”</p></section>
    <section class="match-box"><div>${pet(true)}</div><p><strong>为什么带给你</strong>${seed.reason}</p></section>
    <section class="person-row"><span class="avatar">${seed.peer.slice(-1)}</span><div><strong>${seed.peer} · 校园已认证</strong><small>完成过 5 次行动 · 户外新手友好</small></div></section>
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
    `<div class="agent-bubble"><strong>你希望什么时候进行？</strong><br><span class="muted tiny">选择一个日期；时段可以多选</span></div><section class="time-picker-card flow-card"><label for="date-select">选择日期</label><div class="date-select-wrap"><select id="date-select"><option value="">请选择日期</option>${dateOptions.map(date => `<option value="${date.value}" ${ui.selectedDate === date.value ? "selected" : ""}>${date.weekday} · ${date.day}</option>`).join("")}</select><span>⌄</span></div><label>选择时段 <small>可多选</small></label><div class="period-strip">${["上午", "下午", "晚上"].map(period => `<button class="${ui.selectedPeriods.includes(period) ? "selected" : ""}" data-period="${period}">${period}</button>`).join("")}</div><button class="primary full flow-next" data-action="confirm-time" ${ui.selectedDate && ui.selectedPeriods.length ? "" : "disabled"}>确认时间</button></section>`,
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
  return `<main class="screen github-aligned-page publish-page">${topbar("种下一件想做的事", "和小绿聊聊", true)}<div class="agent-chat"><div class="profile-chip"><div class="agent-orb">${pet(true)}</div><div><strong>小绿 · 你的个人 Agent</strong><small>标准信息之后，我会针对活动再确认一项</small></div><span class="step-count">${Math.min(ui.publishStep + 1, 7)}/7</span></div><div class="publish-progress">${progress.map((label, index) => `<div class="${index < ui.publishStep ? "done" : index === ui.publishStep ? "active" : ""}"><i></i><span>${label}</span></div>`).join("")}</div>${steps[Math.min(ui.publishStep, 6)]}${clarifyControls}</div></main>`;
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
  return `<main class="screen chat-screen github-aligned-page">${topbar(escapeHtml(actionTitle()), "4 位群聊成员", true)}
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
  const memories = [
    { image: server.archived ? "flower-7.png" : "flower-3.png", label: "最近开花", title: server.archived ? actionTitle() : "东湖的夏日晚风", copy: ui.memoryText || "湖边的光比想象中更好看。", peer: server.archived ? partnerName() : "阿澄" },
    { image: "flower-2.png", label: "被采种 3 次", title: "樱花季扫街", copy: "一边走，一边交换镜头里的春天。", peer: "小满" },
    { image: "flower-5.png", label: "一起完成", title: "周末旧书店寻宝", copy: "找到了彼此小时候都读过的那一本。", peer: "鹿鸣" },
    { image: "flower-8.png", label: "上周开花", title: "夏夜草地音乐会", copy: "散场很晚，但我们都舍不得先走。", peer: "小雨" },
  ];
  return `<main class="screen memories-screen github-aligned-page">${topbar("全部回忆", "我的花园", ui.route === "memory")}<p class="memory-intro">每一次真实同行，都会在这里长成一段可以重访的记忆。</p><div class="memory-waterfall">${memories.map((memory, index) => `<article class="memory-tile ${index % 2 === 0 ? "tall" : ""}"><div class="memory-tile-art"><img src="assets/${memory.image}" alt=""></div><div class="memory-tile-body"><p>和${memory.peer} · 共同完成</p><h3>${memory.title}</h3><blockquote>${memory.copy}</blockquote><button data-action="again">让它结出新种子 <span>›</span></button></div></article>`).join("")}</div></main>`;
}

function ProfilePage() {
  return `<main class="screen profile-page">${topbar("记忆书架", "从家里的书架打开", true)}<section class="profile-hero card"><span class="avatar profile-avatar">周</span>${pet()}<div><h2>小周与小绿</h2><p>校园已认证 · 一起做成过 8 件事</p></div><div class="profile-stats"><span><b>8</b>共同经历</span><span><b>5</b>再次同行</span><span><b>72%</b>小绿了解度</span></div></section><section class="settings card"><button>兴趣与行动偏好 <span>›</span></button><button>小绿可对外使用的信息 <span>›</span></button><button>空闲时间 <span>已更新</span></button><button>隐私与安全 <span>›</span></button></section><button class="reset-button" data-action="reset-demo">重置演示进度</button></main>`;
}

function page() {
  if (ui.route === "world-home") return HomeWorldPage();
  if (ui.route?.startsWith("seed:")) return SeedDetailPage(ui.route.split(":")[1]);
  if (ui.route?.startsWith("candidate-space:")) return CandidateSpacePage(ui.route.split(":")[1]);
  if (ui.route?.startsWith("candidate-a2a:")) return CandidateA2APage(ui.route.split(":")[1]);
  if (ui.route?.startsWith("candidate:")) return CandidateDetailPage(ui.route.split(":")[1]);
  return ({ publish: PublishPage, matching: MatchingPage, candidates: CandidatesPage, chat: ChatPage, complete: CompletePage, memory: MemoryPage }[ui.route]
    || { garden: WorldGardenPage, mailbox: MailboxPage, actions: ActionsPage, profile: ProfilePage }[ui.tab]
    || WorldGardenPage)();
}

function render() {
  document.querySelector("#app").innerHTML = `<div class="app-shell"><div class="phone">${page()}${ui.loading ? `<div class="loading"><i></i><span>小绿正在跑腿…</span></div>` : ""}${ui.toast ? `<div class="toast">${escapeHtml(ui.toast)}</div>` : ""}</div><aside class="demo-guide"><span>社交森林 · 世界原型</span><h2>花园不是首页，<br>花园就是世界。</h2><p>场景内导航</p><ol><li>点击房子进入可装扮的 Home</li><li>点击信箱读取行动种子</li><li>点击花圃种下愿望或查看成长</li><li>点击宠物进行生活化互动</li><li>行动完成后，植物进入回忆林</li></ol><small>花园、Home 与植物组件已接入正式绘本资产；交互热点独立于底图，便于继续替换动画层。</small></aside></div>`;
  requestAnimationFrame(() => {
    syncPhoneScale();
    const log = document.querySelector("#chat-log");
    if (log) log.scrollTop = log.scrollHeight;
  });
}

function syncPhoneScale() {
  const scale = Math.min(1, (window.innerWidth - 20) / 390, (window.innerHeight - 20) / 780);
  document.documentElement.style.setProperty("--phone-scale", String(Math.max(.5, scale)));
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
  else if (ui.route?.startsWith("candidate-space:") || ui.route?.startsWith("candidate-a2a:")) ui.route = `candidate:${ui.route.split(":")[1]}`;
  else if (ui.route?.startsWith("candidate:")) ui.route = "candidates";
  else if (ui.route === "chat" || ui.route === "memory") { const previous = ui.route; ui.route = null; ui.tab = previous === "chat" ? "actions" : "garden"; }
  else if (ui.route === "candidates" || ui.route === "matching") ui.route = "publish";
  else { ui.route = null; ui.tab = "garden"; }
  render();
}

document.addEventListener("click", async event => {
  const target = event.target.closest("button, [data-route], [data-seed]");
  if (!target) return;
  if (target.dataset.tab) { ui.tab = target.dataset.tab; ui.route = null; return render(); }
  if (target.dataset.route) { ui.route = target.dataset.route; return render(); }
  if (target.dataset.seed) { ui.route = `seed:${target.dataset.seed}`; return render(); }
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
  if (target.dataset.period) {
    const period = target.dataset.period;
    ui.selectedPeriods = ui.selectedPeriods.includes(period)
      ? ui.selectedPeriods.filter(item => item !== period)
      : [...ui.selectedPeriods, period];
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
    await api("/api/proposals/confirm", { slot, value: slot === "time" ? "本周六 15:00" : "学校北门" });
    notify(slot === "time" ? "时间已由你确认，植物长高了一点" : "行动约定已完整，花苞出现了");
    return;
  }

  const action = target.dataset.action;
  if (action === "back") return goBack();
  if (action === "world-help") return notify("试试点击房子、信箱、花圃、桥和小绿，它们都是入口");
  if (action === "pet-talk") { ui.petMood = ui.petMood === "happy" ? "idle" : "happy"; return render(); }
  if (action === "pet-sleep") { ui.petMood = "sleep"; notify("小绿睡着了，等会儿还会自己醒来"); return render(); }
  if (action === "decorate") { ui.decorated = !ui.decorated; notify(ui.decorated ? "摆上了新地毯和花灯" : "已收起本次装扮"); return render(); }
  if (action === "notify") return notify("3 个新机会已经放进信箱");
  if (action === "publish") return startPublishFlow();
  if (action === "view-candidates") { ui.route = "candidates"; return render(); }
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
  if (action === "again") { ui.route = "publish"; ui.publishStep = 1; ui.draft.idea = "再约一次磨山轻徒步"; return render(); }
  if (action === "reset-demo") { await api("/api/demo/reset", {}); ui = initialUi(); notify("演示进度已重置"); return render(); }
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

document.addEventListener("change", event => {
  if (event.target.id !== "date-select") return;
  ui.selectedDate = event.target.value;
  render();
});

window.addEventListener("popstate", render);
window.addEventListener("resize", syncPhoneScale);
api("/api/demo").then(render);
