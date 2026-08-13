(function () {
  "use strict";

  const STORAGE_KEY = "cobloom.world.preferences.v3";
  const ANCHOR_KEY = "cobloom.world.anchors.v2";
  const gardenImage = "assets/garden-world-v2.png";

  const scenes = {
    garden: {
      image: gardenImage,
      anchors: {
        home: { x: 1, y: 45, w: 38, h: 20 },
        mailbox: { x: 17, y: 66, w: 25, h: 14 },
        bridge: { x: 48, y: 66, w: 26, h: 14 },
      },
      plants: {
        current: { x: 60.4, y: 40, scale: .66, route: [[46, 51], [51, 50], [56, 49]] },
        ride: { x: 29.2, y: 37.1, scale: .65, route: [[46, 51], [46, 47], [45, 46]] },
        photo: { x: 55.5, y: 31.2, scale: .62, route: [[46, 51], [48, 45], [51, 40]] },
        center: { x: 47.5, y: 50.5, scale: .62, route: [[46, 51], [48, 55], [50, 58]] },
        study: { x: 41.5, y: 61, scale: .62, route: [[46, 51], [50, 56], [53, 62]] },
        bottom: { x: 33, y: 77, scale: .62, route: [[46, 51], [43, 63], [39, 74]] },
      },
    },
    home: {
      image: "assets/home-interior.png",
      anchors: {
        bed: { x: 2.5, y: 36, w: 33, h: 18 },
        table: { x: 60, y: 65, w: 38, h: 17 },
        books: { x: 65, y: 18, w: 32, h: 29 },
      },
    },
  };

  const behaviors = {
    idle: { id: "idle", asset: "pet-idle.png", line: "风吹过来的时候，花园会轻轻说话。", route: [[46, 51]] },
    talk: { id: "talk", asset: "pet-talk.png", line: "我只走花园的小路，不会踩进花圃和小溪。", route: [[46, 51]] },
    nap: { id: "nap", asset: "pet-sleep.png", line: "在石板路边打个盹……", route: [[46, 51], [48, 56], [51, 61]] },
  };

  const decorationCatalog = [
    { id: "hydrangea", label: "蓝绣球", asset: "assets/flower-4.png", x: 7, y: 57, size: 62 },
    { id: "peony", label: "小牡丹", asset: "assets/flower-7.png", x: 77, y: 60, size: 58 },
    { id: "iris", label: "溪边鸢尾", asset: "assets/flower-8.png", x: 74, y: 39, size: 54 },
  ];

  const seedFlights = [
    { id: "mist-hike", source: "小满", garden: "小满的花园", x: 18, y: 31, delay: -1.2, seed: { id: "caught-mist-hike", title: "晨雾里的轻徒步", type: "户外", time: "周六 07:30", place: "九溪入口", peer: "小满", color: "sage", asset: "flower-4.png", petAsset: "pet-water.png", preview: "蝴蝶从小满的花园带来一颗种子：想趁晨雾还没散，慢慢走一段九溪。", letter: "嗨，一寸欢喜：\n\n这颗种子原本长在我的花园里。周六早上我想去九溪走一小段，不赶路，也不一定要走到终点。\n\n我会带一壶热水；如果雾很大，我们就在溪边待一会儿再回来。", tags: ["晨间出发", "不赶速度"], reason: "你收藏过轻徒步，也愿意早起；这颗种子的时间和节奏都与你合得上。" } },
    { id: "grass-song", source: "白羽", garden: "白羽的花园", x: 72, y: 27, delay: -4.1, seed: { id: "caught-grass-song", title: "草坪上交换一首歌", type: "文艺", time: "周五 18:40", place: "东操场草坪", peer: "白羽", color: "pink", asset: "flower-2.png", petAsset: "pet-talk.png", preview: "白羽花园里的花结了一颗种子：带一首最近循环的歌，去草坪听完。", letter: "一寸欢喜：\n\n周五傍晚我会带小音箱去东操场。不用准备歌单，每个人只挑一首最近最想分享的。\n\n如果你愿意，就带着那首歌来。我们把手机放下，完整听完再聊天。", tags: ["一人一首", "日落前后"], reason: "你们都喜欢现场音乐，也都把周五傍晚留作比较松弛的时间。" } },
    { id: "lake-ride", source: "Lion", garden: "Lion的花园", x: 38, y: 22, delay: -6.8, seed: { id: "caught-lake-ride", title: "不看配速的环湖骑行", type: "运动", time: "周日 16:00", place: "西湖少年宫", peer: "Lion", color: "gold", asset: "flower-3.png", petAsset: "pet-idle.png", preview: "Lion的花结了一颗骑行种子：二十公里左右，看到好光线就停。", letter: "嗨：\n\n周日下午想从少年宫出发绕湖骑一圈。不会拉速度，路上碰到好看的光线就停下来拍照。\n\n我会带打气筒和补胎工具，你带水就好。", tags: ["约 20 km", "不追配速"], reason: "你们都接受轻量环湖路线，也愿意为沿途的风景临时停下来。" } },
    { id: "sunrise", source: "迟野", garden: "迟野的花园", x: 83, y: 43, delay: -2.9, seed: { id: "caught-sunrise", title: "坐第一班车去等日出", type: "户外", time: "周日 05:30", place: "钱塘江边", peer: "迟野", color: "sage", asset: "flower-7.png", petAsset: "pet-walk.png", preview: "迟野让一只蝴蝶捎来清晨的种子：天气不一定完美，但可以一起看城市醒来。", letter: "一寸欢喜：\n\n这周日想坐第一班车去江边。天气预报有一点云，所以不保证能看到完整的日出。\n\n我还是会带早餐去；太阳不出来的话，我们就看看城市慢慢醒来。", tags: ["第一班车", "自带早餐"], reason: "你们都能接受很早出发，也不把看到完美日出当作必须完成的目标。" } },
    { id: "film-summer", source: "橘子汽水", garden: "橘子汽水的花园", x: 57, y: 35, delay: -8.4, seed: { id: "caught-film-summer", title: "分着拍完一卷胶片", type: "摄影", time: "周六 14:00", place: "校园各处", peer: "橘子汽水", color: "pink", asset: "flower-5.png", petAsset: "pet-mail.png", preview: "一颗不能回看、不能重拍的胶片种子，从橘子汽水的花园飞来了。", letter: "嗨，一寸欢喜：\n\n我有一卷刚装好的胶片，想分给几个人一起拍完。规则只有两个：拍完之前不能看，也不重拍。\n\n糊掉也没关系，我们就把那一秒留下。", tags: ["不能回看", "不能重拍"], reason: "你们都喜欢记录日常，也都愿意接受偶然和不完美的画面。" } },
    { id: "gelato", source: "饭团", garden: "饭团的花园", x: 26, y: 46, delay: -5.5, seed: { id: "caught-gelato", title: "坐很远的车去吃 Gelato", type: "城市", time: "周六 15:20", place: "城西 Gelato 小店", peer: "饭团", color: "gold", asset: "flower-6.png", petAsset: "pet-mail.png", preview: "饭团花园里飞来一颗有点甜的种子：路比冰淇淋长，但有人同行就刚刚好。", letter: "一寸欢喜：\n\n我查到一家很小的 Gelato 店，往返可能要三个小时。吃冰淇淋大概只要十分钟，但我还是挺想去。\n\n路线已经查好了。如果你也觉得这件事不必太划算，那就一起出发。", tags: ["三小时往返", "临时起意"], reason: "你们都愿意为一件小事认真出发，周六下午的时间也正好重合。" } },
  ];

  const defaults = {
    decorations: ["hydrangea"],
    atmosphere: "day",
    sound: false,
    motion: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };

  function readStorage(key, fallback) {
    try { return { ...fallback, ...JSON.parse(localStorage.getItem(key) || "{}") }; }
    catch { return { ...fallback }; }
  }

  let preferences = readStorage(STORAGE_KEY, defaults);
  let anchorOverrides = readStorage(ANCHOR_KEY, {});
  let currentPoint = { x: 46, y: 51 };
  let currentRoute = [[46, 51]];
  let petTimer = null;
  let routeTimers = [];
  let audioContext = null;
  let ambientSource = null;
  let dragState = null;
  let caughtSeeds = 0;
  let activeChase = null;
  let butterflySerial = 0;
  let butterflySpawner = null;
  let walkFrameTimer = null;
  const butterflyTimers = new Map();
  const caughtFlightIds = new Set();
  const butterflyPerches = [
    { x: 50, y: 36, label: "绣球花" }, { x: 31, y: 66, label: "信箱" },
    { x: 80, y: 45, label: "石灯" }, { x: 20, y: 38, label: "灌木丛" },
    { x: 68, y: 34, label: "花圃" }, { x: 41, y: 49, label: "小路边" },
  ];
  const walkableZones = [
    { cx: 47, cy: 51, rx: 38, ry: 27 },
    { cx: 38, cy: 73, rx: 28, ry: 17 },
    { cx: 34, cy: 81, rx: 18, ry: 8 },
  ];
  const bridgeWalkableZone = { cx: 58, cy: 73, rx: 8, ry: 7 };
  const blockedZones = [
    { cx: 69, cy: 73, rx: 13, ry: 25 },
  ];
  const butterflyAssets = ["insect-butterfly.png", "insect-butterfly-blue.png", "insect-butterfly-pink.png", "insect-butterfly-orange.png"];

  const savePreferences = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  const saveAnchors = () => localStorage.setItem(ANCHOR_KEY, JSON.stringify(anchorOverrides));
  const clearRouteTimers = () => { routeTimers.forEach(clearTimeout); routeTimers = []; };

  function getAnchor(sceneId, anchorId) {
    return anchorOverrides?.[sceneId]?.[anchorId] || scenes[sceneId].anchors[anchorId];
  }

  function anchorStyle(sceneId, anchorId) {
    const a = getAnchor(sceneId, anchorId);
    return `--anchor-x:${a.x}%;--anchor-y:${a.y}%;--anchor-w:${a.w}%;--anchor-h:${a.h}%`;
  }

  function plantStyle(id) {
    const p = scenes.garden.plants[id];
    return `--plant-x:${p.x}%;--plant-y:${p.y}%;--plant-scale:${p.scale}`;
  }

  function atmosphere() {
    if (preferences.atmosphere !== "auto") return preferences.atmosphere;
    const hour = new Date().getHours();
    if (hour < 7 || hour >= 20) return "night";
    if (hour < 10) return "morning";
    if (hour >= 17) return "dusk";
    return "day";
  }

  function ambientMarkup() {
    return `<div class="ambient-world" aria-hidden="true">
      <i class="ambient-cloud cloud-one"></i><i class="ambient-cloud cloud-two"></i>
      <span class="creek-water-mask"><i class="stream-shimmer shimmer-one"></i><i class="stream-shimmer shimmer-two"></i><i class="stream-shimmer shimmer-three"></i><i class="water-ripple creek-ripple-one"></i><i class="water-ripple creek-ripple-two"></i></span>
      <span class="basin-water-mask"><i class="water-ripple basin-ripple-one"></i><i class="water-ripple basin-ripple-two"></i></span>
      <i class="bamboo-water"></i><i class="bamboo-drop drop-one"></i><i class="bamboo-drop drop-two"></i>
      <i class="floating-leaf leaf-one"></i><i class="floating-leaf leaf-two"></i><i class="floating-leaf leaf-three"></i>
      <img class="flying-insect dragonfly-one" src="assets/insect-dragonfly.png" alt="">
    </div>`;
  }

  function seedButterfliesMarkup() {
    return `<div class="seed-butterfly-layer" aria-label="从其他花园飞来的种子蝴蝶"></div><aside class="seed-hunt-guide"><img src="assets/insect-butterfly.png" alt=""><div><strong>追蝴蝶，采种子</strong><small>蝴蝶会停一会儿 · 已采 ${caughtSeeds} 颗</small></div></aside>`;
  }

  function clearButterflyTimer(button) {
    const timers = butterflyTimers.get(button);
    timers?.forEach(clearTimeout);
    butterflyTimers.delete(button);
  }

  function setButterflyPosition(button, x, y, state = "flying") {
    button.dataset.x = x;
    button.dataset.y = y;
    button.dataset.state = state;
    button.style.setProperty("--butterfly-x", `${x}%`);
    button.style.setProperty("--butterfly-y", `${y}%`);
  }

  function butterflyHint(flight) {
    if (!flight) return "一颗路过花园的新种子";
    const detail = flight.seed.tags?.[0] || flight.seed.type;
    return `${detail} · ${flight.seed.time.split(" ")[0]} · ${flight.seed.title.slice(0, 7)}…`;
  }

  function isInsideEllipse(point, zone) {
    return ((point.x - zone.cx) / zone.rx) ** 2 + ((point.y - zone.cy) / zone.ry) ** 2 <= 1;
  }

  function isWalkablePoint(point) {
    if (isInsideEllipse(point, bridgeWalkableZone)) return true;
    return walkableZones.some(zone => isInsideEllipse(point, zone))
      && !blockedZones.some(zone => isInsideEllipse(point, zone));
  }

  function nearestWalkablePoint(point) {
    if (isWalkablePoint(point)) return point;

    // Sample every legal area's inner edge. Unlike the old radial projection,
    // this also finds a valid destination when the tapped point sits inside a
    // river or another blocked shape that overlaps a broad walking zone.
    const candidates = [];
    [...walkableZones, bridgeWalkableZone].forEach(zone => {
      candidates.push({ x: zone.cx, y: zone.cy });
      for (let step = 0; step < 96; step += 1) {
        const angle = step / 96 * Math.PI * 2;
        candidates.push({
          x: zone.cx + Math.cos(angle) * zone.rx * .94,
          y: zone.cy + Math.sin(angle) * zone.ry * .94,
        });
      }
    });
    blockedZones.forEach(zone => {
      for (let step = 0; step < 96; step += 1) {
        const angle = step / 96 * Math.PI * 2;
        candidates.push({
          x: zone.cx + Math.cos(angle) * zone.rx * 1.04,
          y: zone.cy + Math.sin(angle) * zone.ry * 1.04,
        });
      }
    });

    return candidates
      .filter(isWalkablePoint)
      .sort((a, b) => Math.hypot(a.x - point.x, a.y - point.y) - Math.hypot(b.x - point.x, b.y - point.y))[0]
      || { x: 46, y: 51 };
  }

  function removeButterfly(button) {
    clearButterflyTimer(button);
    if (activeChase === button) activeChase = null;
    button.remove();
    scheduleButterflySpawn();
  }

  function flyButterflyAway(button) {
    if (!button?.isConnected || button.classList.contains("caught")) return;
    clearButterflyTimer(button);
    button.dataset.state = "leaving";
    button.classList.add("leaving");
    setButterflyPosition(button, Math.random() > .5 ? 108 : -8, 18 + Math.random() * 38, "leaving");
    butterflyTimers.set(button, [setTimeout(() => removeButterfly(button), 1500)]);
  }

  function roamButterfly(button, stepsLeft = 5) {
    if (!button?.isConnected || button.classList.contains("targeted")) return;
    if (stepsLeft <= 0) return flyButterflyAway(button);
    const perch = butterflyPerches[Math.floor(Math.random() * butterflyPerches.length)];
    button.classList.remove("resting");
    setButterflyPosition(button, perch.x + (Math.random() * 5 - 2.5), perch.y + (Math.random() * 4 - 2), "flying");
    const flightTime = 1500 + Math.random() * 900;
    const restTime = 950 + Math.random() * 1500;
    const settle = setTimeout(() => {
      if (!button.isConnected || button.classList.contains("targeted")) return;
      button.classList.add("resting");
      button.dataset.state = "resting";
      button.querySelector("span").textContent = butterflyHint(seedFlights.find(item => item.id === button.dataset.seedFlight));
    }, flightTime);
    const next = setTimeout(() => roamButterfly(button, stepsLeft - 1), flightTime + restTime);
    butterflyTimers.set(button, [settle, next]);
  }

  function spawnButterfly(force = false) {
    const layer = document.querySelector(".garden-world-screen .seed-butterfly-layer");
    if (!layer || layer.children.length >= 3 || (!force && document.hidden)) return scheduleButterflySpawn();
    const available = seedFlights.filter(flight => !caughtFlightIds.has(flight.id));
    if (!available.length) return;
    const flight = available[butterflySerial % available.length];
    butterflySerial += 1;
    const fromLeft = Math.random() > .5;
    const button = document.createElement("button");
    button.className = "seed-butterfly entering";
    button.dataset.seedFlight = flight.id;
    button.setAttribute("aria-label", `捕捉从${flight.garden}飞来的蝴蝶`);
    button.innerHTML = `<img src="assets/${butterflyAssets[(butterflySerial - 1) % butterflyAssets.length]}" alt=""><span>${butterflyHint(flight)}</span>`;
    setButterflyPosition(button, fromLeft ? -8 : 108, 24 + Math.random() * 30, "entering");
    layer.append(button);
    requestAnimationFrame(() => {
      button.classList.remove("entering");
      roamButterfly(button, 4 + Math.floor(Math.random() * 3));
    });
    scheduleButterflySpawn();
  }

  function scheduleButterflySpawn() {
    clearTimeout(butterflySpawner);
    const layer = document.querySelector(".garden-world-screen .seed-butterfly-layer");
    if (!layer || layer.children.length >= 3) return;
    butterflySpawner = setTimeout(() => spawnButterfly(), 5000 + Math.random() * 4500);
  }

  function objectEffectsMarkup(active = "") {
    return `<div class="world-object-effects ${active === "mailbox" ? "opening-mailbox" : ""}" aria-hidden="true"><img class="garden-mailbox-lid" src="assets/garden-mailbox-lid.png" alt=""></div>`;
  }

  function decorationsMarkup() {
    return `<div class="world-decorations" aria-label="我的花园装扮">${decorationCatalog.filter(item => preferences.decorations.includes(item.id)).map(item => `<img src="${item.asset}" alt="${item.label}" style="--decor-x:${item.x}%;--decor-y:${item.y}%;--decor-size:${item.size}px">`).join("")}</div>`;
  }

  function petMarkup() {
    return `<button class="living-pet behavior-idle" style="--pet-x:${currentPoint.x}%;--pet-y:${currentPoint.y}%" data-action="pet-talk" aria-label="和小羊说话"><img src="assets/pet-actions/pet-idle.png" alt="小羊"><i aria-hidden="true"></i><span>${behaviors.idle.line}</span></button>`;
  }

  function controlsMarkup() {
    const label = { auto: "自动", morning: "晨", day: "昼", dusk: "暮", night: "夜" }[preferences.atmosphere];
    return `<div class="world-tools" aria-label="花园氛围控制"><button data-world-tool="decorate" aria-label="打开装扮">✦<small>装扮</small></button><button data-world-tool="atmosphere" aria-label="切换昼夜">◐<small>${label}</small></button><button data-world-tool="sound" aria-label="${preferences.sound ? "关闭" : "打开"}环境音">${preferences.sound ? "♪" : "♩"}<small>${preferences.sound ? "有声" : "静音"}</small></button><button data-world-tool="motion" aria-label="${preferences.motion ? "暂停" : "播放"}花园动效">${preferences.motion ? "Ⅱ" : "▶"}<small>${preferences.motion ? "动态" : "暂停"}</small></button></div>`;
  }

  function drawerMarkup() {
    return `<section class="decor-drawer" aria-label="花园装扮抽屉"><header><div><small>仅改变生活空间的外观</small><strong>布置我的花园</strong></div><button data-world-tool="close-drawer" aria-label="关闭">×</button></header><div>${decorationCatalog.map(item => `<button class="${preferences.decorations.includes(item.id) ? "selected" : ""}" data-decoration="${item.id}"><img src="${item.asset}" alt=""><span>${item.label}</span><b>${preferences.decorations.includes(item.id) ? "✓" : "+"}</b></button>`).join("")}</div><p>装扮和宠物生活动画不改变植物的真实成长阶段。</p></section>`;
  }

  function occupiedWaterBehaviors() {
    return [...document.querySelectorAll(".real-plant-slot[data-plot-id]")].map(element => {
      const id = element.dataset.plotId;
      const plant = scenes.garden.plants[id];
      if (!plant) return null;
      return { id: "water", asset: "pet-water.png", line: `只给${element.getAttribute("aria-label") || "这株植物"}浇一点水。`, route: plant.route };
    }).filter(Boolean);
  }

  function setPetBehavior(behavior, moving = false) {
    const pet = document.querySelector(".living-pet");
    if (!pet) return;
    clearInterval(walkFrameTimer);
    walkFrameTimer = null;
    pet.className = `living-pet behavior-${moving ? "walk" : behavior.id}`;
    const image = pet.querySelector("img");
    image.src = `assets/pet-actions/${moving ? "pet-walk.png" : behavior.asset}`;
    if (moving) {
      let alternate = false;
      walkFrameTimer = setInterval(() => {
        if (!image.isConnected || !pet.classList.contains("behavior-walk")) return clearInterval(walkFrameTimer);
        alternate = !alternate;
        image.src = `assets/pet-actions/${alternate ? "pet-walk-alt.png" : "pet-walk.png"}`;
      }, 210);
    }
    pet.querySelector("span").textContent = behavior.line;
  }

  function followRoute(behavior) {
    const pet = document.querySelector(".living-pet");
    if (!pet) return;
    clearRouteTimers();
    const destinationRoute = behavior.route || [[46, 51]];
    const returnToHub = [...currentRoute].reverse().slice(1);
    const route = [...returnToHub, ...destinationRoute.slice(returnToHub.length ? 1 : 0)];
    const startX = currentPoint.x;
    route.forEach((point, index) => {
      const timer = setTimeout(() => {
        const goingLeft = point[0] < (index ? route[index - 1][0] : startX);
        pet.classList.toggle("facing-left", goingLeft);
        setPetBehavior(behavior, true);
        pet.style.setProperty("--pet-x", `${point[0]}%`);
        pet.style.setProperty("--pet-y", `${point[1]}%`);
        currentPoint = { x: point[0], y: point[1] };
      }, index * 1350);
      routeTimers.push(timer);
    });
    routeTimers.push(setTimeout(() => { setPetBehavior(behavior, false); currentRoute = destinationRoute; }, route.length * 1350 + 100));
  }

  function movePetTo(x, y, line = "", onArrive) {
    const pet = document.querySelector(".living-pet");
    if (!pet) return;
    clearRouteTimers();
    clearTimeout(petTimer);
    const goingLeft = x < currentPoint.x;
    const behavior = { id: "walk", asset: "pet-walk.png", line, route: [[x, y]] };
    setPetBehavior(behavior, true);
    pet.classList.toggle("facing-left", goingLeft);
    pet.classList.toggle("directed", Boolean(line));
    pet.style.setProperty("--pet-x", `${x}%`);
    pet.style.setProperty("--pet-y", `${y}%`);
    currentPoint = { x, y };
    currentRoute = [[x, y]];
    const timer = setTimeout(() => {
      setPetBehavior(behavior, false);
      pet.classList.remove("directed");
      onArrive?.(pet);
      schedulePet();
    }, 1280);
    routeTimers.push(timer);
  }

  function updateHuntCount() {
    const label = document.querySelector(".seed-hunt-guide small");
    if (label) label.textContent = `蝴蝶会停一会儿 · 已采 ${caughtSeeds} 颗`;
  }

  function chaseButterfly(button) {
    if (!button || button.classList.contains("caught") || activeChase) return;
    const flight = seedFlights.find(item => item.id === button.dataset.seedFlight);
    if (!flight) return;
    activeChase = button;
    clearButterflyTimer(button);
    button.classList.add("targeted");
    button.classList.remove("resting");
    const escapePerch = butterflyPerches[Math.floor(Math.random() * butterflyPerches.length)];
    setButterflyPosition(button, escapePerch.x, escapePerch.y, "escaping");
    if (Math.random() < .58) {
      setTimeout(() => {
        if (!button.isConnected || activeChase !== button) return;
        const secondPerch = butterflyPerches.filter(perch => perch !== escapePerch)[Math.floor(Math.random() * (butterflyPerches.length - 1))];
        setButterflyPosition(button, secondPerch.x, secondPerch.y, "escaping");
      }, 620);
    }
    const scene = button.closest(".world-scene");
    const sceneBox = scene?.getBoundingClientRect();
    if (!sceneBox) { activeChase = null; return; }
    const x = Math.max(10, Math.min(90, escapePerch.x - 3));
    const y = Math.max(28, Math.min(68, escapePerch.y + 7));
    movePetTo(x, y, "等等我，把那颗种子留下！", pet => {
      button.classList.remove("targeted");
      const butterflyBox = button.getBoundingClientRect();
      const petBox = pet.getBoundingClientRect();
      const distance = Math.hypot(butterflyBox.left + butterflyBox.width / 2 - (petBox.left + petBox.width / 2), butterflyBox.top + butterflyBox.height / 2 - (petBox.top + petBox.height * .35));
      clearInterval(walkFrameTimer);
      pet.querySelector("img").src = "assets/pet-actions/pet-catch-v2-final.png";
      pet.classList.add("behavior-catch");
      pet.querySelector("span").textContent = distance < 86 ? "看我的小网兜！" : "哎呀，差一点点！";
      if (distance >= 86) {
        activeChase = null;
        setTimeout(() => {
          setPetBehavior(behaviors.idle, false);
          if (button.isConnected) roamButterfly(button, 3);
        }, 720);
        return;
      }
      button.classList.add("caught");
      button.getBoundingClientRect();
      button.style.setProperty("--butterfly-x", "29%");
      button.style.setProperty("--butterfly-y", "71%");
      setTimeout(() => {
        caughtSeeds += 1;
        caughtFlightIds.add(flight.id);
        updateHuntCount();
        document.dispatchEvent(new CustomEvent("cobloom:seed-caught", { detail: { seed: flight.seed, garden: flight.garden } }));
        const sceneNow = document.querySelector(".garden-world-screen .world-scene");
        if (sceneNow) sceneNow.insertAdjacentHTML("beforeend", `<div class="seed-caught-card"><img src="assets/${flight.seed.asset}" alt=""><div><small>采种成功 · 已送进信箱</small><strong>${flight.seed.title}</strong><span>来自${flight.garden}</span></div></div>`);
        setTimeout(() => document.querySelector(".seed-caught-card")?.remove(), 3200);
        removeButterfly(button);
        activeChase = null;
        setTimeout(() => setPetBehavior(behaviors.idle, false), 420);
      }, 850);
    });
  }

  function directPet(event) {
    if (activeChase || event.target.closest("button, .world-tools, .world-dock, .game-hud, .world-modal-backdrop")) return;
    const scene = event.currentTarget;
    const rect = scene.getBoundingClientRect();
    const requested = { x: Math.max(9, Math.min(91, (event.clientX - rect.left) / rect.width * 100)), y: Math.max(28, Math.min(82, (event.clientY - rect.top) / rect.height * 100)) };
    const destination = nearestWalkablePoint(requested);
    movePetTo(destination.x, destination.y, "", null);
  }

  function cyclePet(force = false) {
    if (!preferences.motion && !force) return;
    const choices = [behaviors.nap, behaviors.idle, behaviors.idle, ...occupiedWaterBehaviors()];
    followRoute(choices[Math.floor(Math.random() * choices.length)] || behaviors.idle);
  }

  function interactPet() {
    followRoute(behaviors.talk);
    schedulePet();
  }

  function schedulePet() {
    clearTimeout(petTimer);
    if (!preferences.motion || document.hidden) return;
    petTimer = setTimeout(() => { cyclePet(); schedulePet(); }, 8000 + Math.random() * 5000);
  }

  function openDrawer() {
    const scene = document.querySelector(".garden-world-screen .world-scene");
    if (!scene || scene.querySelector(".decor-drawer")) return;
    scene.insertAdjacentHTML("beforeend", drawerMarkup());
    requestAnimationFrame(() => scene.querySelector(".decor-drawer")?.classList.add("open"));
  }

  function mountGarden() {
    clearRouteTimers();
    const screen = document.querySelector(".garden-world-screen");
    const scene = screen?.querySelector(".world-scene");
    if (!scene) return;
    screen.classList.remove("atmosphere-morning", "atmosphere-day", "atmosphere-dusk", "atmosphere-night", "motion-off");
    screen.classList.add(`atmosphere-${atmosphere()}`);
    if (!preferences.motion) screen.classList.add("motion-off");
    if (!scene.querySelector(".ambient-world")) scene.insertAdjacentHTML("afterbegin", ambientMarkup());
    if (!scene.querySelector(".seed-butterfly-layer")) scene.insertAdjacentHTML("beforeend", seedButterfliesMarkup());
    scene.querySelector(".world-decorations")?.remove();
    scene.querySelector(".living-pet")?.remove();
    scene.insertAdjacentHTML("beforeend", decorationsMarkup() + petMarkup());
    screen.querySelector(".world-tools")?.remove();
    screen.insertAdjacentHTML("beforeend", controlsMarkup());
    scene.removeEventListener("click", directPet);
    scene.addEventListener("click", directPet);
    const butterflies = scene.querySelector(".seed-butterfly-layer");
    if (butterflies && butterflies.children.length === 0) {
      spawnButterfly(true);
    }
    scheduleButterflySpawn();
    schedulePet();
    if (new URLSearchParams(location.search).get("sceneDebug") === "1") enableAnchorDebug("garden");
  }

  function mount() {
    mountGarden();
    if (new URLSearchParams(location.search).get("sceneDebug") === "1" && document.querySelector(".home-world-screen")) enableAnchorDebug("home");
  }

  function enableAnchorDebug(sceneId) {
    const root = document.querySelector(sceneId === "garden" ? ".garden-world-screen .world-scene" : ".home-world-screen .world-scene");
    if (!root || root.classList.contains("anchor-debug")) return;
    root.classList.add("anchor-debug");
    root.insertAdjacentHTML("beforeend", `<div class="anchor-debug-panel"><strong>热点校准</strong><span>拖动黄色区域；位置自动保存</span><button data-world-tool="copy-anchors">复制配置</button><button data-world-tool="reset-anchors">重置</button></div>`);
    root.querySelectorAll("[data-anchor]").forEach(element => element.addEventListener("pointerdown", event => {
      event.preventDefault();
      element.setPointerCapture(event.pointerId);
      dragState = { sceneId, anchorId: element.dataset.anchor, element, rect: root.getBoundingClientRect(), anchor: { ...getAnchor(sceneId, element.dataset.anchor) }, startX: event.clientX, startY: event.clientY };
    }));
  }

  document.addEventListener("pointermove", event => {
    if (!dragState) return;
    const next = { ...dragState.anchor, x: +(dragState.anchor.x + (event.clientX - dragState.startX) / dragState.rect.width * 100).toFixed(2), y: +(dragState.anchor.y + (event.clientY - dragState.startY) / dragState.rect.height * 100).toFixed(2) };
    anchorOverrides[dragState.sceneId] ||= {};
    anchorOverrides[dragState.sceneId][dragState.anchorId] = next;
    dragState.element.style.setProperty("--anchor-x", `${next.x}%`);
    dragState.element.style.setProperty("--anchor-y", `${next.y}%`);
  });

  document.addEventListener("pointerup", () => { if (dragState) saveAnchors(); dragState = null; });
  document.addEventListener("visibilitychange", schedulePet);
  document.addEventListener("click", async event => {
    const butterfly = event.target.closest("[data-seed-flight]");
    if (butterfly) { event.preventDefault(); event.stopPropagation(); chaseButterfly(butterfly); return; }
    const decoration = event.target.closest("[data-decoration]")?.dataset.decoration;
    const tool = event.target.closest("[data-world-tool]")?.dataset.worldTool;
    if (decoration) {
      preferences.decorations = preferences.decorations.includes(decoration) ? preferences.decorations.filter(id => id !== decoration) : [...preferences.decorations, decoration];
      savePreferences(); mount(); openDrawer(); return;
    }
    if (!tool) return;
    if (tool === "decorate") openDrawer();
    if (tool === "close-drawer") { const drawer = document.querySelector(".decor-drawer"); drawer?.classList.remove("open"); setTimeout(() => drawer?.remove(), 250); }
    if (tool === "atmosphere") { const values = ["auto", "morning", "day", "dusk", "night"]; preferences.atmosphere = values[(values.indexOf(preferences.atmosphere) + 1) % values.length]; savePreferences(); mount(); }
    if (tool === "sound") {
      preferences.sound = !preferences.sound;
      if (preferences.sound) {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (Context && !audioContext) { audioContext = new Context(); const osc = audioContext.createOscillator(); const gain = audioContext.createGain(); osc.type = "sine"; osc.frequency.value = 210; gain.gain.value = .006; osc.connect(gain).connect(audioContext.destination); osc.start(); ambientSource = osc; }
      } else { try { ambientSource?.stop(); audioContext?.close(); } catch {} audioContext = null; ambientSource = null; }
      savePreferences(); mount();
    }
    if (tool === "motion") { preferences.motion = !preferences.motion; savePreferences(); mount(); }
    if (tool === "copy-anchors") { await navigator.clipboard?.writeText(JSON.stringify(anchorOverrides, null, 2)); event.target.textContent = "已复制"; }
    if (tool === "reset-anchors") { anchorOverrides = {}; saveAnchors(); location.reload(); }
  });

  window.WorldLayer = { scenes, anchorStyle, plantStyle, objectEffectsMarkup, decorationsMarkup, petMarkup, controlsMarkup, mount, cyclePet, interactPet, chaseButterfly };
})();
