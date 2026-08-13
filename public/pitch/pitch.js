/* ============================================================
   花托邦 路演引擎 · 温暖白日花园版
   GSAP 电影编排 / 键盘逐拍 / 手机自动 demo / 真实地图生长
   ============================================================ */
(function () {
  "use strict";
  gsap.registerPlugin(SplitText, DrawSVGPlugin, Flip, CustomEase);
  CustomEase.create("soft", "M0,0 C0.22,0.61 0.36,1 1,1");
  CustomEase.create("pop", "M0,0 C0.34,1.36 0.64,1 1,1");
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var stage = $("#stage"), pages = $$(".page"), N = pages.length;
  var reduced = matchMedia("(prefers-reduced-motion:reduce)").matches;

  /* ---------- 舞台 letterbox（确定性居中） ---------- */
  function fit() {
    var vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    var s = Math.min(vw / 1920, vh / 1080);
    gsap.set(stage, { x: (vw - 1920 * s) / 2, y: (vh - 1080 * s) / 2, scale: s, transformOrigin: "0 0" });
  }
  addEventListener("resize", fit); fit();

  /* ---------- 氛围粒子（花粉金尘 + 花瓣，亮底适配） ---------- */
  (function ambient() {
    var cv = $("#ambient"); if (!cv || reduced) return;
    var ctx = cv.getContext("2d"), W = 1920, H = 1080, ps = [];
    var petalCol = ["209,100,135", "217,123,79", "143,108,201", "78,145,97", "63,143,160"];
    for (var i = 0; i < 30; i++) ps.push(dust());
    for (var j = 0; j < 22; j++) ps.push(petal());
    function dust() { return { t: 0, x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2.2 + 1, vx: (Math.random() - .5) * .2, vy: (Math.random() - .5) * .2, p: Math.random() * 6.28, ps: .008 + Math.random() * .02 }; }
    function petal() { return { t: 1, x: Math.random() * W, y: Math.random() * H, s: Math.random() * 8 + 6, vy: Math.random() * .5 + .26, vx: (Math.random() - .5) * .4, rot: Math.random() * 6.28, vr: (Math.random() - .5) * .03, sway: Math.random() * 6.28, sw: .01 + Math.random() * .02, a: Math.random() * .22 + .16, col: petalCol[(Math.random() * petalCol.length) | 0] }; }
    (function tick() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < ps.length; i++) {
        var f = ps[i];
        if (f.t === 0) {
          f.x += f.vx; f.y += f.vy; f.p += f.ps;
          if (f.x < 0) f.x = W; if (f.x > W) f.x = 0; if (f.y < 0) f.y = H; if (f.y > H) f.y = 0;
          var a = (Math.sin(f.p) * .5 + .5) * .4 + .06;
          ctx.fillStyle = "rgba(169,118,27," + a + ")";
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.28); ctx.fill();
        } else {
          f.sway += f.sw; f.y += f.vy; f.x += f.vx + Math.sin(f.sway) * .5; f.rot += f.vr;
          if (f.y > H + 24) { f.y = -24; f.x = Math.random() * W; }
          ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot);
          ctx.fillStyle = "rgba(" + f.col + "," + f.a + ")";
          ctx.beginPath(); ctx.ellipse(0, 0, f.s * .5, f.s, 0, 0, 6.28); ctx.fill(); ctx.restore();
        }
      }
      requestAnimationFrame(tick);
    })();
  })();

  /* ---------- SplitText ---------- */
  var splits = new Map();
  function ensureSplit(el) {
    if (splits.has(el)) return splits.get(el);
    var mode = el.getAttribute("data-split");
    var sp = SplitText.create(el, mode === "chars"
      ? { type: "lines,chars", mask: "lines", linesClass: "sl", charsClass: "schar" }
      : { type: "lines", mask: "lines", linesClass: "sl" });
    var out = { targets: mode === "chars" ? sp.chars : sp.lines, sp: sp };
    splits.set(el, out); return out;
  }
  function splitIn(tl, el, opts) {
    opts = opts || {};
    var s = ensureSplit(el);
    tl.from(s.targets, {
      yPercent: 118, opacity: opts.fade === false ? 1 : 0.001,
      duration: opts.dur || 0.9, ease: "soft",
      stagger: opts.stagger != null ? opts.stagger : (el.getAttribute("data-split") === "chars" ? 0.035 : 0.14)
    }, opts.at != null ? opts.at : ">-0.55");
    return tl;
  }

  /* ---------- 打字机 ---------- */
  function typeInto(tl, el, text, cps, at) {
    tl.add(function () { el.innerHTML = '<span class="tt"></span><span class="pcursor"></span>'; }, at != null ? at : ">");
    var obj = { p: 0 };
    tl.to(obj, {
      p: 1, duration: Math.max(.4, text.length / (cps || 16)), ease: "none",
      onUpdate: function () {
        var t = el.querySelector(".tt");
        if (t) t.textContent = text.slice(0, Math.round(obj.p * text.length));
      },
      onComplete: function () { var c = el.querySelector(".pcursor"); if (c) c.remove(); }
    }, "<");
  }

  /* ---------- 常驻主角 FLIP ---------- */
  var hero = $("#hero");
  function heroTo(anchorName, opts) {
    var a = $('[data-anchor="' + anchorName + '"]'); if (!a) return;
    opts = opts || {};
    try {
      var st = opts.instant ? null : Flip.getState(hero);
      var r = a.getBoundingClientRect(), sr = stage.getBoundingClientRect();
      var sc = sr.width / 1920;
      gsap.set(hero, { x: (r.left - sr.left) / sc, y: (r.top - sr.top) / sc, width: r.width / sc, opacity: opts.opacity != null ? opts.opacity : 1 });
      if (st) Flip.from(st, { duration: opts.dur || 1.1, ease: "soft", scale: false });
    } catch (e) { }
  }
  function heroHide(d) { gsap.to(hero, { opacity: 0, duration: d || 0.4, ease: "soft" }); }

  /* ---------- 花瓣 confetti ---------- */
  var petalShape = null;
  try { petalShape = confetti.shapeFromPath({ path: "M0 6 C0 2 4 0 6 3 C8 0 12 2 12 6 C12 10 6 14 6 14 C6 14 0 10 0 6 Z" }); } catch (e) { }
  function petalBurst(el, big) {
    if (reduced) return;
    var r = el ? el.getBoundingClientRect() : null;
    var o = r ? { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight } : { x: .5, y: .45 };
    var base = { spread: 75, startVelocity: 22, gravity: 0.5, drift: 0.8, decay: 0.94, scalar: 1.5, ticks: 380, origin: o, colors: ["#d16487", "#d97b4f", "#c8871e", "#8f6cc9", "#4e9161", "#3f8fa0"] };
    if (petalShape) base.shapes = [petalShape];
    confetti(Object.assign({ particleCount: big ? 46 : 26 }, base));
    setTimeout(function () { confetti(Object.assign({ particleCount: big ? 26 : 14, startVelocity: 14, spread: 110 }, base)); }, 260);
  }
  var rainTimer = null;
  function petalRain(on) {
    if (rainTimer) { clearInterval(rainTimer); rainTimer = null; }
    if (!on || reduced) return;
    rainTimer = setInterval(function () {
      var b = { particleCount: 2, spread: 40, startVelocity: 8, gravity: 0.45, drift: 0.6, decay: 0.96, scalar: 1.4, ticks: 420, origin: { x: Math.random(), y: -0.05 }, colors: ["#d16487", "#c8871e", "#8f6cc9", "#4e9161"] };
      if (petalShape) b.shapes = [petalShape];
      confetti(b);
    }, 240);
  }

  /* ---------- 相机（明亮机位） ---------- */
  var KB = [
    { s: 1.18, x: -40, y: -60, op: .6 },
    { s: 1.05, x: 0, y: 0, op: .5 },
    { s: 1.1, x: 30, y: -20, op: .55 },
    { s: 1.06, x: 0, y: 10, op: .45 },
    { s: 1.06, x: 0, y: 10, op: .5 },
    { s: 1.12, x: -30, y: 30, op: .55 },
    { s: 1.04, x: 0, y: 0, op: .12 },
    { s: 1.2, x: 20, y: -40, op: .6 }
  ];
  var GRADE = ["#ffd98f", "#f2e4c8", "#f4e3bd", "#f2e4c8", "#f4e6c6", "#efe4c9", "#f3ecd9", "#ffd98f"];
  function camera(i) {
    var k = KB[i] || KB[1];
    gsap.to("#kb", { scale: k.s, x: k.x, y: k.y, duration: 2.4, ease: "power1.out" });
    gsap.to("#kb", { opacity: k.op, duration: 1.2, ease: "soft" });
    gsap.to("#grade", { backgroundColor: GRADE[i] || GRADE[1], duration: 1.4, ease: "soft" });
  }

  /* ============================================================
     P4 · 手机自动 demo 场景（录制感）
     ============================================================ */
  var sceneTl = null;
  function killScene() { if (sceneTl) { sceneTl.kill(); sceneTl = null; } }
  var AV_ME = "../world/assets/pet-actions/pet-talk.png";
  var AV_PEER = "../world/assets/pet-actions/pet-mail.png";
  function sceneRoot(top1, top2) {
    var root = $("#phoneScene");
    root.innerHTML = '<div class="ptop"><small>' + top1 + '</small><strong>' + top2 + '</strong></div><div class="pbody"></div>';
    return root;
  }
  function msgEl(body, cls, who) {
    var d = document.createElement("div"); d.className = "pmsg " + cls;
    d.innerHTML = (who ? '<span class="who">' + who + "</span>" : "") + '<span class="mtxt"></span>';
    body.appendChild(d); return d;
  }
  function msgIn(tl, d, at) { tl.to(d, { opacity: 1, y: 0, duration: .45, ease: "pop" }, at != null ? at : ">"); tl.from(d, { y: 18 }, "<"); }

  var SCENES = {
    seed: function () {
      var root = sceneRoot("和小花匠聊聊", "种下一件想做的事");
      var body = $(".pbody", root);
      var m1 = msgEl(body, "me"); $(".mtxt", m1).textContent = "想去西湖夜骑！";
      var m2 = msgEl(body, "ai", '小花匠 · 你的个人 Agent');
      var opts = ["自带齐全装备", "可共享临时装备", "需要帮忙准备装备"].map(function (t) {
        var o = document.createElement("div"); o.className = "popt"; o.innerHTML = t + "<i>›</i>"; body.appendChild(o); return o;
      });
      root.insertAdjacentHTML("beforeend", '<div class="pinput">用一句话告诉小花匠…<span class="send">发送</span></div>');
      var tl = gsap.timeline();
      msgIn(tl, m1, .3);
      msgIn(tl, m2, ">+.25");
      typeInto(tl, $(".mtxt", m2), "好耶！这次西湖夜骑，你有骑行装备吗？", 14, ">-.1");
      opts.forEach(function (o, i) { tl.to(o, { opacity: 1, y: 0, duration: .4, ease: "pop" }, ">" + (i ? "-.15" : "+.15")); tl.from(o, { y: 16 }, "<"); });
      tl.add(function () { opts[0].classList.add("sel"); opts[0].querySelector("i").textContent = "✓"; }, "+=.5");
      return tl;
    },
    a2a: function () {
      var root = sceneRoot("Agent ↔ Agent · 全程明确标注", "两只小花匠在预热");
      var body = $(".pbody", root);
      body.innerHTML = '<div class="a2a-stage">' +
        '<div class="a2a-pair"><div class="a2a-av"><img src="' + AV_ME + '"></div>' +
        '<div class="a2a-link"><span class="pulse"></span></div>' +
        '<div class="a2a-av"><img src="' + AV_PEER + '"></div></div>' +
        '<div class="a2a-tag">A2A WARM-UP</div><div class="msgs"></div>' +
        '<div class="a2a-ok">合拍！种子已送进对方信箱</div></div>';
      var msgs = $(".msgs", body); msgs.style.cssText = "display:flex;flex-direction:column;gap:10px;width:100%;padding:0 8px";
      var lines = [
        ["ai", "我的小花匠", "她周四晚上有空，时间对得上。"],
        ["peer", "对方的小花匠", "他有辆公路车，装备可以共享。"],
        ["ai", "我的小花匠", "都想沿湖拍照——很合拍。"]
      ];
      var tl = gsap.timeline();
      tl.from($$(".a2a-av", body), { opacity: 0, scale: .5, duration: .6, ease: "pop", stagger: .15 }, .2);
      tl.from($(".a2a-link", body), { opacity: 0, scaleX: 0, duration: .5 }, ">-.2");
      var pulse = $(".pulse", body);
      tl.add(function () { gsap.fromTo(pulse, { left: "0%" }, { left: "100%", duration: .9, repeat: -1, yoyo: true, ease: "sine.inOut" }); }, "<");
      lines.forEach(function (L) {
        var d = msgEl(msgs, L[0] === "ai" ? "ai" : "peer", L[1]);
        msgIn(tl, d, ">+.15");
        typeInto(tl, $(".mtxt", d), L[2], 18, ">-.05");
      });
      tl.to($(".a2a-ok", body), { opacity: 1, scale: 1, duration: .5, ease: "pop" }, ">+.2");
      tl.from($(".a2a-ok", body), { scale: .7 }, "<");
      return tl;
    },
    chat: function () {
      var root = sceneRoot("西湖夜骑 · 行动房间", "真人对话 · AI 只轻推");
      var body = $(".pbody", root);
      root.insertAdjacentHTML("beforeend", '<div class="pinput">发消息，一起把行动定下来…<span class="send">发送</span></div>');
      var m1 = msgEl(body, "peer", "陈野");
      var m2 = msgEl(body, "me");
      var m3 = msgEl(body, "ai", '<b>小苗</b> · 事件 AI · 只在需要时出现');
      var tl = gsap.timeline();
      msgIn(tl, m1, .3); typeInto(tl, $(".mtxt", m1), "周四下午四点半，学校西门集合？", 16, ">-.05");
      msgIn(tl, m2, ">+.3"); typeInto(tl, $(".mtxt", m2), "可以！我带打气筒，顺路检查胎压", 16, ">-.05");
      msgIn(tl, m3, ">+.4"); typeInto(tl, $(".mtxt", m3), "你们聊到的时间地点，我可以整理成一份行动约定，需要吗？", 15, ">-.05");
      return tl;
    },
    pact: function () {
      var root = sceneRoot("西湖夜骑 · 行动房间", "小苗整理的行动约定");
      var body = $(".pbody", root);
      body.insertAdjacentHTML("beforeend",
        '<div class="pact"><h5>行动约定 · 双方确认</h5><div class="pt-title">西湖夜骑</div>' +
        '<div class="row"><span class="ok">✓</span>周四 16:30 出发</div>' +
        '<div class="row"><span class="ok">✓</span>学校西门集合</div>' +
        '<div class="row"><span class="ok">✓</span>打气筒 · 头盔 · 车灯</div>' +
        '<div class="confirm">确认这份行动约定（0/2）</div></div>');
      var pact = $(".pact", body), rows = $$(".row", body), cf = $(".confirm", body);
      var tl = gsap.timeline();
      tl.to(pact, { opacity: 1, y: 0, duration: .6, ease: "pop" }, .3);
      tl.from(pact, { y: 40, scale: .95 }, "<");
      rows.forEach(function (r) { tl.to(r, { opacity: 1, x: 0, duration: .4, ease: "soft" }, ">-.05"); tl.from(r, { x: -14 }, "<"); });
      tl.to(cf, { opacity: 1, duration: .4 }, ">+.2");
      tl.add(function () { cf.textContent = "确认这份行动约定（1/2）"; }, "+=.7");
      tl.add(function () { cf.textContent = "双方已确认 ✓（2/2）"; cf.style.background = "#4e9161"; }, "+=.8");
      return tl;
    },
    bloom: function () {
      var root = sceneRoot("把真实发生的事留住", "行动开花了");
      var body = $(".pbody", root);
      body.innerHTML = '<div class="bloomcard"><img class="bf" src="../world/assets/flower-4.png">' +
        '<div class="btxt">你们把一颗种子，养成了花</div><div class="bsub">西湖夜骑 · 双方打卡完成</div>' +
        '<div class="check">陈野 也确认了完成 ✓</div></div>';
      var tl = gsap.timeline();
      tl.from($(".bloomcard", body), { opacity: 0, duration: .4 }, .2);
      tl.from($(".bf", body), { scale: .25, rotate: -10, duration: .9, ease: "pop" }, ">-.1");
      tl.from($(".btxt, .bsub", body) ? $$(".btxt, .bsub", body) : [], { opacity: 0, y: 14, duration: .5, stagger: .12 }, ">-.2");
      tl.to($(".check", body), { opacity: 1, duration: .5, ease: "pop" }, ">+.2");
      tl.from($(".check", body), { scale: .8 }, "<");
      return tl;
    }
  };

  /* ============================================================
     各页时间线
     ============================================================ */
  var defs = [];

  /* ----- P1 封面 ----- */
  defs.push(function (pg) {
    return {
      enter: function (tl) {
        tl.set(hero, { opacity: 0 });
        tl.add(function () { heroTo("cover", { instant: true }); gsap.fromTo(hero, { y: "-=140", opacity: 0, scale: .5 }, { y: "+=140", opacity: 1, scale: 1, duration: 1.2, ease: "soft" }); }, 0.25);
        $$(".ring", pg).forEach(function (r, i) {
          tl.fromTo(r, { opacity: 0, scale: .4 }, { opacity: .55, scale: 1, duration: 1, ease: "soft" }, .3 + i * .18);
          gsap.to(r, { opacity: .15, scale: 1.24, duration: 2.6, delay: 1.4 + i * .5, repeat: -1, yoyo: true, ease: "sine.inOut" });
        });
        splitIn(tl, $(".h-giant", pg), { at: 0.55, stagger: 0.12, dur: 1.1 });
        splitIn(tl, $(".subline", pg), { at: ">-0.4" });
        tl.from($$('[data-el="fade"]', pg), { opacity: 0, y: 24, duration: .8, ease: "soft", stagger: .15 }, ">-0.3");
      },
      frags: [], leave: function () { }
    };
  });

  /* ----- P2 点 · 痛点（断桥按拍现画） ----- */
  defs.push(function (pg) {
    var bridgeSvg = $('[data-el="bridgesvg"]', pg);
    var nodes = $$(".bridge .node", pg), gapword = $(".gapword", pg);
    return {
      enter: function (tl) {
        heroHide();
        bridgeSvg.innerHTML = "";
        tl.set(nodes.concat([gapword]), { opacity: 0 }, 0);
        tl.from($(".eyebrow", pg), { opacity: 0, x: -30, duration: .7, ease: "soft" }, 0.1);
        splitIn(tl, $(".h-big", pg), { at: .25, stagger: .03, dur: 1 });
        splitIn(tl, $(".state", pg), { at: ">-0.3" });
      },
      frags: [function () {   // 讲到 gap 时按 → ：现场画断桥
        bridgeSvg.innerHTML = "";
        var rs = rough.svg(bridgeSvg);
        bridgeSvg.setAttribute("viewBox", "0 0 1660 190");
        var l1 = rs.line(360, 95, 760, 95, { stroke: "#3f8fa0", strokeWidth: 4, roughness: 2.2 });
        var l2 = rs.line(900, 95, 1300, 95, { stroke: "#4e9161", strokeWidth: 4, roughness: 2.2 });
        var x1 = rs.line(806, 72, 856, 118, { stroke: "#c95f3f", strokeWidth: 6, roughness: 1.6 });
        var x2 = rs.line(856, 72, 806, 118, { stroke: "#c95f3f", strokeWidth: 6, roughness: 1.6 });
        [l1, l2, x1, x2].forEach(function (n) { bridgeSvg.appendChild(n); });
        gsap.to(nodes, { opacity: 1, scale: 1, duration: .6, ease: "pop", stagger: .16 });
        gsap.from(nodes, { scale: .85 });
        gsap.fromTo($$("path", bridgeSvg), { drawSVG: "0%" }, { drawSVG: "100%", duration: .8, ease: "power2.out", stagger: .22, delay: .2 });
        gsap.to(gapword, { opacity: 1, y: 0, duration: .6, delay: .9 });
        gsap.from(gapword, { y: -14 });
      }],
      leave: function () { }
    };
  });

  /* ----- P3 起点=种子 ----- */
  defs.push(function (pg) {
    return {
      enter: function (tl) {
        tl.from($(".eyebrow", pg), { opacity: 0, x: -30, duration: .7, ease: "soft" }, 0.1);
        $$(".l", pg).forEach(function (el, i) { splitIn(tl, el, { at: .3 + i * .55 }); });
        tl.add(function () { heroTo("seedspot", { dur: 1.2 }); }, .5);
        var hint = $('[data-el="stemhint"] path', pg);
        tl.fromTo(hint, { drawSVG: "0%", opacity: 1 }, { drawSVG: "100%", duration: .9, ease: "power2.out" }, ">+0.2");
      },
      frags: [], leave: function () { }
    };
  });

  /* ----- P4 线 · 核心链路 ----- */
  defs.push(function (pg) {
    var tpl = $$("div", $("#stages").content), rail = $("#rail");
    var leaves = $$("[data-leaf]", pg);
    var burstTimer = null;
    tpl.forEach(function (t, i) {
      var d = document.createElement("div");
      d.className = "rn" + (i === 4 ? " b5" : "");
      d.innerHTML = '<span class="bar"></span><span class="dot"></span><span class="cn">' + t.dataset.cn + '</span><span class="en">' + t.dataset.en + "</span>";
      d.addEventListener("click", function (e) { e.stopPropagation(); setStage(i); });
      rail.appendChild(d);
    });
    var cur = -1;
    function setStage(i) {
      if (i === cur) return; cur = i;
      var t = tpl[i];
      pg.classList.toggle("bloomc", i === 4);
      $$(".rn", rail).forEach(function (n, k) { n.classList.toggle("done", k < i); n.classList.toggle("on", k === i); });
      $("#stgNo").textContent = "线 · 核心链路 · Stage " + (i + 1) + " / 5";
      var nm = $("#stgName"), en = $("#stgEn"), ds = $("#stgDesc"), ch = $("#stgChip");
      gsap.fromTo([nm, en, ds], { opacity: .1, y: 14 }, { opacity: 1, y: 0, duration: .55, ease: "soft", stagger: .05 });
      nm.textContent = t.dataset.cn; en.textContent = t.dataset.en; ds.innerHTML = t.dataset.desc;
      ch.innerHTML = t.dataset.chip ? '<span class="chip' + (t.dataset.warn ? " warn" : "") + '"><span class="tag">' + (t.dataset.chiptag || "") + "</span>" + t.dataset.chip + "</span>" : "";
      if (t.dataset.chip) gsap.from($(".chip", ch), { opacity: 0, scale: .9, duration: .5, ease: "pop", delay: .2 });
      // 手机场景切换（自动 demo）
      killScene();
      sceneTl = SCENES[t.dataset.scene]();
      // 植物生长
      var stem = $("#stemPath"), bud = $("#budPath"), seedc = $("#seedC"), bloom = $("#bloomImg");
      var stemPct = [0, 28, 58, 100, 100][i];
      gsap.to(stem, { drawSVG: "0% " + stemPct + "%", duration: .9, ease: "power2.out" });
      gsap.to(seedc, { opacity: i === 0 ? 1 : 0, scale: i === 0 ? 1 : .4, transformOrigin: "50% 50%", duration: .5 });
      leaves.forEach(function (lf, k) {
        var on = i >= 2 && k < (i >= 3 ? 3 : 1);
        gsap.to(lf, { opacity: on ? 1 : 0, scale: on ? 1 : 0, duration: .6, ease: "pop", delay: on ? .2 + k * .12 : 0 });
      });
      gsap.to(bud, { opacity: i === 3 ? 1 : 0, scale: i === 3 ? 1 : 0, duration: .6, ease: "pop", delay: i === 3 ? .35 : 0 });
      clearTimeout(burstTimer);
      if (i === 4) {
        gsap.fromTo(bloom, { opacity: 0, scale: .2, rotate: -10, transformOrigin: "50% 100%" }, { opacity: 1, scale: 1, rotate: 0, duration: .9, ease: "pop", delay: .25 });
        burstTimer = setTimeout(function () { petalBurst($("#p4 .plant"), true); }, 520);
      } else gsap.to(bloom, { opacity: 0, scale: .2, duration: .3 });
    }
    return {
      enter: function (tl) {
        heroHide();
        cur = -1;
        tl.from($(".phone", pg), { opacity: 0, y: 70, scale: .95, duration: 1, ease: "soft" }, 0.1);
        tl.from($(".rail", pg), { opacity: 0, y: 30, duration: .7, ease: "soft" }, .4);
        tl.add(function () { setStage(0); }, .55);
      },
      frags: [1, 2, 3, 4].map(function (i) { return function () { setStage(i); }; }),
      fragBack: function (fi) { setStage(fi); },
      leave: function () { clearTimeout(burstTimer); killScene(); }
    };
  });

  /* ----- P5 面① · 花的玩法 ----- */
  defs.push(function (pg) {
    var cards = $$(".card", pg), ask = $(".ask", pg);
    var burstTimer = null;
    return {
      enter: function (tl) {
        tl.from($(".eyebrow", pg), { opacity: 0, x: -30, duration: .7, ease: "soft" }, 0.1);
        tl.set(cards, { opacity: 0, y: 80, scale: 1 });
        tl.set(ask, { opacity: 0 });
        tl.to(cards[0], { opacity: 1, y: 0, duration: .8, ease: "soft" }, .3);
        tl.from($(".jreal", pg), { rotate: 6, y: 40, opacity: 0, duration: .8, ease: "pop" }, "<+0.15");
      },
      frags: [
        function () {
          gsap.to(cards[1], { opacity: 1, y: 0, duration: .7, ease: "soft" });
          gsap.from($$(".pola", pg), { opacity: 0, y: 46, rotate: function (i) { return i ? 14 : -16; }, duration: .8, ease: "pop", stagger: .14 });
        },
        function () {
          gsap.to(cards[2], { opacity: 1, y: 0, duration: .7, ease: "soft" });
          gsap.from($$(".fuse .s, .fuse .op", pg), { opacity: 0, scale: .6, duration: .6, ease: "pop", stagger: .1 });
          gsap.from($(".fuse .big", pg), { opacity: 0, scale: .3, rotate: -12, duration: .9, ease: "pop", delay: .45 });
          clearTimeout(burstTimer);
          burstTimer = setTimeout(function () { petalBurst($(".fuse .big", pg)); }, 900);
        },
        function () {
          gsap.set(ask, { opacity: 1 });
          gsap.to(cards, { opacity: .3, scale: .97, duration: .6, ease: "soft" });
          var s = ensureSplit(ask);
          gsap.from(s.targets, { yPercent: 118, duration: .8, ease: "soft", stagger: .03 });
        }
      ],
      leave: function () { clearTimeout(burstTimer); }
    };
  });

  /* ----- P6 面② · 采种 ----- */
  defs.push(function (pg) {
    var pet = $('[data-el="pet"]', pg), bf = $('[data-el="butterfly"]', pg), seed = $('[data-el="seeddot"]', pg);
    var chaseTl = null, frameTimer = null;
    var frames = ["../world/assets/pet-actions/pet-walk.png", "../world/assets/pet-actions/pet-idle.png"];
    function startChase() {
      stopChase();
      var fi = 0;
      frameTimer = setInterval(function () { fi ^= 1; pet.src = frames[fi]; }, 340);
      chaseTl = gsap.timeline({ repeat: -1, repeatDelay: 1.2 });
      chaseTl.fromTo(pet, { x: -260 }, { x: 2200, duration: 13, ease: "none" }, 0);
      chaseTl.fromTo(pet, { y: 0 }, { y: -14, duration: .42, yoyo: true, repeat: 30, ease: "sine.inOut" }, 0);
      chaseTl.fromTo(bf, { x: -60 }, { x: 2350, duration: 13, ease: "none" }, 0);
      chaseTl.to(bf, { y: "-=46", duration: .8, yoyo: true, repeat: 15, ease: "sine.inOut" }, 0);
      chaseTl.to(bf, { rotate: 10, duration: .5, yoyo: true, repeat: 25, ease: "sine.inOut" }, 0);
      chaseTl.fromTo(seed, { opacity: 0 }, {
        opacity: 1, duration: .01, repeat: 12, repeatDelay: 1,
        onRepeat: function () {
          var bx = gsap.getProperty(bf, "x"), by = gsap.getProperty(bf, "y");
          gsap.fromTo(seed, { x: bx + 30, y: 130 + by, opacity: 1 }, { y: "+=90", opacity: 0, duration: 1.4, ease: "power1.in" });
        }
      }, 1);
    }
    function stopChase() {
      if (chaseTl) { chaseTl.kill(); chaseTl = null; }
      if (frameTimer) { clearInterval(frameTimer); frameTimer = null; }
      gsap.killTweensOf([pet, bf, seed]);
      gsap.set(seed, { opacity: 0 });
    }
    return {
      enter: function (tl) {
        tl.from($(".eyebrow", pg), { opacity: 0, x: -30, duration: .7, ease: "soft" }, 0.1);
        splitIn(tl, $(".q", pg), { at: .3 });
        tl.from($('[data-el="phone6"]', pg), { opacity: 0, y: 60, duration: .9, ease: "soft" }, .5);
        tl.set($(".q2", pg), { opacity: 0 });
        tl.add(startChase, .8);
      },
      frags: [function () {
        var q2 = $(".q2", pg);
        gsap.set(q2, { opacity: 1 });
        var s = ensureSplit(q2);
        gsap.from(s.targets, { yPercent: 118, duration: .8, ease: "soft", stagger: .12 });
      }],
      leave: function () { stopChase(); }
    };
  });

  /* ----- P7 面③ · 校园行动地图（真实地图从种子生长） ----- */
  defs.push(function (pg) {
    var svg = $("#campusSvg"), mk = $("#campusMarkers"), rank = $("#rankPhone");
    var builtMap = false, seedTimers = [], seedDots = [];
    var MARKERS = [
      { x: 56, y: 20, n: "启真湖", f: "flower-2.png" },
      { x: 68, y: 46, n: "大草坪", f: "flower-1.png" },
      { x: 47, y: 64, n: "基础图书馆", f: "flower-3.png" },
      { x: 62, y: 82, n: "紫金港体育馆", f: "flower-7.png" },
      { x: 40, y: 36, n: "月牙楼", f: "flower-8.png" }
    ];
    var RANK = [
      ["1", "启真湖 · 湖边夜谈", "12 朵在开"],
      ["2", "大草坪 · 落日野餐", "9 朵在开"],
      ["3", "基础图书馆 · 自习搭子", "8 朵在开"],
      ["4", "紫金港体育馆 · 羽毛球", "6 朵在开"],
      ["5", "蓝田学园 · 晨跑团", "5 朵在开"]
    ];
    function buildMap() {
      if (builtMap) return; builtMap = true;
      var ns = "http://www.w3.org/2000/svg";
      var M = window.PitchMap, L = M.layers;
      function grp(cls) { var g = document.createElementNS(ns, "g"); g.setAttribute("class", cls); svg.appendChild(g); return g; }
      function add(g, d, cls) { var p = document.createElementNS(ns, "path"); p.setAttribute("d", d); if (cls) p.setAttribute("class", cls); g.appendChild(p); return p; }
      var gGreen = grp("gl"), gWater = grp("gl"), gRoad = grp("gl"), gPath = grp("gl"), gRiver = grp("gl"), gBld = grp("gl");
      var green = L.green.map(function (d) { return add(gGreen, d, "l-green"); });
      var water = L.water.map(function (d) { return add(gWater, d, "l-water"); });
      var roads = L.roads.map(function (r) { return add(gRoad, r.d, "l-road" + (r.m ? " mj" : "")); });
      var paths = L.paths.map(function (d) { return add(gPath, d, "l-path"); });
      var rivers = L.rivers.map(function (d) { return add(gRiver, d, "l-river"); });
      var blds = L.buildings.map(function (d) { return add(gBld, d, "l-bld"); });
      // 中心种子光点
      var seedC = document.createElementNS(ns, "circle");
      seedC.setAttribute("cx", 380); seedC.setAttribute("cy", 530); seedC.setAttribute("r", 7);
      seedC.setAttribute("fill", "#c8871e"); svg.appendChild(seedC);
      // 生长编排：面 → 路网描边 → 楼宇波前
      var tl = gsap.timeline();
      tl.fromTo(seedC, { opacity: 0, scale: 0, transformOrigin: "center" }, { opacity: 1, scale: 1, duration: .5, ease: "pop" }, 0);
      tl.to(seedC, { opacity: 0, scale: 3.5, duration: 1.2, ease: "power1.out" }, .5);
      tl.from(green, { opacity: 0, duration: .8, stagger: .02, ease: "soft" }, .25);
      tl.from(water, { opacity: 0, scale: .85, transformOrigin: "center", duration: .9, stagger: .03, ease: "soft" }, .35);
      tl.fromTo(roads, { drawSVG: "0%" }, { drawSVG: "100%", duration: .7, stagger: .012, ease: "power1.inOut" }, .5);
      tl.fromTo(rivers, { drawSVG: "0%" }, { drawSVG: "100%", duration: .8, stagger: .02 }, .8);
      tl.fromTo(paths, { drawSVG: "0%" }, { drawSVG: "100%", duration: .5, stagger: .006, ease: "none" }, 1.0);
      tl.from(blds, { opacity: 0, scale: .5, transformOrigin: "center", duration: .45, stagger: .008, ease: "pop" }, 1.2);
      // 地点花标
      MARKERS.forEach(function (m, i) {
        var d = document.createElement("div"); d.className = "marker";
        d.style.left = m.x + "%"; d.style.top = m.y + "%";
        d.innerHTML = '<span class="lab">' + m.n + '</span><span class="ping"></span><img src="../world/assets/' + m.f + '" alt=""/>';
        mk.appendChild(d);
        tl.from(d, { opacity: 0, scale: .5, duration: .6, ease: "pop" }, 2.1 + i * .14);
        gsap.to($(".ping", d), { scale: 2.6, opacity: 0, duration: 2.2, repeat: -1, delay: i * .4, ease: "power1.out", transformOrigin: "50% 50%" });
      });
    }
    function startSeeds() {
      stopSeeds();
      for (var s = 0; s < 6; s++) (function (s) {
        var dot = seedDots[s];
        if (!dot) { dot = document.createElement("span"); dot.className = "seedfly"; mk.appendChild(dot); seedDots[s] = dot; }
        function fly() {
          var a = MARKERS[s % MARKERS.length], b = MARKERS[(s + 2) % MARKERS.length];
          gsap.fromTo(dot, { left: a.x + "%", top: a.y + "%", opacity: 0 }, {
            opacity: 1, duration: .3, onComplete: function () {
              gsap.to(dot, { left: b.x + "%", top: (Math.min(a.y, b.y) - 8) + "%", duration: 1.6, ease: "power1.out" });
              gsap.to(dot, { left: b.x + "%", top: b.y + "%", duration: 1.5, delay: 1.5, ease: "power1.in", opacity: 0 });
            }
          });
        }
        fly(); seedTimers.push(setInterval(fly, 5200 + s * 700));
      })(s);
    }
    function stopSeeds() {
      seedTimers.forEach(clearInterval); seedTimers = [];
      seedDots.forEach(function (d) { gsap.killTweensOf(d); gsap.set(d, { opacity: 0 }); });
    }
    return {
      enter: function (tl) {
        heroHide();
        tl.set(rank, { opacity: 0 });
        tl.from($(".eyebrow", pg), { opacity: 0, x: -30, duration: .7, ease: "soft" }, 0.1);
        tl.add(buildMap, .15);
        tl.add(startSeeds, 2.4);
        splitIn(tl, $(".h-big", pg), { at: .5, stagger: .03 });
        tl.set($(".call", pg), { opacity: 0 });
      },
      frags: [function () {   // 排行榜浮入 + 扣题句
        var rows = $("#rankRows");
        if (!rows.children.length) {
          RANK.forEach(function (r) {
            rows.insertAdjacentHTML("beforeend",
              '<div class="rrow"><span class="rno">' + r[0] + '</span><span class="rname">' + r[1] + "</span><span class=\"rheat\">" + r[2] + "</span></div>");
          });
        }
        gsap.to(rank, { opacity: 1, duration: .6, ease: "soft" });
        gsap.from(rank, { x: 90, duration: .8, ease: "soft" });
        gsap.fromTo($$(".rrow", rows), { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: .5, ease: "soft", stagger: .1, delay: .3 });
        var c = $(".call", pg); gsap.set(c, { opacity: 1 });
        var s = ensureSplit(c);
        gsap.from(s.targets, { yPercent: 118, duration: .8, ease: "soft", stagger: .12, delay: .2 });
      }],
      leave: function () { stopSeeds(); }
    };
  });

  /* ----- P8 升华 ----- */
  defs.push(function (pg) {
    return {
      enter: function (tl) {
        $$(".r", pg).forEach(function (el, i) { splitIn(tl, el, { at: .25 + i * .5 }); });
        splitIn(tl, $(".h-giant", pg), { at: ">-0.1", stagger: .1, dur: 1 });
        tl.add(function () { heroTo("finale", { dur: 1.2 }); }, .3);
        tl.from($(".slog", pg), { opacity: 0, y: 20, duration: .8, ease: "soft" }, ">-0.2");
        tl.add(function () { petalRain(true); }, ">");
      },
      frags: [],
      leave: function () { petalRain(false); }
    };
  });

  /* ============================================================
     导航引擎（专家加固版）
     ============================================================ */
  var built = pages.map(function (pg, i) { return defs[i](pg); });
  var cur = -1, frag = 0, busy = false, lastAdv = 0, unlockTimer = null;
  var dots = $("#dots");
  pages.forEach(function (_, i) {
    var b = document.createElement("button");
    b.setAttribute("aria-label", "第" + (i + 1) + "页");
    b.addEventListener("click", function (e) { e.stopPropagation(); go(i); });
    dots.appendChild(b);
  });
  $("#cAll").textContent = N;

  function veilSweep(dir) {
    if (reduced) return;
    var v = $("#veil"), b = $("#veil .band");
    gsap.fromTo(v, { opacity: 0 }, { opacity: 1, duration: .18, yoyo: true, repeat: 1, repeatDelay: .18 });
    gsap.fromTo(b, { yPercent: dir >= 0 ? -150 : 150 }, { yPercent: dir >= 0 ? 150 : -150, duration: .62, ease: "power2.inOut" });
  }

  function go(i, instant, force) {
    i = Math.max(0, Math.min(N - 1, i));
    if ((i === cur && !force) || busy) return;
    busy = true;
    var dir = i > cur ? 1 : -1, prev = cur;
    if (prev >= 0) {
      if (built[prev]._tl) { built[prev]._tl.progress(1, true).kill(); built[prev]._tl = null; }
      built[prev].leave();
    }
    if (!instant && prev >= 0) veilSweep(dir);
    cur = i; frag = 0;
    location.hash = "p" + (i + 1);
    $("#cNow").textContent = ("0" + (i + 1)).slice(-2);
    $$("button", dots).forEach(function (d, k) { d.classList.toggle("on", k === i); });
    renderNote(i);
    camera(i);
    var show = function () {
      if (prev >= 0 && prev !== i) pages[prev].classList.remove("on");
      pages[i].classList.add("on");
      var tl = gsap.timeline({ onComplete: function () { busy = false; } });
      built[i]._tl = tl;
      tl.fromTo(pages[i], { opacity: 0 }, { opacity: 1, duration: .45, ease: "soft" }, 0);
      built[i].enter(tl);
      tl.add(function () { busy = false; }, 0.8);
      clearTimeout(unlockTimer);
      unlockTimer = setTimeout(function () { busy = false; }, 2500);
    };
    if (!instant && prev >= 0) setTimeout(show, 230); else show();
  }

  function next() {
    var now = Date.now();
    if (busy || now - lastAdv < 200) return;
    lastAdv = now;
    var d = built[cur];
    if (d.frags && frag < d.frags.length) { d.frags[frag](); frag++; return; }
    if (cur < N - 1) go(cur + 1);
  }
  function prev() {
    var now = Date.now();
    if (busy || now - lastAdv < 200) return;
    lastAdv = now;
    var d = built[cur];
    if (d.frags && frag > 0) {
      frag--;
      if (d.fragBack) d.fragBack(frag);
      else go(cur, true, true);   // 重放本页（force）
      return;
    }
    if (cur > 0) go(cur - 1);
  }

  document.addEventListener("keydown", function (e) {
    if (e.repeat) return;
    // 统一推进：↓ → 空格 回车 PgDn 全部 = 下一拍（阶段或翻页），讲的时候只用一个键
    if (e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === " " || e.key === "PageDown" || e.key === "Enter") { e.preventDefault(); next(); }
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "PageUp" || e.key === "Backspace") { e.preventDefault(); prev(); }
    else if (e.key === "Home") { e.preventDefault(); go(0); }
    else if (e.key === "End") { e.preventDefault(); go(N - 1); }
    else if (e.key === "n" || e.key === "N") toggleNotes();
    else if (e.key === "f" || e.key === "F") { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(function () { }); }
    else if (/^[1-8]$/.test(e.key)) go(+e.key - 1);
  });
  document.addEventListener("click", function (e) {
    if (e.target.closest("button,#notes,.rn,a")) return;
    next();
  });

  var hintGone = false;
  ["keydown", "click"].forEach(function (ev) {
    addEventListener(ev, function () { if (!hintGone) { hintGone = true; setTimeout(function () { gsap.to("#hint", { opacity: 0, duration: .6 }); }, 2500); } }, { once: true });
  });

  /* ---------- 讲稿 ---------- */
  var notesOpen = false;
  function renderNote(i) {
    $("#notes").innerHTML = '<span class="tag">讲稿 ' + ("0" + (i + 1)).slice(-2) + "</span>" + (pages[i].getAttribute("data-note") || "");
  }
  function toggleNotes() { notesOpen = !notesOpen; $("#notes").classList.toggle("show", notesOpen); }

  /* ---------- 预加载 → 启动 ---------- */
  var boot = $("#boot");
  var preload = ["../world/assets/garden-world-v2.png", "../world/assets/flower-5.png", "../world/assets/flower-4.png", "assets/journal-real.webp"];
  Promise.all([
    document.fonts ? document.fonts.ready : Promise.resolve(),
    Promise.all(preload.map(function (src) {
      return new Promise(function (res) { var im = new Image(); im.onload = im.onerror = res; im.src = src; });
    }))
  ]).then(function () {
    setTimeout(function () {
      boot.style.opacity = 0;
      setTimeout(function () { boot.remove(); }, 520);
      var h = (location.hash.match(/^#p(\d+)$/) || [])[1];
      go(h ? +h - 1 : 0, true);
    }, 250);
  });
})();
