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
      },
      plants: {
        current: { x: 60.4, y: 40, scale: .66, route: [[46, 51], [51, 50], [56, 49]] },
        ride: { x: 29.2, y: 37.1, scale: .65, route: [[46, 51], [46, 47], [45, 46]] },
        photo: { x: 55.5, y: 31.2, scale: .62, route: [[46, 51], [48, 45], [51, 40]] },
        study: { x: 41.5, y: 61, scale: .62, route: [[46, 51], [50, 56], [53, 62]] },
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
      <img class="flying-insect butterfly-one" src="assets/insect-butterfly.png" alt=""><img class="flying-insect butterfly-two" src="assets/insect-butterfly.png" alt=""><img class="flying-insect dragonfly-one" src="assets/insect-dragonfly.png" alt="">
    </div>`;
  }

  function objectEffectsMarkup(active = "") {
    return `<div class="world-object-effects ${active === "mailbox" ? "opening-mailbox" : ""}" aria-hidden="true"><img class="garden-mailbox-lid" src="assets/garden-mailbox-lid.png" alt=""></div>`;
  }

  function decorationsMarkup() {
    return `<div class="world-decorations" aria-label="我的花园装扮">${decorationCatalog.filter(item => preferences.decorations.includes(item.id)).map(item => `<img src="${item.asset}" alt="${item.label}" style="--decor-x:${item.x}%;--decor-y:${item.y}%;--decor-size:${item.size}px">`).join("")}</div>`;
  }

  function petMarkup() {
    return `<button class="living-pet behavior-idle" style="--pet-x:${currentPoint.x}%;--pet-y:${currentPoint.y}%" data-action="pet-talk" aria-label="和小绿说话"><img src="assets/pet-actions/pet-idle.png" alt="小绿"><i aria-hidden="true"></i><span>${behaviors.idle.line}</span></button>`;
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
    pet.className = `living-pet behavior-${moving ? "walk" : behavior.id}`;
    const image = pet.querySelector("img");
    image.src = `assets/pet-actions/${moving ? "pet-walk.png" : behavior.asset}`;
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
    scene.querySelector(".world-decorations")?.remove();
    scene.querySelector(".living-pet")?.remove();
    scene.insertAdjacentHTML("beforeend", decorationsMarkup() + petMarkup());
    screen.querySelector(".world-tools")?.remove();
    screen.insertAdjacentHTML("beforeend", controlsMarkup());
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

  window.WorldLayer = { scenes, anchorStyle, plantStyle, objectEffectsMarkup, decorationsMarkup, petMarkup, controlsMarkup, mount, cyclePet, interactPet };
})();
