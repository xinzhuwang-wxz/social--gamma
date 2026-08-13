// 校园风物榜 · 展示页（演示分支，纯 mock，不接后端）
// 依赖（vendor/，全部开源库，见各自 LICENSE）：
//   panzoom (MIT, anvaka) —— 地图拖拽/捏合缩放
//   countUp.js (MIT) —— 数字滚动
//   canvas-confetti (ISC) —— 花瓣庆祝
//   rough.js (MIT) —— 手绘风描边圈
//   motion (MIT) —— 弹簧/时间线动画
// 数据：campus-map.js（OSM 生成，ODbL）+ rank-data.js（mock）
(function () {
  "use strict";

  const BOARDS = [
    { id: "planted", label: "种下最多", unit: "颗", metric: "count", noun: "本周新种下" },
    { id: "bloomed", label: "开花最多", unit: "朵", metric: "count", noun: "双方确认完成" },
    { id: "romantic", label: "十大浪漫", unit: "票", metric: "votes", noun: "同学投票选出" },
    { id: "worthy", label: "十大值得", unit: "票", metric: "votes", noun: "毕业前不留遗憾" },
  ];
  const TONE_ASSET = { blue: "flower-1.png", pink: "flower-4.png", gold: "flower-3.png", sage: "flower-8.png", green: "flower-5.png" };
  const TONE_COLOR = { blue: "#75BAD3", pink: "#D98A9E", gold: "#D89A43", sage: "#8FA05A", green: "#89974B" };
  const HINT_KEY = "cobloom.rank.hint.v1";

  const state = {
    board: "planted",
    spot: null,          // 选中的地点 id（地点模式）
    sheet: "peek",       // peek | half | full；入场先看地图全景，入场动画结束后自动升到 half
    entered: false,      // 入场动画是否已放过
    playedBoards: new Set(),
    hintDone: (() => { try { return localStorage.getItem(HINT_KEY) === "1"; } catch { return true; } })(),
  };

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = value => String(value ?? "").replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c]);
  const data = () => window.RankData;
  const mapData = () => window.CampusMap;
  const spotById = id => data().spots.find(s => s.id === id);

  /* ---------------- 地图（构建一次，跨 render 复用同一 DOM） ---------------- */
  let mapSvg = null;          // 缓存的 <svg>
  let panzoomInstance = null;
  let markerLayer = null;
  let flyToken = 0;           // 打断飞行动画

  const SVG_NS = "http://www.w3.org/2000/svg";
  function svgEl(tag, attrs = {}, parent) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    if (parent) parent.appendChild(el);
    return el;
  }

  function buildMap() {
    if (mapSvg) return mapSvg;
    const cm = mapData();
    const [, , vw, vh] = cm.viewBox;
    // 元素尺寸固定为 viewBox 像素（1 地图单位 = 1px）：否则 100% 尺寸下 preserveAspectRatio
    // 的 letterbox 缩放会让 flyTo/fitCampus 的坐标换算整体偏移
    const svg = svgEl("svg", { viewBox: cm.viewBox.join(" "), width: vw, height: vh, style: `width:${vw}px;height:${vh}px`, class: "rank-map-svg", "aria-label": "紫金港校园手绘地图" });

    const defs = svgEl("defs", {}, svg);
    defs.innerHTML = `
      <filter id="rk-wobble" x="-4%" y="-4%" width="108%" height="108%">
        <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="7" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6"/>
      </filter>
      <radialGradient id="rk-halo"><stop offset="0%" stop-color="var(--halo,#d89a43)" stop-opacity=".38"/><stop offset="68%" stop-color="var(--halo,#d89a43)" stop-opacity=".14"/><stop offset="100%" stop-color="var(--halo,#d89a43)" stop-opacity="0"/></radialGradient>
      <radialGradient id="rk-lake" cx="42%" cy="38%"><stop offset="0%" stop-color="#c2e3ef"/><stop offset="100%" stop-color="#9fcfe2"/></radialGradient>`;

    // 纸面底色
    svgEl("rect", { x: -80, y: -80, width: vw + 160, height: vh + 160, fill: "#f4efdc" }, svg);
    const ground = svgEl("g", { class: "rk-ground", filter: "url(#rk-wobble)" }, svg);

    const L = cm.layers;
    const group = (cls, paths, attrs) => {
      const g = svgEl("g", { class: cls }, ground);
      for (const d of paths) svgEl("path", { d: typeof d === "string" ? d : d.d, ...attrs }, g);
      return g;
    };

    group("rk-green", L.green, { fill: "#d4dd9b", stroke: "none" });
    group("rk-pitch", L.pitches, { fill: "#c3d178", stroke: "#a3b45c", "stroke-width": 1.5 });
    // 水系
    const waterG = svgEl("g", { class: "rk-water" }, ground);
    for (const d of L.rivers) svgEl("path", { d, fill: "none", stroke: "#9ecfe0", "stroke-width": 8, "stroke-linecap": "round" }, waterG);
    for (const d of L.water) svgEl("path", { d, fill: "url(#rk-lake)", stroke: "#74aec4", "stroke-width": 2.4, "fill-rule": "evenodd" }, waterG);
    // 道路：主路带描边、校园路奶油色、小径虚线
    const roadsG = svgEl("g", { class: "rk-roads" }, ground);
    for (const r of L.roads) svgEl("path", { d: r.d, fill: "none", stroke: r.major ? "#dcc99b" : "#f6ecce", "stroke-width": r.major ? 11 : 7, "stroke-linecap": "round", "stroke-linejoin": "round", class: "rk-road" }, roadsG);
    const pathsG = svgEl("g", { class: "rk-paths" }, ground);
    for (const d of L.paths) svgEl("path", { d, fill: "none", stroke: "#d9c99a", "stroke-width": 2.4, "stroke-dasharray": "7 6", "stroke-linecap": "round" }, pathsG);
    // 建筑
    const bldgG = svgEl("g", { class: "rk-buildings" }, ground);
    for (const d of L.buildings) svgEl("path", { d, fill: "#eadbb4", stroke: "#b59d6c", "stroke-width": 1.5, "stroke-linejoin": "round" }, bldgG);

    // 楼名小字（不加 wobble，保证可读）
    const labelG = svgEl("g", { class: "rk-labels" }, svg);
    for (const l of cm.labels) {
      const t = svgEl("text", { x: l.x, y: l.y, class: "rk-map-label" }, labelG);
      t.textContent = l.name;
    }

    // 打卡点标记
    markerLayer = svgEl("g", { class: "rk-markers" }, svg);
    const maxSeeds = Math.max(...data().spots.map(s => s.seeds));
    for (const spot of data().spots) {
      const anchor = cm.spotAnchors[spot.id];
      if (!anchor) continue;
      const heat = spot.seeds / maxSeeds;                 // 0..1
      const scale = 0.72 + heat * 0.62;
      const g = svgEl("g", {
        class: "rank-marker",
        "data-rank-spot": spot.id,
        "data-ax": anchor[0], "data-ay": anchor[1],
        transform: `translate(${anchor[0]} ${anchor[1]})`,
        style: `--halo:${TONE_COLOR[spot.tone] || "#d89a43"}`,
        tabindex: "0", role: "button", "aria-label": `${spot.name}：本周 ${spot.seeds} 颗种子，${spot.blooms} 朵开花`,
      }, markerLayer);
      svgEl("circle", { class: "rk-heat", r: 26 + heat * 30, fill: "url(#rk-halo)" }, g);
      const inner = svgEl("g", { class: "rk-marker-inner", transform: `scale(${scale})` }, g);
      svgEl("ellipse", { cx: 0, cy: 2, rx: 12, ry: 4, fill: "rgba(84,74,40,.18)" }, inner);
      svgEl("image", { href: `assets/${TONE_ASSET[spot.tone] || "flower-3.png"}`, x: -21, y: -52, width: 42, height: 54, class: "rk-flower", preserveAspectRatio: "xMidYMax meet" }, inner);
      const badge = svgEl("g", { class: "rk-badge", transform: "translate(0 14)" }, inner);
      svgEl("rect", { x: -26, y: -9, width: 52, height: 18, rx: 9, fill: "rgba(255,251,232,.94)", stroke: "#d8c391", "stroke-width": 1 }, badge);
      const label = svgEl("text", { x: 0, y: 4, class: "rk-marker-name" }, badge);
      label.textContent = spot.name;
      // 选中时的手绘圈（rough.js），先占位
      svgEl("g", { class: "rk-rough-ring" }, g);
    }
    mapSvg = svg;
    return svg;
  }

  /* ---------------- 视图（供 prototype.js page() 调用） ---------------- */
  function page(dockHtml) {
    const w = data().weather;
    return `<main class="screen rank-screen" data-sheet="${state.sheet}" data-mode="${state.spot ? "spot" : "board"}">
      <div class="rank-map-stage">
        <div class="rank-map-host" id="rank-map-host" aria-label="拖动查看校园，捏合缩放"></div>
        <header class="rank-hud">
          <button class="rank-hud-back" data-action="back" aria-label="返回花园">‹</button>
          <div class="rank-hud-title"><small>${esc(w.campus)} · ${esc(w.week)}</small><h1>校园风物榜</h1></div>
          <button class="rank-hud-locate" data-rank-reset aria-label="回到全景">◎<small>全景</small></button>
        </header>
        ${state.hintDone ? "" : `<div class="rank-hint">轻点一朵花，看看那里正在发生什么</div>`}
        <span class="rank-map-stamp" aria-hidden="true">紫金港校区</span>
        <span class="rank-map-compass" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" fill="#fffaf0" stroke="#8a7a52" stroke-width="1.4"/><path d="M12 5.5 L14.6 15 12 12.8 9.4 15Z" fill="#df6434"/></svg><b>北</b></span>
        <p class="rank-attribution">演示数据 · 地图 © OpenStreetMap</p>
      </div>
      <section class="rank-sheet" id="rank-sheet" data-state="${state.sheet}">
        <button class="rank-grip" data-rank-grip aria-label="拖动调整榜单高度"><i></i></button>
        <div class="rank-sheet-body" id="rank-sheet-body">${state.spot ? spotPanel() : boardPanel()}</div>
      </section>
      ${dockHtml || ""}
    </main>`;
  }

  // 手绘线条统计图标（种子/发芽/开花/再种）
  const STAT_ICONS = {
    seeds: "M12 3 C7 3 5 8 5 12 c0 5 3 8 7 8 s7 -3 7 -8 c0 -4 -2 -9 -7 -9Z M12 9 v7",
    sprouts: "M12 21 v-8 M12 13 C12 8 8 6 4 6 c0 5 3 8 8 7Z M12 11 C12 7 16 5 20 5 c0 5 -3 8 -8 7Z",
    blooms: "M12 21 v-6 M12 12 m-3.5 0 a3.5 3.5 0 1 0 7 0 a3.5 3.5 0 1 0 -7 0 M12 5 v3 M6 8 l2 2 M18 8 l-2 2 M6 16 l2 -2 M18 16 l-2 -2",
    reseeds: "M5 12 a7 7 0 0 1 12 -5 l2 2 M19 12 a7 7 0 0 1 -12 5 l-2 -2 M17 4 v5 h-5 M7 20 v-5 h5",
  };

  function boardPanel() {
    const w = data().weather;
    const board = BOARDS.find(b => b.id === state.board);
    const list = data().boards[state.board];
    const stats = [
      ["seeds", "种下", w.seeds],
      ["sprouts", "发芽", w.sprouts],
      ["blooms", "开花", w.blooms],
      ["reseeds", "再种", w.reseeds],
    ];
    return `
      <div class="rank-weather" role="list" aria-label="本周校园行动气象">
        ${stats.map(([key, label, value]) => `<div class="rank-stat" role="listitem"><svg class="rank-stat-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${STAT_ICONS[key]}"/></svg><b class="rank-num" data-count="${value}">0</b><small>${label}</small></div>`).join("")}
      </div>
      <nav class="rank-tabs" aria-label="榜单切换">
        <span class="rank-tab-pill" aria-hidden="true"></span>
        ${BOARDS.map(b => `<button class="rank-tab ${b.id === state.board ? "active" : ""}" data-rank-board="${b.id}">${b.label}</button>`).join("")}
      </nav>
      <p class="rank-board-noun">${esc(board.noun)} · 只排种子，不排名任何人</p>
      <div class="rank-board" data-board="${state.board}">
        ${podium(list.slice(0, 3), board)}
        <ol class="rank-list" start="4">
          ${list.slice(3).map((item, i) => rowHtml(item, i + 4, board)).join("")}
        </ol>
      </div>
      <footer class="rank-footer">榜单只统计种子与行动地点 · 投票来自同学社区，花匠只整理不投票</footer>`;
  }

  // 手绘奖章（内联 SVG，避免奖杯 emoji 跨端渲染不一致）
  function medalSvg(place) {
    const tone = place === 1
      ? { main: "#e2ae4f", dark: "#a8782b", ribbon: "#df6434" }
      : place === 2
        ? { main: "#c9c2b0", dark: "#8f8874", ribbon: "#8fa05a" }
        : { main: "#c99e63", dark: "#96682a", ribbon: "#b98c50" };
    return `<svg viewBox="0 0 24 30" aria-hidden="true">
      <path d="M8.6 15.5 6.2 27l5.8-3.4 5.8 3.4-2.4-11.5" fill="${tone.ribbon}" stroke="${tone.dark}" stroke-width="1.2" stroke-linejoin="round"/>
      <circle cx="12" cy="10" r="8" fill="${tone.main}" stroke="${tone.dark}" stroke-width="1.5"/>
      <circle cx="12" cy="10" r="5.4" fill="none" stroke="rgba(255,251,232,.75)" stroke-width="1.1" stroke-dasharray="2.4 2"/>
      <text x="12" y="13.4" text-anchor="middle" font-size="9.5" font-weight="800" fill="#fffbe8">${place}</text>
    </svg>`;
  }

  function podium(top3, board) {
    const order = [top3[1], top3[0], top3[2]]; // 视觉顺序：2 1 3
    const places = [2, 1, 3];
    return `<div class="rank-podium" role="list" aria-label="前三名">
      ${order.map((item, i) => {
        if (!item) return "";
        const place = places[i];
        const spot = spotById(item.spot);
        const value = item[board.metric];
        return `<button class="rank-podium-item place-${place}" role="listitem" data-rank-celebrate="${place}" data-spot-ref="${esc(item.spot)}">
          <span class="rank-podium-medal">${medalSvg(place)}</span>
          <img class="rank-podium-flower" src="assets/${TONE_ASSET[spot?.tone] || "flower-3.png"}" alt="">
          <span class="rank-podium-pot"></span>
          <strong>${esc(item.title)}</strong>
          <b><i class="rank-num" data-count="${value}">0</i> ${board.unit}</b>
          <small>${esc(spot?.name || "")}</small>
        </button>`;
      }).join("")}
      <span class="rank-podium-shelf" aria-hidden="true"></span>
    </div>`;
  }

  function rowHtml(item, rank, board) {
    const spot = spotById(item.spot);
    const value = item[board.metric];
    const delta = item.delta;
    const deltaHtml = delta === undefined ? "" :
      delta > 0 ? `<i class="rank-delta up" title="较上周上升">▲${delta}</i>` :
      delta < 0 ? `<i class="rank-delta down" title="较上周下降">▼${-delta}</i>` :
      `<i class="rank-delta flat">—</i>`;
    const sub = item.note ? `<p class="rank-row-note">${esc(item.note)}</p>` :
      item.quote ? `<p class="rank-row-quote">「${esc(item.quote)}」</p>` : "";
    return `<li class="rank-row" style="--i:${rank - 4}">
      <span class="rank-no">${rank}</span>
      <div class="rank-row-main">
        <h3>${esc(item.title)}</h3>
        ${sub}
        <button class="rank-spot-chip" data-rank-spot="${esc(item.spot)}" aria-label="在地图上查看${esc(spot?.name || "")}"><svg class="rk-pin" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.2-5.4-6.2-10.2a6.2 6.2 0 0 1 12.4 0C18.2 15.6 12 21 12 21Z" fill="#df6434" stroke="#a34424" stroke-width="1.4" stroke-linejoin="round"/><circle cx="12" cy="10.6" r="2.2" fill="#fff7e6"/></svg>${esc(spot?.name || "")}</button>
      </div>
      <div class="rank-row-side"><b><i class="rank-num" data-count="${value}">0</i></b><small>${board.unit}</small>${deltaHtml}</div>
    </li>`;
  }

  function spotPanel() {
    const spot = spotById(state.spot);
    if (!spot) return boardPanel();
    const related = [];
    for (const b of BOARDS) {
      for (const item of data().boards[b.id]) {
        if (item.spot === spot.id && !related.some(r => r.title === item.title)) related.push({ ...item, board: b });
      }
    }
    related.sort((a, b) => (b.count || b.votes || 0) - (a.count || a.votes || 0));
    const bloomRate = Math.round((spot.blooms / spot.seeds) * 100);
    return `
      <div class="rank-spot-panel">
        <header class="rank-spot-head">
          <img src="assets/${TONE_ASSET[spot.tone] || "flower-3.png"}" alt="">
          <div><small>${esc(spot.kind)} · ${esc(spot.vibe)}</small><h2>${esc(spot.name)}</h2></div>
          <button class="rank-spot-close" data-rank-close aria-label="返回榜单">×</button>
        </header>
        <div class="rank-spot-stats">
          <div><b class="rank-num" data-count="${spot.seeds}">0</b><small>种下的种子</small></div>
          <div><b class="rank-num" data-count="${spot.blooms}">0</b><small>开出的花</small></div>
          <div class="rank-ring" style="--p:${bloomRate}"><svg viewBox="0 0 44 44"><circle class="bg" cx="22" cy="22" r="18"/><circle class="fg" cx="22" cy="22" r="18" pathLength="100"/></svg><b>${bloomRate}%</b><small>开花率</small></div>
        </div>
        <p class="rank-spot-top">这里最常发生：<b>${esc(spot.topAction)}</b></p>
        <div class="rank-spot-seeds">
          ${related.slice(0, 3).map(item => `<article class="rank-spot-seed"><span class="rank-seed-dot"></span><div><h4>${esc(item.title)}</h4><small>${esc(item.board.label)} · ${item.count || item.votes} ${item.board.unit}</small></div></article>`).join("")}
        </div>
        <button class="primary full rank-plant-cta" data-rank-plant="${esc(spot.topAction)}">在这里种一颗同款种子</button>
        <button class="rank-back-board" data-rank-close>‹ 回到全部榜单</button>
      </div>`;
  }

  /* ---------------- 挂载与交互 ---------------- */
  function mount() {
    const host = document.getElementById("rank-map-host");
    if (!host) { flyToken++; return; }
    if (!window.CampusMap || !window.RankData) return;

    const svg = buildMap();
    if (svg.parentElement !== host) {
      host.appendChild(svg);
      if (!panzoomInstance && window.panzoom) {
        panzoomInstance = window.panzoom(svg, {
          maxZoom: 4, minZoom: 0.3, bounds: true, boundsPadding: 0.32,
          zoomDoubleClickSpeed: 2.4, smoothScroll: true,
          beforeMouseDown: e => e.target.closest(".rank-marker") ? true : false,
          onTouch: e => !e.target.closest(".rank-marker"),
        });
        panzoomInstance.on("transform", syncMarkerZoom);
        fitCampus(false);
        syncMarkerZoom();
      }
    }
    syncMarkerActive();
    if (!state.entered) { state.entered = true; playEntrance(); }
    else finalizeEntrance(); // SVG 被 render() 挪动会冻结进行中的动画，重挂载时直接恢复终态
    playCounters();
    animateTabPill();
  }

  // 把入场动画涉及的图层全部落到终态（清内联样式，回到属性/CSS 默认值）
  function finalizeEntrance() {
    if (!mapSvg) return;
    for (const sel of [".rk-ground", ".rk-paths", ".rk-labels"]) {
      const layer = mapSvg.querySelector(sel);
      if (layer) { layer.style.opacity = ""; layer.getAnimations?.().forEach(a => a.finish?.()); }
    }
    mapSvg.querySelectorAll(".rk-road").forEach(path => {
      path.style.strokeDasharray = ""; path.style.strokeDashoffset = ""; path.style.transition = "";
    });
    mapSvg.querySelectorAll(".rank-marker .rk-marker-inner").forEach(inner => {
      const t = inner.getAttribute("transform") || "";
      if (t.includes("scale(0)")) inner.setAttribute("transform", t.replace(/ scale\(0\)$/, ""));
    });
  }

  // 标记反向补偿缩放：地图放大时名牌/花朵不至于巨大，缩小时也不至于看不见
  function syncMarkerZoom() {
    if (!markerLayer || !panzoomInstance) return;
    const zoom = panzoomInstance.getTransform().scale || 1;
    const k = Math.min(1.25, Math.max(0.45, 1 / zoom));
    for (const marker of markerLayer.querySelectorAll(".rank-marker")) {
      marker.setAttribute("transform", `translate(${marker.dataset.ax} ${marker.dataset.ay}) scale(${k.toFixed(3)})`);
    }
    // 底图楼名同步反向补偿字号（锚点不动，只缩字），放大后不至于满屏巨字
    const labelK = Math.min(1, Math.max(0.5, 1 / zoom));
    mapSvg?.style.setProperty("--label-size", `${(12.5 * labelK).toFixed(1)}px`);
  }

  function stageSize() {
    const stage = document.querySelector(".rank-map-stage");
    return stage ? [stage.clientWidth, stage.clientHeight] : [390, 700];
  }

  // 让某个地图坐标出现在舞台指定位置（含平滑飞行）
  function flyTo(mapX, mapY, zoom, { smooth = true, anchorY = 0.42 } = {}) {
    if (!panzoomInstance) return;
    const [cw, ch] = stageSize();
    const targetX = cw / 2 - mapX * zoom;
    const targetY = ch * anchorY - mapY * zoom;
    const from = panzoomInstance.getTransform();
    if (!smooth || reduceMotion) {
      panzoomInstance.zoomAbs(0, 0, zoom);
      panzoomInstance.moveTo(targetX, targetY);
      return;
    }
    const token = ++flyToken;
    const start = performance.now();
    const dur = 620;
    const ease = t => 1 - Math.pow(1 - t, 3);
    const sx = from.x, sy = from.y, ss = from.scale;
    const step = now => {
      if (token !== flyToken) return;
      const t = Math.min(1, (now - start) / dur);
      const k = ease(t);
      const s = ss + (zoom - ss) * k;
      panzoomInstance.zoomAbs(0, 0, s);
      panzoomInstance.moveTo(sx + (targetX - sx) * k, sy + (targetY - sy) * k);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // 抽屉上方还露出的地图窗口占整屏的比例
  function visibleRatio() { return 1 - (SHEET_RATIO[state.sheet] ?? 0.52); }

  function fitCampus(smooth = true) {
    const [, , vw, vh] = mapData().viewBox;
    const [cw, ch] = stageSize();
    const zoom = (cw / vw) * 1.02;               // 贴住宽度：整幅校园横向都在画面里
    const anchorY = visibleRatio() * 0.5;        // 校园核心落在抽屉上方窗口的中央
    flyTo(vw / 2, vh * 0.46, zoom, { smooth, anchorY });
  }

  function focusSpot(id, { fly = true } = {}) {
    state.spot = id;
    state.sheet = "half";
    if (!state.hintDone) { state.hintDone = true; try { localStorage.setItem(HINT_KEY, "1"); } catch {} }
    rerenderLocal();
    const anchor = mapData().spotAnchors[id];
    if (fly && anchor) {
      const [cw] = stageSize();
      const zoom = Math.max(1.9, (cw / mapData().viewBox[2]) * 2.6);
      flyTo(anchor[0], anchor[1] - 14, zoom, { anchorY: visibleRatio() * 0.46 });
    }
    syncMarkerActive();
    burstAtSpot(id);
  }

  function closeSpot() {
    state.spot = null;
    rerenderLocal();
    syncMarkerActive();
    fitCampus();
  }

  // 局部重渲染：只更新 sheet 与页面 data 属性，不动地图 DOM
  function rerenderLocal() {
    const screen = document.querySelector(".rank-screen");
    const body = document.getElementById("rank-sheet-body");
    const sheet = document.getElementById("rank-sheet");
    if (!screen || !body || !sheet) return;
    screen.dataset.mode = state.spot ? "spot" : "board";
    screen.dataset.sheet = state.sheet;
    sheet.dataset.state = state.sheet;
    body.innerHTML = state.spot ? spotPanel() : boardPanel();
    document.querySelector(".rank-hint")?.remove();
    playCounters();
    animateTabPill();
    animateRows();
  }

  function syncMarkerActive() {
    if (!markerLayer) return;
    for (const marker of markerLayer.querySelectorAll(".rank-marker")) {
      const isActive = marker.dataset.rankSpot === state.spot;
      marker.classList.toggle("active", isActive);
      const ringHost = marker.querySelector(".rk-rough-ring");
      ringHost.innerHTML = "";
      if (isActive && window.rough) {
        const rc = window.rough.svg(mapSvg);
        const node = rc.circle(0, -18, 92, { stroke: "#a9753d", strokeWidth: 2.6, roughness: 1.6, seed: 11, fill: "none" });
        node.classList.add("rk-ring-path");
        ringHost.appendChild(node);
      }
      if (isActive) marker.parentElement.appendChild(marker); // 提到最上层
    }
  }

  /* ---------------- 动效 ---------------- */
  function playEntrance() {
    if (!mapSvg) return;
    if (reduceMotion) return;
    const M = window.Motion;
    // 地面层淡入
    M?.animate(mapSvg.querySelector(".rk-ground"), { opacity: [0, 1] }, { duration: 0.7, ease: "easeOut" });
    // 主路描线
    mapSvg.querySelectorAll(".rk-road").forEach((path, i) => {
      const len = path.getTotalLength();
      path.style.strokeDasharray = String(len);
      path.style.strokeDashoffset = String(len);
      path.style.transition = `stroke-dashoffset .9s ${0.15 + Math.min(i * 0.012, 0.5)}s ease-out`;
      requestAnimationFrame(() => { path.style.strokeDashoffset = "0"; });
      setTimeout(() => { path.style.strokeDasharray = ""; path.style.strokeDashoffset = ""; path.style.transition = ""; }, 1900);
    });
    // 楼名、虚线小径晚一点淡入
    M?.animate(mapSvg.querySelector(".rk-paths"), { opacity: [0, 1] }, { duration: 0.8, delay: 0.7 });
    M?.animate(mapSvg.querySelector(".rk-labels"), { opacity: [0, 1] }, { duration: 0.8, delay: 0.9 });
    // 标记弹簧入场
    const markers = [...mapSvg.querySelectorAll(".rank-marker .rk-marker-inner")];
    markers.forEach((marker, i) => {
      const base = marker.getAttribute("transform");
      marker.setAttribute("transform", `${base} scale(0)`);
      setTimeout(() => {
        marker.setAttribute("transform", base);
        marker.classList.add("rk-pop");
      }, 650 + i * 90);
    });
    setTimeout(finalizeEntrance, 700 + markers.length * 90 + 900); // 双保险：无论动画是否被打断都落到终态
    // 入场看完全景后，抽屉自动升起来引导看榜单（用户已自己动过就不打扰）
    setTimeout(() => { if (state.sheet === "peek" && !state.sheetTouched) setSheet("half"); }, 2400);
  }

  // 统一的抽屉状态切换（同步 DOM 三处属性）
  function setSheet(next) {
    state.sheet = next;
    document.querySelector(".rank-screen")?.setAttribute("data-sheet", next);
    document.getElementById("rank-sheet")?.setAttribute("data-state", next);
  }

  function playCounters() {
    const root = document.getElementById("rank-sheet-body");
    if (!root) return;
    const key = state.spot ? `spot:${state.spot}` : `board:${state.board}`;
    const replay = !state.playedBoards.has(key);
    state.playedBoards.add(key);
    root.querySelectorAll(".rank-num").forEach((el, i) => {
      const target = Number(el.dataset.count || 0);
      if (!replay || reduceMotion || !window.countUp) { el.textContent = String(target); return; }
      const counter = new window.countUp.CountUp(el, target, { duration: 1.15 + Math.min(i * 0.08, 0.5), useGrouping: false });
      if (!counter.error) counter.start(); else el.textContent = String(target);
    });
  }

  function animateTabPill() {
    const nav = document.querySelector(".rank-tabs");
    const pill = document.querySelector(".rank-tab-pill");
    const active = document.querySelector(".rank-tab.active");
    if (!nav || !pill || !active) return;
    const nb = nav.getBoundingClientRect();
    const ab = active.getBoundingClientRect();
    pill.style.width = `${ab.width}px`;
    pill.style.transform = `translateX(${ab.left - nb.left}px)`;
  }

  function animateRows() {
    if (reduceMotion) return;
    const M = window.Motion;
    const rows = document.querySelectorAll(".rank-row, .rank-podium-item, .rank-spot-seed");
    if (M && rows.length) M.animate(rows, { opacity: [0, 1], y: [14, 0] }, { delay: M.stagger(0.045), duration: 0.4, ease: [0.22, 0.9, 0.3, 1] });
  }

  let petalShapes = null;
  function petals() {
    if (!window.confetti) return null;
    if (!petalShapes) {
      try { petalShapes = ["🌸", "🌼", "🍃"].map(t => window.confetti.shapeFromText({ text: t, scalar: 1.6 })); }
      catch { petalShapes = []; }
    }
    return petalShapes.length ? petalShapes : null;
  }

  function burst(x, y, count = 16) {
    if (reduceMotion || !window.confetti) return;
    const shapes = petals();
    window.confetti({
      particleCount: count, spread: 62, startVelocity: 18, gravity: 0.55, ticks: 130,
      origin: { x, y }, scalar: shapes ? 1.5 : 0.8, shapes: shapes || undefined,
      colors: shapes ? undefined : ["#D98A9E", "#D89A43", "#89974B", "#75BAD3"],
      disableForReducedMotion: true, zIndex: 200,
    });
  }

  function burstAtSpot(id) {
    const marker = markerLayer?.querySelector(`.rank-marker[data-rank-spot="${id}"]`);
    if (!marker) return;
    const rect = marker.getBoundingClientRect();
    burst((rect.left + rect.width / 2) / window.innerWidth, (rect.top + rect.height * 0.3) / window.innerHeight, 13);
  }

  /* ---------------- 底部抽屉拖拽 ---------------- */
  const SHEET_RATIO = { peek: 0.155, half: 0.52, full: 0.86 };
  let drag = null;

  function sheetHeightFor(stateName, phoneH) { return phoneH * SHEET_RATIO[stateName]; }

  function onGripDown(event) {
    const sheet = document.getElementById("rank-sheet");
    if (!sheet) return;
    const phone = sheet.closest(".phone") || document.body;
    drag = {
      sheet, phoneH: phone.clientHeight,
      startY: event.clientY, startH: sheet.getBoundingClientRect().height,
      moved: false, lastY: event.clientY, lastT: performance.now(), velocity: 0,
    };
    sheet.classList.add("dragging");
    window.addEventListener("pointermove", onGripMove);
    window.addEventListener("pointerup", onGripUp, { once: true });
  }

  function onGripMove(event) {
    if (!drag) return;
    const dy = drag.startY - event.clientY;
    if (Math.abs(dy) > 4) drag.moved = true;
    const now = performance.now();
    drag.velocity = (drag.lastY - event.clientY) / Math.max(1, now - drag.lastT);
    drag.lastY = event.clientY; drag.lastT = now;
    const h = Math.min(drag.phoneH * 0.9, Math.max(drag.phoneH * 0.12, drag.startH + dy));
    drag.sheet.style.height = `${h}px`;
  }

  function onGripUp() {
    if (!drag) return;
    window.removeEventListener("pointermove", onGripMove);
    const { sheet, phoneH, velocity, moved } = drag;
    const h = sheet.getBoundingClientRect().height;
    sheet.classList.remove("dragging");
    sheet.style.height = "";
    let next;
    if (!moved) {
      next = state.sheet === "peek" ? "half" : state.sheet === "half" ? "full" : "half"; // 点按循环
    } else if (Math.abs(velocity) > 0.55) {
      next = velocity > 0 ? (state.sheet === "peek" ? "half" : "full") : (state.sheet === "full" ? "half" : "peek");
    } else {
      const ratios = Object.entries(SHEET_RATIO);
      ratios.sort((a, b) => Math.abs(h / phoneH - a[1]) - Math.abs(h / phoneH - b[1]));
      next = ratios[0][0];
    }
    drag = null;
    state.sheet = next;
    const screen = document.querySelector(".rank-screen");
    if (screen) screen.dataset.sheet = next;
    document.getElementById("rank-sheet")?.setAttribute("data-state", next);
  }

  /* ---------------- 事件（独立于 prototype.js 的委托） ----------------
     本脚本先于 prototype.js（module）加载，监听器先注册；对榜单内部控件
     调用 stopImmediatePropagation，避免 prototype.js 的历史 rank 处理器重复响应。
     data-rank-plant / data-action 保持冒泡，交给 prototype.js 处理。 */
  document.addEventListener("click", event => {
    if (!document.querySelector(".rank-screen")) return;
    const stop = () => event.stopImmediatePropagation();
    if (event.target.closest("[data-rank-plant], [data-action]")) return; // 交给 prototype.js
    const spotTrigger = event.target.closest("[data-rank-spot]");
    if (spotTrigger) { stop(); focusSpot(spotTrigger.dataset.rankSpot); return; }
    if (event.target.closest("[data-rank-close]")) { stop(); closeSpot(); return; }
    if (event.target.closest("[data-rank-reset]")) { stop(); state.spot = null; rerenderLocal(); syncMarkerActive(); fitCampus(); return; }
    const boardBtn = event.target.closest("[data-rank-board]");
    if (boardBtn) {
      stop();
      if (boardBtn.dataset.rankBoard !== state.board) { state.board = boardBtn.dataset.rankBoard; rerenderLocal(); }
      return;
    }
    const celebrate = event.target.closest("[data-rank-celebrate]");
    if (celebrate) {
      stop();
      const rect = celebrate.getBoundingClientRect();
      burst((rect.left + rect.width / 2) / window.innerWidth, rect.top / window.innerHeight, celebrate.dataset.rankCelebrate === "1" ? 26 : 14);
      const ref = celebrate.dataset.spotRef;
      if (ref) setTimeout(() => focusSpot(ref), 350);
      return;
    }
    // 点地图空白处：收起地点卡，收抽屉到 peek
    if (event.target.closest(".rank-map-host") && !event.target.closest(".rank-marker")) {
      if (state.sheet !== "peek") {
        state.sheet = "peek";
        document.querySelector(".rank-screen")?.setAttribute("data-sheet", "peek");
        document.getElementById("rank-sheet")?.setAttribute("data-state", "peek");
      }
    }
  });

  document.addEventListener("pointerdown", event => {
    if (!document.querySelector(".rank-screen")) return;
    if (event.target.closest("[data-rank-grip]")) onGripDown(event);
  });

  document.addEventListener("keydown", event => {
    if (!document.querySelector(".rank-screen")) return;
    if (event.key === "Enter" && event.target.classList?.contains("rank-marker")) focusSpot(event.target.dataset.rankSpot);
    if (event.key === "Escape" && state.spot) closeSpot();
  });

  // 对外接口：兼容 prototype.js 已有的 RankPage 接线（markup/mount/state）
  const api = { state, page, markup: page, mount };
  window.CampusRank = api;
  window.RankPage = api;
})();
