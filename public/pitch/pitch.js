/* ============================================================
   花托邦 路演引擎 · GSAP 电影级编排
   固定 1920×1080 舞台 / 键盘逐拍推进 / 常驻主角跨页 FLIP
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

  /* ---------- 舞台 letterbox 缩放（确定性居中，任何窗口/侧栏都不偏） ---------- */
  function fit() {
    var vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    var s = Math.min(vw / 1920, vh / 1080);
    gsap.set(stage, { x: (vw - 1920 * s) / 2, y: (vh - 1080 * s) / 2, scale: s, transformOrigin: "0 0" });
  }
  addEventListener("resize", fit); fit();

  /* ---------- 氛围粒子（萤火 + 花瓣，固定 1920×1080 无需 resize） ---------- */
  (function ambient() {
    var cv = $("#ambient"); if (!cv || reduced) return;
    var ctx = cv.getContext("2d"), W = 1920, H = 1080, ps = [];
    var petalCol = ["239,143,176", "242,148,106", "187,156,226", "174,233,180", "139,208,216"];
    for (var i = 0; i < 42; i++) ps.push(fire());
    for (var j = 0; j < 22; j++) ps.push(petal());
    function fire() { return { t: 0, x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2 + 0.8, vx: (Math.random() - .5) * .22, vy: (Math.random() - .5) * .22, p: Math.random() * 6.28, ps: .008 + Math.random() * .02, hue: Math.random() < .72 ? "243,197,99" : "126,208,138" }; }
    function petal() { return { t: 1, x: Math.random() * W, y: Math.random() * H, s: Math.random() * 8 + 6, vy: Math.random() * .5 + .26, vx: (Math.random() - .5) * .4, rot: Math.random() * 6.28, vr: (Math.random() - .5) * .03, sway: Math.random() * 6.28, sw: .01 + Math.random() * .02, a: Math.random() * .3 + .22, col: petalCol[(Math.random() * petalCol.length) | 0] }; }
    (function tick() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < ps.length; i++) {
        var f = ps[i];
        if (f.t === 0) {
          f.x += f.vx; f.y += f.vy; f.p += f.ps;
          if (f.x < 0) f.x = W; if (f.x > W) f.x = 0; if (f.y < 0) f.y = H; if (f.y > H) f.y = 0;
          var a = (Math.sin(f.p) * .5 + .5) * .7 + .05;
          var g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 6);
          g.addColorStop(0, "rgba(" + f.hue + "," + a + ")"); g.addColorStop(1, "rgba(" + f.hue + ",0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 6, 0, 6.28); ctx.fill();
          ctx.fillStyle = "rgba(" + f.hue + "," + a * .9 + ")"; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.28); ctx.fill();
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

  /* ---------- SplitText 预切（mask 行 / 逐字） ---------- */
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
      stagger: opts.stagger != null ? opts.stagger : (el.getAttribute("data-split") === "chars" ? 0.035 : 0.14),
      rotate: opts.rotate || 0
    }, opts.at != null ? opts.at : ">-0.55");
    return tl;
  }

  /* ---------- Rough 工具 ---------- */
  function roughUnderline(svg, w, color) {
    svg.innerHTML = ""; svg.setAttribute("viewBox", "0 0 " + w + " 22");
    var rs = rough.svg(svg);
    svg.appendChild(rs.line(4, 12, w - 4, 9, { stroke: color || "#f3c563", strokeWidth: 3, roughness: 2, bowing: 2.6 }));
    svg.appendChild(rs.line(8, 17, w - 10, 15, { stroke: "rgba(243,197,99,.45)", strokeWidth: 1.6, roughness: 2.4 }));
    return $$("path", svg);
  }
  function drawIn(tl, paths, at, dur) {
    paths.forEach(function (p, i) {
      tl.fromTo(p, { drawSVG: "0%" }, { drawSVG: "100%", duration: dur || 0.7, ease: "power2.out" }, (at != null ? at : ">") + (i ? "-=0.45" : ""));
    });
  }

  /* ---------- 常驻主角 FLIP ---------- */
  var hero = $("#hero");
  function heroTo(anchorName, opts) {
    var a = $('[data-anchor="' + anchorName + '"]'); if (!a) return;
    opts = opts || {};
    var st = Flip.getState(hero);
    var r = a.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    var sc = sr.width / 1920;
    gsap.set(hero, {
      x: (r.left - sr.left) / sc, y: (r.top - sr.top) / sc,
      width: r.width / sc, opacity: opts.opacity != null ? opts.opacity : 1
    });
    Flip.from(st, { duration: opts.dur || 1.1, ease: "soft", scale: false });
  }
  function heroHide(d) { gsap.to(hero, { opacity: 0, duration: d || 0.4, ease: "soft" }); }

  /* ---------- 花瓣 confetti（慢落花瓣，不是彩炮） ---------- */
  var petalShape = null;
  try { petalShape = confetti.shapeFromPath({ path: "M0 6 C0 2 4 0 6 3 C8 0 12 2 12 6 C12 10 6 14 6 14 C6 14 0 10 0 6 Z" }); } catch (e) { }
  function petalBurst(el, big) {
    if (reduced) return;
    var r = el ? el.getBoundingClientRect() : null;
    var o = r ? { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight } : { x: .5, y: .45 };
    var base = { spread: 75, startVelocity: 22, gravity: 0.5, drift: 0.8, decay: 0.94, scalar: 1.5, ticks: 380, origin: o, colors: ["#ef8fb0", "#f2946a", "#f3c563", "#bb9ce2", "#aee9b4", "#8bd0d8"] };
    if (petalShape) base.shapes = [petalShape];
    confetti(Object.assign({ particleCount: big ? 46 : 26 }, base));
    setTimeout(function () { confetti(Object.assign({ particleCount: big ? 26 : 14, startVelocity: 14, spread: 110 }, base)); }, 260);
  }
  var rainTimer = null;
  function petalRain(on) {
    if (rainTimer) { clearInterval(rainTimer); rainTimer = null; }
    if (!on || reduced) return;
    rainTimer = setInterval(function () {
      var b = { particleCount: 2, spread: 40, startVelocity: 8, gravity: 0.45, drift: 0.6, decay: 0.96, scalar: 1.4, ticks: 420, origin: { x: Math.random(), y: -0.05 }, colors: ["#ef8fb0", "#f3c563", "#bb9ce2", "#aee9b4"] };
      if (petalShape) b.shapes = [petalShape];
      confetti(b);
    }, 240);
  }

  /* ---------- Ken Burns 机位表 ---------- */
  var KB = [
    { s: 1.18, x: -40, y: -60, op: .68 },   // p1 封面：缓推
    { s: 1.05, x: 0, y: 0, op: .5 },
    { s: 1.1, x: 30, y: -20, op: .55 },
    { s: 1.06, x: 0, y: 10, op: .5 },
    { s: 1.06, x: 0, y: 10, op: .5 },
    { s: 1.12, x: -30, y: 30, op: .55 },
    { s: 1.04, x: 0, y: 0, op: .32 },
    { s: 1.2, x: 20, y: -40, op: .5 }
  ];
  var GRADE = ["#0b3b2a", "#123028", "#144032", "#12352a", "#173a2c", "#1c3a40", "#14332b", "#3a2a14"];
  function camera(i) {
    var k = KB[i] || KB[1];
    gsap.to("#kb", { scale: k.s, x: k.x, y: k.y, duration: 2.4, ease: "power1.out" });
    gsap.to("#kb", { opacity: k.op != null ? k.op : .6, duration: 1.2, ease: "soft" });
    gsap.to("#grade", { backgroundColor: GRADE[i] || GRADE[1], duration: 1.4, ease: "soft" });
  }

  /* ============================================================
     各页时间线
     每页：build() -> { enter(tl), frags:[fn], leave() }
     ============================================================ */
  var defs = [];

  /* ----- P1 封面 ----- */
  defs.push(function (pg) {
    return {
      enter: function (tl) {
        tl.set(hero, { opacity: 0 });
        tl.add(function () { heroTo("cover", { dur: 0.01 }); gsap.fromTo(hero, { y: "-=140", opacity: 0, scale: .5 }, { y: "+=140", opacity: 1, scale: 1, duration: 1.2, ease: "soft" }); }, 0.1);
        $$(".ring", pg).forEach(function (r, i) {
          tl.fromTo(r, { opacity: 0, scale: .4 }, { opacity: .5, scale: 1, duration: 1, ease: "soft" }, .3 + i * .18);
          gsap.to(r, { opacity: .12, scale: 1.24, duration: 2.6, delay: 1.4 + i * .5, repeat: -1, yoyo: true, ease: "sine.inOut" });
        });
        splitIn(tl, $(".h-giant", pg), { at: 0.55, stagger: 0.12, dur: 1.1 });
        splitIn(tl, $(".subline", pg), { at: ">-0.4" });
        tl.from($$('[data-el="fade"]', pg), { opacity: 0, y: 24, duration: .8, ease: "soft", stagger: .15 }, ">-0.3");
      },
      frags: [],
      leave: function () { }
    };
  });

  /* ----- P2 痛点 ----- */
  defs.push(function (pg) {
    var bridgeSvg = $('[data-el="bridgesvg"]', pg);
    return {
      enter: function (tl) {
        heroHide();
        tl.from($(".eyebrow", pg), { opacity: 0, x: -30, duration: .7, ease: "soft" }, 0.1);
        splitIn(tl, $(".h-big", pg), { at: .25, stagger: .03, dur: 1 });
        splitIn(tl, $(".state", pg), { at: ">-0.3" });
        // 手绘断桥
        tl.add(function () {
          bridgeSvg.innerHTML = "";
          var rs = rough.svg(bridgeSvg);
          bridgeSvg.setAttribute("viewBox", "0 0 1660 190");
          var l1 = rs.line(360, 95, 760, 95, { stroke: "#8bd0d8", strokeWidth: 3.5, roughness: 2.2 });
          var l2 = rs.line(900, 95, 1300, 95, { stroke: "#aee9b4", strokeWidth: 3.5, roughness: 2.2 });
          var x1 = rs.line(806, 72, 856, 118, { stroke: "#e5876b", strokeWidth: 5, roughness: 1.6 });
          var x2 = rs.line(856, 72, 806, 118, { stroke: "#e5876b", strokeWidth: 5, roughness: 1.6 });
          [l1, l2, x1, x2].forEach(function (n) { bridgeSvg.appendChild(n); });
          var paths = $$("path", bridgeSvg);
          gsap.fromTo(paths, { drawSVG: "0%" }, { drawSVG: "100%", duration: .8, ease: "power2.out", stagger: .22 });
        }, ">-0.1");
        tl.from($$(".bridge .node", pg), { opacity: 0, scale: .85, duration: .7, ease: "pop", stagger: .18 }, "<");
        tl.from($(".gapword", pg), { opacity: 0, y: -14, duration: .6 }, ">-0.2");
      },
      frags: [], leave: function () { }
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

  /* ----- P4 核心链路 ----- */
  defs.push(function (pg) {
    var tpl = $$("div", $("#stages").content), rail = $("#rail");
    var shot = $("#phoneShot"), leaves = $$("[data-leaf]", pg);
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
      $("#stgNo").textContent = "核心链路 · Stage " + (i + 1) + " / 5";
      var nm = $("#stgName"), en = $("#stgEn"), ds = $("#stgDesc"), ch = $("#stgChip");
      gsap.fromTo([nm, en, ds], { opacity: .1, y: 14 }, { opacity: 1, y: 0, duration: .55, ease: "soft", stagger: .05 });
      nm.textContent = t.dataset.cn; en.textContent = t.dataset.en; ds.innerHTML = t.dataset.desc;
      ch.innerHTML = t.dataset.chip ? '<span class="chip' + (t.dataset.warn ? " warn" : "") + '"><span class="tag">' + (t.dataset.chiptag || "") + "</span>" + t.dataset.chip + "</span>" : "";
      if (t.dataset.chip) gsap.from($(".chip", ch), { opacity: 0, scale: .9, duration: .5, ease: "pop", delay: .2 });
      // 手机截图切换
      gsap.to(shot, {
        opacity: 0, duration: .22, ease: "power1.in", onComplete: function () {
          shot.src = t.dataset.shot; shot.style.objectPosition = t.dataset.pos || "center top";
          gsap.to(shot, { opacity: 1, duration: .45, ease: "soft" });
        }
      });
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
      if (i === 4) {
        gsap.fromTo(bloom, { opacity: 0, scale: .2, rotate: -10, transformOrigin: "50% 100%" }, { opacity: 1, scale: 1, rotate: 0, duration: .9, ease: "pop", delay: .25 });
        setTimeout(function () { petalBurst($("#p4 .plant"), true); }, 520);
      } else gsap.to(bloom, { opacity: 0, scale: .2, duration: .3 });
    }
    return {
      enter: function (tl) {
        heroHide();
        cur = -1;
        tl.from($(".phone", pg), { opacity: 0, y: 70, scale: .95, duration: 1, ease: "soft" }, 0.1);
        tl.from($(".rail", pg), { opacity: 0, y: 30, duration: .7, ease: "soft" }, .4);
        tl.add(function () {
          var ph = $(".phone", pg), f = $('[data-el="phoneframe"]', pg); f.innerHTML = "";
          var w = ph.offsetWidth + 44, h = ph.offsetHeight + 44;
          f.setAttribute("viewBox", "0 0 " + w + " " + h);
          var rs = rough.svg(f);
          f.appendChild(rs.rectangle(10, 10, w - 20, h - 20, { stroke: "rgba(243,197,99,.6)", strokeWidth: 2.6, roughness: 2.4, bowing: 1.6 }));
          gsap.fromTo($$("path", f), { drawSVG: "0%" }, { drawSVG: "100%", duration: 1.1, ease: "power2.out" });
        }, .5);
        tl.add(function () { setStage(0); }, .55);
      },
      frags: [1, 2, 3, 4].map(function (i) { return function () { setStage(i); }; }),
      fragBack: function (fi) { setStage(fi); },
      leave: function () { }
    };
  });

  /* ----- P5 花的玩法 ----- */
  defs.push(function (pg) {
    var cards = $$(".card", pg), ask = $(".ask", pg);
    return {
      enter: function (tl) {
        tl.from($(".eyebrow", pg), { opacity: 0, x: -30, duration: .7, ease: "soft" }, 0.1);
        tl.set(cards, { opacity: 0, y: 80 });
        tl.set(ask, { opacity: 0 });
        tl.to(cards[0], { opacity: 1, y: 0, duration: .8, ease: "soft" }, .3);
        tl.from($(".journal", pg), { rotate: 8, y: 40, opacity: 0, duration: .8, ease: "pop" }, "<+0.15");
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
          setTimeout(function () { petalBurst($(".fuse .big", pg)); }, 900);
        },
        function () {
          gsap.set(ask, { opacity: 1 });
          gsap.to(cards, { opacity: .28, scale: .97, duration: .6, ease: "soft" });
          var s = ensureSplit(ask);
          gsap.from(s.targets, { yPercent: 118, duration: .8, ease: "soft", stagger: .03 });
        }
      ],
      leave: function () { }
    };
  });

  /* ----- P6 采种 ----- */
  defs.push(function (pg) {
    var pet = $('[data-el="pet"]', pg), bf = $('[data-el="butterfly"]', pg), seed = $('[data-el="seeddot"]', pg);
    var chaseTl = null, frameTimer = null;
    function startChase() {
      stopChase();
      var frames = ["pet-walk.png", "pet-idle.png"];
      var fi = 0;
      frameTimer = setInterval(function () { fi ^= 1; pet.src = "../world/assets/pet-actions/" + frames[fi]; }, 340);
      chaseTl = gsap.timeline({ repeat: -1, repeatDelay: 1.2 });
      chaseTl.fromTo(pet, { x: -260 }, { x: 2200, duration: 13, ease: "none" }, 0);
      chaseTl.fromTo(pet, { y: 0 }, { y: -14, duration: .42, yoyo: true, repeat: 30, ease: "sine.inOut" }, 0);
      chaseTl.fromTo(bf, { x: -60 }, { x: 2350, duration: 13, ease: "none" }, 0);
      chaseTl.to(bf, { y: "-=46", duration: .8, yoyo: true, repeat: 15, ease: "sine.inOut" }, 0);
      chaseTl.to(bf, { rotate: 10, duration: .5, yoyo: true, repeat: 25, ease: "sine.inOut" }, 0);
      // 蝴蝶身后掉落的种子光点
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

  /* ----- P7 校园 ----- */
  defs.push(function (pg) {
    var svg = $("#campusSvg"), mk = $("#campusMarkers"), built = false, seedTimers = [];
    var MARKERS = [
      { x: 30, y: 18, n: "图书馆", f: "flower-3.png" }, { x: 52, y: 13, n: "宿舍区", f: "flower-1.png" },
      { x: 72, y: 24, n: "食堂", f: "flower-6.png" }, { x: 86, y: 46, n: "启真湖", f: "flower-2.png" },
      { x: 66, y: 78, n: "操场", f: "flower-7.png" }, { x: 79, y: 62, n: "情人坡", f: "flower-8.png" }
    ];
    function build() {
      if (built) return; built = true;
      var ns = "http://www.w3.org/2000/svg";
      function el(t, at) { var e = document.createElementNS(ns, t); for (var k in at) e.setAttribute(k, at[k]); return e; }
      [[290, 300, 210], [1000, 260, 160], [580, 800, 240], [1610, 700, 190]].forEach(function (p) { svg.appendChild(el("circle", { cx: p[0], cy: p[1], r: p[2], fill: "rgba(70,130,84,.13)" })); });
      ["M110,210 C500,280 800,210 1230,350 S1770,520 1890,460", "M230,940 C580,820 880,900 1190,750 S1650,630 1890,730", "M340,140 C420,460 580,740 690,1040"].forEach(function (d) {
        svg.appendChild(el("path", { d: d, fill: "none", stroke: "rgba(170,200,175,.13)", "stroke-width": 26, "stroke-linecap": "round" }));
        svg.appendChild(el("path", { d: d, fill: "none", stroke: "rgba(243,197,99,.18)", "stroke-width": 3, "stroke-dasharray": "3 20", "stroke-linecap": "round" }));
      });
      svg.appendChild(el("ellipse", { cx: 1530, cy: 520, rx: 260, ry: 165, fill: "rgba(90,155,180,.15)", stroke: "rgba(139,208,216,.3)", "stroke-width": 2 }));
      [[230, 640, 160, 120], [900, 190, 210, 110], [1080, 640, 150, 130], [560, 210, 140, 105], [1230, 830, 170, 105]].forEach(function (b) {
        svg.appendChild(el("rect", { x: b[0], y: b[1], width: b[2], height: b[3], rx: 14, fill: "rgba(30,62,45,.55)", stroke: "rgba(170,200,175,.2)", "stroke-width": 2 }));
      });
      MARKERS.forEach(function (m, i) {
        var d = document.createElement("div"); d.className = "marker";
        d.style.left = m.x + "%"; d.style.top = m.y + "%";
        d.innerHTML = '<span class="lab">' + m.n + '</span><span class="ping"></span><img src="../world/assets/' + m.f + '" alt=""/>';
        mk.appendChild(d);
        gsap.from(d, { opacity: 0, scale: .5, duration: .7, ease: "pop", delay: .3 + i * .13 });
        gsap.to($(".ping", d), { scale: 2.6, opacity: 0, duration: 2.2, repeat: -1, delay: i * .4, ease: "power1.out", transformOrigin: "50% 50%" });
      });
      // 飞行种子
      for (var s = 0; s < 6; s++) (function (s) {
        var dot = document.createElement("span"); dot.className = "seedfly"; mk.appendChild(dot);
        function fly() {
          var a = MARKERS[s % MARKERS.length], b = MARKERS[(s + 2) % MARKERS.length];
          gsap.fromTo(dot, { left: a.x + "%", top: a.y + "%", opacity: 0 }, {
            opacity: 1, duration: .3, onComplete: function () {
              gsap.to(dot, { left: b.x + "%", top: (Math.min(a.y, b.y) - 9) + "%", duration: 1.6, ease: "power1.out" });
              gsap.to(dot, { left: b.x + "%", top: b.y + "%", duration: 1.5, delay: 1.5, ease: "power1.in", opacity: 0 });
            }
          });
        }
        fly(); seedTimers.push(setInterval(fly, 5200 + s * 700));
      })(s);
    }
    return {
      enter: function (tl) {
        tl.from($(".eyebrow", pg), { opacity: 0, x: -30, duration: .7, ease: "soft" }, 0.1);
        tl.add(build, .15);
        splitIn(tl, $(".h-big", pg), { at: .35, stagger: .03 });
        tl.from($$(".mchip", pg), { opacity: 0, y: 20, duration: .6, ease: "soft", stagger: .12 }, ">-0.2");
        tl.set($(".call", pg), { opacity: 0 });
      },
      frags: [function () {
        var c = $(".call", pg); gsap.set(c, { opacity: 1 });
        var s = ensureSplit(c);
        gsap.from(s.targets, { yPercent: 118, duration: .8, ease: "soft", stagger: .12 });
      }],
      leave: function () { seedTimers.forEach(clearInterval); seedTimers = []; }
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
     导航引擎
     ============================================================ */
  var built = pages.map(function (pg, i) { return defs[i](pg); });
  var cur = -1, frag = 0, busy = false;
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

  function go(i, instant) {
    i = Math.max(0, Math.min(N - 1, i));
    if (i === cur || busy) return;
    busy = true;
    var dir = i > cur ? 1 : -1, prev = cur;
    if (prev >= 0) { built[prev].leave(); }
    if (!instant && prev >= 0) veilSweep(dir);
    cur = i; frag = 0;
    location.hash = "p" + (i + 1);
    $("#cNow").textContent = ("0" + (i + 1)).slice(-2);
    $$("button", dots).forEach(function (d, k) { d.classList.toggle("on", k === i); });
    renderNote(i);
    camera(i);
    var show = function () {
      if (prev >= 0) pages[prev].classList.remove("on");
      pages[i].classList.add("on");
      var tl = gsap.timeline({ onComplete: function () { busy = false; } });
      // 页整体入场基础位移
      tl.fromTo(pages[i], { opacity: 0 }, { opacity: 1, duration: .45, ease: "soft" }, 0);
      built[i].enter(tl);
      // 入场 0.8s 后即可继续推进（长尾动画并行），并兜底解锁
      tl.add(function () { busy = false; }, 0.8);
      setTimeout(function () { busy = false; }, 2500);
    };
    if (!instant && prev >= 0) setTimeout(show, 230); else show();
  }

  function next() {
    if (busy) return;
    var d = built[cur];
    if (d.frags && frag < d.frags.length) { d.frags[frag](); frag++; return; }
    if (cur < N - 1) go(cur + 1);
  }
  function prev() {
    if (busy) return;
    var d = built[cur];
    if (d.frags && frag > 0) {
      frag--;
      if (d.fragBack) d.fragBack(frag); // p4 阶段回退
      else go(cur, true); // 简化：重放本页
      return;
    }
    if (cur > 0) go(cur - 1);
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown" || e.key === "Enter") { e.preventDefault(); next(); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp" || e.key === "Backspace") { e.preventDefault(); prev(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); if (cur < N - 1) go(cur + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (cur > 0) go(cur - 1); }
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

  // hint 自动隐藏
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
  var preload = ["../world/assets/garden-world-v2.png", "assets/ss-clarify.webp", "../world/assets/flower-5.png", "../world/assets/flower-4.png"];
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
