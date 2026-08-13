// 构建脚本：把浙大紫金港 OSM 原始数据（scripts/data/zjg-osm.json.gz）
// 投影/分层/简化后生成 public/world/campus-map.js（window.CampusMap 数据层）。
//
// 数据来源：OpenStreetMap，Overpass API 一次性导出（bbox 30.295,120.075,30.315,120.095）。
// 页面展示时须标注 © OpenStreetMap contributors (ODbL)。
//
// 用法：node scripts/build-campus-map.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const RAW = JSON.parse(gunzipSync(readFileSync(new URL("./data/zjg-osm.json.gz", import.meta.url))).toString());
// 水体 multipolygon（启真湖等以 relation 存储，way 数据里没有）
const RAW_REL = JSON.parse(gunzipSync(readFileSync(new URL("./data/zjg-osm-rel.json.gz", import.meta.url))).toString());

// 校园核心区裁剪范围（紫金港老校区；东界收在运河内，裁掉校外街区）
const BBOX = { w: 120.0752, e: 120.0898, s: 30.2962, n: 30.3138 };
const COS = Math.cos((30.305 * Math.PI) / 180);
// viewBox：宽 = 经度跨度 * cos(lat)，做等距投影；统一放大到 ~760 宽
const W = 760;
const H = Math.round((W * (BBOX.n - BBOX.s)) / ((BBOX.e - BBOX.w) * COS)); // ≈ 990

const px = lon => ((lon - BBOX.w) / (BBOX.e - BBOX.w)) * W;
const py = lat => ((BBOX.n - lat) / (BBOX.n - BBOX.s)) * H;

const inBox = g => g.some(p => p.lon >= BBOX.w && p.lon <= BBOX.e && p.lat >= BBOX.s && p.lat <= BBOX.n);

// 简化：投影后按最小间距过滤 + 四舍五入到 0.1
function toPoints(geom, minDist = 3) {
  const pts = [];
  for (const p of geom) {
    const x = px(p.lon), y = py(p.lat);
    const last = pts[pts.length - 1];
    if (!last || Math.hypot(x - last[0], y - last[1]) >= minDist) pts.push([x, y]);
  }
  if (pts.length > 1) {
    const first = geom[0], last = geom[geom.length - 1];
    if (first.lon === last.lon && first.lat === last.lat) {
      const lp = pts[pts.length - 1], fp = pts[0];
      if (lp[0] !== fp[0] || lp[1] !== fp[1]) pts.push([fp[0], fp[1]]);
    }
  }
  return pts.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
}

const toPath = (pts, close) => {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) d += `L${pts[i][0]} ${pts[i][1]}`;
  return close ? d + "Z" : d;
};

const area = pts => Math.abs(pts.reduce((sum, p, i) => {
  const q = pts[(i + 1) % pts.length];
  return sum + p[0] * q[1] - q[0] * p[1];
}, 0)) / 2;

const centroid = pts => {
  let x = 0, y = 0;
  for (const p of pts) { x += p[0]; y += p[1]; }
  return [Math.round((x / pts.length) * 10) / 10, Math.round((y / pts.length) * 10) / 10];
};

const layers = { water: [], rivers: [], green: [], pitches: [], roads: [], paths: [], buildings: [] };
const namedBuildings = [];

for (const el of RAW.elements) {
  const t = el.tags || {};
  const g = el.geometry || [];
  if (!g.length || !inBox(g)) continue;
  if (t.tunnel === "yes" || t.covered === "yes" || t.layer === "-1") continue; // 隧道不画（紫金港路隧道从校园地下穿过）

  if (t.natural === "water" || t.water) {
    const pts = toPoints(g, 4);
    if (pts.length > 3) layers.water.push(toPath(pts, true));
  } else if (t.waterway === "river" || t.waterway === "stream" || t.waterway === "canal") {
    const pts = toPoints(g, 5);
    if (pts.length > 1) layers.rivers.push(toPath(pts, false));
  } else if (t.leisure === "pitch" || t.leisure === "track") {
    const pts = toPoints(g, 3);
    if (pts.length > 3 && area(pts) > 60) layers.pitches.push(toPath(pts, true));
  } else if (t.leisure === "park" || t.leisure === "garden" || t.landuse === "grass" || t.landuse === "forest") {
    const pts = toPoints(g, 5);
    if (pts.length > 3 && area(pts) > 300) layers.green.push(toPath(pts, true));
  } else if (t.building) {
    const pts = toPoints(g, 2.5);
    if (pts.length > 3 && area(pts) > 55) {
      layers.buildings.push(toPath(pts, true));
      if (t.name) namedBuildings.push({ name: t.name, c: centroid(pts), a: Math.round(area(pts)) });
    }
  } else if (t.highway) {
    const minor = ["footway", "path", "cycleway", "steps", "pedestrian", "service"].includes(t.highway);
    const major = ["primary", "secondary", "trunk", "motorway", "primary_link", "secondary_link", "trunk_link", "motorway_link"].includes(t.highway);
    const pts = toPoints(g, minor ? 6 : 5);
    if (pts.length < 2) continue;
    if (minor) layers.paths.push(toPath(pts, false));
    else layers.roads.push({ d: toPath(pts, false), major });
  }
}

// 水体 relation：外圈 + 内圈（岛）合成一条 evenodd 复合路径
for (const rel of RAW_REL.elements) {
  const members = (rel.members || []).filter(m => m.geometry && m.geometry.length > 3);
  if (!members.length || !members.some(m => inBox(m.geometry))) continue;
  let d = "";
  for (const m of members) {
    const pts = toPoints(m.geometry, 4);
    if (pts.length > 3) d += toPath(pts, true);
  }
  if (d) layers.water.push(d);
}

// 打卡点位：优先用真实建筑质心锚定
const anchorOf = name => {
  const hit = namedBuildings.filter(b => b.name.includes(name)).sort((m, n) => n.a - m.a)[0];
  return hit ? hit.c : null;
};

const spotAnchors = {
  "qizhen-lake": [px(120.0817), py(30.3026)],      // 启真湖湖面
  "lovers-slope": [px(120.0853), py(30.3071)],      // 大草坪
  "library": anchorOf("基础图书馆"),
  "moon-building": anchorOf("月牙楼"),
  "east-teaching": anchorOf("东3教学楼"),
  "gymnasium": anchorOf("体育馆"),
  "track-field": [px(120.0771), py(30.3074)],       // 紫金港西田径场
  "lantian": anchorOf("蓝田"),
  "north-street": [px(120.0838), py(30.3128)],      // 北街生活区（白沙宿舍北）
};

// 手工挑选的底图楼名标注（小字，克制）
const LABEL_PICKS = ["基础图书馆", "月牙楼", "体育馆", "东1教学楼", "东6东7教学楼", "西2教学楼", "临水报告厅", "小剧场A座", "蒙民伟楼", "紫云2舍", "白沙综合楼", "蓝田", "丹阳2舍", "食堂", "校友活动中心", "农医图书馆"];
const labels = [];
for (const pick of LABEL_PICKS) {
  const b = namedBuildings.filter(x => x.name.includes(pick)).sort((m, n) => n.a - m.a)[0];
  if (b) labels.push({ name: b.name.replace(/浙江大学|紫金港/g, "").replace("蒙民伟楼 / 图书信息C楼", "蒙民伟楼"), x: b.c[0], y: b.c[1] });
}

const out = {
  viewBox: [0, 0, W, H],
  attribution: "地图数据 © OpenStreetMap contributors (ODbL)",
  layers,
  labels,
  spotAnchors,
};

const stats = Object.fromEntries(Object.entries(layers).map(([k, v]) => [k, v.length]));
console.log("layers:", stats);
console.log("labels:", labels.map(l => l.name).join(" / "));
console.log("anchors:", Object.entries(spotAnchors).map(([k, v]) => `${k}:${v ? "ok" : "MISS"}`).join(" "));

writeFileSync(
  new URL("../public/world/campus-map.js", import.meta.url),
  `// 由 scripts/build-campus-map.mjs 生成，请勿手改。\n// 地图数据 © OpenStreetMap contributors (ODbL)\nwindow.CampusMap = ${JSON.stringify(out)};\n`
);
console.log(`written: public/world/campus-map.js (viewBox ${W}x${H})`);
